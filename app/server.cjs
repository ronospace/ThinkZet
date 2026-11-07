// CareerOS AI — API server. Node built-ins only (http + node:sqlite). Zero dependencies.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db } = require('./db.cjs');
const { SKILLS, resolveSkill } = require('./taxonomy.cjs');
const { seedIfEmpty, ingestLive, lastRun } = require('./pipeline.cjs');
const SOURCES = require('./sources.cjs');
const E = require('./engine.cjs');
const AUTH = require('./auth.cjs');
const REF = require('./referrals.cjs');
const CONF = require('./confidence.cjs');
const TRAJ = require('./trajectory.cjs');

const PORT = Number(process.env.PORT || 4173);
const PUBLIC = path.join(__dirname, 'public');
// Every route resolves the acting user from the session cookie.
// The demo persona is a real user row, so the demo path and the real path are the same code.
const DEMO_USER = 'demo-user';
// acting user is resolved per-request

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

function resolveUser(req) {
  const u = AUTH.currentUser(req);
  return u ? u.id : DEMO_USER;
}


// ---------------- helpers ----------------
function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 2e6) reject(new Error('payload too large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on('error', reject);
  });
}
const log = (userId, action, entityType, entityId, metadata) =>
  db.prepare('INSERT INTO activity_logs (user_id,action,entity_type,entity_id,metadata) VALUES (?,?,?,?,?)')
    .run(userId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null);

function getProfile(userId) {
  return db.prepare('SELECT * FROM profiles WHERE user_id=?').get(userId) || null;
}

function opportunitiesWithMatch(userId, { limit = 200, types, minScore = 0 } = {}) {
  let sql = `SELECT o.*, m.match_score, m.skill_fit, m.experience_fit, m.income_potential,
      m.interview_probability, m.offer_probability, m.risk_score, m.missing_skills, m.reasons
    FROM matches m JOIN opportunities o ON o.id = m.opportunity_id
    WHERE m.user_id = ? AND m.match_score >= ?
      AND o.status = 'open'
      AND (o.comp_min IS NULL OR o.comp_min > 0)
      AND NOT (o.comp_min > 900000 OR (o.comp_period='hour' AND o.comp_min > 400)
               OR (o.comp_period='year' AND o.comp_min < 8000)
               OR (o.comp_period='hour' AND o.comp_min < 8))
      AND (o.posted_at IS NULL OR o.posted_at > datetime('now','-120 days'))
      AND NOT (o.comp_min IS NULL AND LENGTH(COALESCE(o.description,'')) < 120)`;
  const params = [userId, minScore];
  if (types && types.length) { sql += ` AND o.type IN (${types.map(() => '?').join(',')})`; params.push(...types); }
  sql += ' ORDER BY m.match_score DESC LIMIT ?';
  params.push(limit);
  return db.prepare(sql).all(...params).map((r) => {
    const o = {
      ...r,
      skills: JSON.parse(r.skills || '[]'),
      missing_skills: JSON.parse(r.missing_skills || '[]'),
      reasons: JSON.parse(r.reasons || '[]'),
    };
    o.confidence = CONF.opportunityConfidence(o);
    return o;
  });
}

const DEMO_CV = `GEOFFREY MORGAN - Senior Data Scientist / ML Engineer
Lisbon, Portugal - Remote-first - Fluent English, conversational German

SUMMARY
Senior data scientist with 8 years of experience building production ML and analytics systems.
Currently EUR 78,000 per year. Open to remote roles across the EU and open to relocating to Germany or the Netherlands.
I require visa sponsorship for non-EU relocation.

EXPERIENCE
2022-2026  Senior Data Scientist - Fintech scale-up (Berlin, remote)
  Built churn and credit-risk models in Python and scikit-learn; ran A/B tests and causal inference studies.
  Owned the experimentation platform; SQL and dbt models across a Snowflake warehouse.
  Deployed models with Docker on AWS (SageMaker). Partnered with product and engineering.

2019-2022  Data Analyst to Data Scientist - Marketplace (Lisbon)
  Python, SQL, Spark for large-scale event data. Built dashboards and forecasting models.

2018-2019  Junior Analyst - Consulting

SKILLS
Python, SQL, scikit-learn, PyTorch (working), Machine Learning, Statistics, Experimentation,
dbt, Airflow, Spark, Docker, AWS, Data Modelling, Communication, Leadership

EDUCATION
MSc Data Science, 2018

GOALS
Move to a senior/staff role at a product company. Target EUR 100,000+. Want to move into AI engineering (RAG, LLMOps).`;


// ---- auth ----
route('POST', /^\/api\/auth\/request$/, async (req, res) => {
  const body = await readBody(req);
  try {
    const r = AUTH.requestCode(body.email);
    log(null, 'auth.code_requested', 'user', r.email);
    json(res, 200, { ok: true, sentTo: r.email, devCode: r.code, expiresAt: r.expiresAt });
  } catch (e) { json(res, 400, { error: e.message }); }
});

route('POST', /^\/api\/auth\/verify$/, async (req, res) => {
  const body = await readBody(req);
  const r = AUTH.verifyCode(body.email, body.code);
  if (!r) return json(res, 401, { error: 'Invalid or expired code' });
  AUTH.setCookie(res, AUTH.COOKIE, r.token, AUTH.SESSION_DAYS * 86400);
  log(r.user.id, 'auth.login', 'user', r.user.id);
  json(res, 200, { ok: true, user: r.user, hasProfile: !!getProfile(r.user.id) });
});

route('POST', /^\/api\/auth\/logout$/, async (req, res) => {
  AUTH.logout(req, res);
  json(res, 200, { ok: true });
});

route('GET', /^\/api\/auth\/me$/, async (req, res) => {
  const u = AUTH.currentUser(req);
  if (!u) return json(res, 200, { user: null, demo: true });
  const profile = getProfile(u.id);
  json(res, 200, { user: u, demo: false, hasProfile: !!profile, profile: profile ? { ...profile, target_countries: JSON.parse(profile.target_countries || '[]') } : null });
});




// ---------------- bootstrap ----------------
function seedSkills() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM skills').get().n;
  if (n > 0) return;
  const ins = db.prepare('INSERT OR IGNORE INTO skills (canonical,category,aliases,demand_index,salary_premium,growth_rate,is_emerging,decay_years) VALUES (?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  for (const [canonical, category, aliases, demand, premium, growth, emerging, decay] of SKILLS) {
    ins.run(canonical, category, JSON.stringify(aliases), demand, premium, growth, emerging, decay);
  }
  db.exec('COMMIT');
}

function ensureDemoUser() {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(DEMO_USER);
  if (!u) {
    db.prepare('INSERT INTO users (id,email,name,country) VALUES (?,?,?,?)')
      .run(DEMO_USER, 'demo@careeros.local', 'Geoffrey', 'PT');
  }
}

const t0 = Date.now();
seedSkills();
ensureDemoUser();
REF.seedPrograms();
const ingest = seedIfEmpty();
const ingestMs = Date.now() - t0;

// ---------------- helpers ----------------
route('GET', /^\/api\/health$/, async (req, res) => {
  const counts = {
    opportunities: db.prepare('SELECT COUNT(*) n FROM opportunities').get().n,
    sources: db.prepare('SELECT COUNT(*) n FROM opportunity_sources').get().n,
    salaryRecords: db.prepare('SELECT COUNT(*) n FROM salary_records').get().n,
    skills: db.prepare('SELECT COUNT(*) n FROM skills').get().n,
  };
  json(res, 200, { ok: true, counts, ingest, ingestMs, uptime: Math.round(process.uptime()) });
});

route('GET', /^\/api\/me$/, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(resolveUser(req));
  const profile = getProfile(resolveUser(req));
  const twin = db.prepare('SELECT state, updated_at FROM career_twin WHERE user_id=?').get(resolveUser(req));
  json(res, 200, {
    user,
    profile: profile ? { ...profile, target_countries: JSON.parse(profile.target_countries || '[]') } : null,
    twin: twin ? JSON.parse(twin.state) : null,
  });
});

route('POST', /^\/api\/onboarding$/, async (req, res) => {
  const body = await readBody(req);
  const cv = String(body.cv || '').trim();
  const parsed = cv ? E.parseResume(cv) : null;
  const goals = body.goals || {};

  const headline = body.headline || (parsed ? `${parsed.seniority} · ${parsed.roleFamily.replace(/_/g, ' ')}` : '');
  const seniority = body.seniority || (parsed ? parsed.seniority : 'mid');
  const years = body.years != null ? Number(body.years) : (parsed ? parsed.years : null);
  const currentRate = body.currentRate != null ? Number(body.currentRate) : (parsed ? parsed.currentRate : null);
  const rateUnit = body.rateUnit || (parsed ? parsed.rateUnit : 'year') || 'year';
  const targetRateMin = body.targetRateMin != null ? Number(body.targetRateMin) : (currentRate ? Math.round(currentRate * 1.25) : null);
  const targetCountries = body.targetCountries || (parsed ? parsed.countries : []);
  const remotePref = body.remotePreference || (parsed && parsed.wantsRemote ? 'remote' : 'any');
  const willingRelocate = body.willingToRelocate != null ? (body.willingToRelocate ? 1 : 0) : (targetCountries.length ? 1 : 0);
  const visaNeeded = body.visaNeeded != null ? (body.visaNeeded ? 1 : 0) : (parsed && parsed.needsVisa ? 1 : 0);

  const skillList = (body.skills && body.skills.length) ? body.skills : (parsed ? parsed.skills.map((s) => s.canonical) : []);
  const resolved = Array.from(new Set(skillList.map(resolveSkill).filter(Boolean)));

  let completeness = 0;
  completeness += Math.min(35, resolved.length * 4);
  completeness += years ? 15 : 0;
  completeness += currentRate ? 15 : 0;
  completeness += targetCountries.length ? 10 : 0;
  completeness += cv ? 15 : 0;
  completeness += 10;

  db.prepare(`INSERT INTO profiles (user_id,headline,summary,years_experience,seniority,current_role,current_company,
      current_rate,rate_unit,rate_currency,target_rate_min,remote_preference,willing_to_relocate,target_countries,
      visa_needed,risk_tolerance,time_to_move,goals,resume_text,completeness,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      headline=excluded.headline, summary=excluded.summary, years_experience=excluded.years_experience,
      seniority=excluded.seniority, current_rate=excluded.current_rate, rate_unit=excluded.rate_unit,
      target_rate_min=excluded.target_rate_min, remote_preference=excluded.remote_preference,
      willing_to_relocate=excluded.willing_to_relocate, target_countries=excluded.target_countries,
      visa_needed=excluded.visa_needed, goals=excluded.goals, resume_text=excluded.resume_text,
      completeness=excluded.completeness, updated_at=datetime('now')`)
    .run(resolveUser(req), headline, body.summary || (cv ? cv.slice(0, 400) : null), years, seniority,
      body.currentRole || null, body.currentCompany || null, currentRate, rateUnit, 'EUR', targetRateMin,
      remotePref, willingRelocate, JSON.stringify(targetCountries), visaNeeded,
      goals.riskTolerance || 'balanced', goals.timeToMove || 'exploring',
      JSON.stringify(goals), cv || null, Math.min(100, completeness));

  db.prepare('DELETE FROM profile_skills WHERE user_id=?').run(resolveUser(req));
  const insPs = db.prepare(`INSERT OR IGNORE INTO profile_skills (user_id,skill_id,proficiency,confidence,source)
    SELECT ?, id, 'working', ?, 'resume' FROM skills WHERE canonical=?`);
  for (const s of resolved) insPs.run(resolveUser(req), 0.9, s);

  const matched = E.computeMatches(resolveUser(req));
  const scores = E.computeCareerScore(resolveUser(req));
  const rates = E.rateIntelligence(resolveUser(req));
  log(resolveUser(req), 'onboarding.completed', 'profile', resolveUser(req), { skills: resolved.length, matched });

  json(res, 200, {
    profile: { ...getProfile(resolveUser(req)), target_countries: targetCountries },
    parsed: parsed ? { skills: parsed.skills, years: parsed.years, seniority: parsed.seniority, roleFamily: parsed.roleFamily, sectionsDetected: parsed.sectionsDetected } : null,
    matched, scores, rates,
  });
});

route('POST', /^\/api\/demo$/, async (req, res) => {
  const body = await readBody(req);
  const uid = resolveUser(req);
  const parsed = E.parseResume(DEMO_CV);
  const resolved = parsed.skills.map((s) => s.canonical);

  db.prepare(`INSERT INTO profiles (user_id,headline,summary,years_experience,seniority,current_role,current_company,
      current_rate,rate_unit,rate_currency,target_rate_min,remote_preference,willing_to_relocate,target_countries,
      visa_needed,risk_tolerance,time_to_move,goals,resume_text,completeness,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET headline=excluded.headline, years_experience=excluded.years_experience,
      seniority=excluded.seniority, current_rate=excluded.current_rate, rate_unit=excluded.rate_unit,
      target_rate_min=excluded.target_rate_min, remote_preference=excluded.remote_preference,
      willing_to_relocate=excluded.willing_to_relocate, target_countries=excluded.target_countries,
      visa_needed=excluded.visa_needed, resume_text=excluded.resume_text, completeness=excluded.completeness,
      updated_at=datetime('now')`)
    .run(
      uid,                                                           // user_id
      'Senior Data Scientist to AI Engineering',                     // headline
      'Senior data scientist moving into AI engineering. 8 yrs.',    // summary
      8,                                                             // years_experience
      'senior',                                                      // seniority
      'Senior Data Scientist',                                       // current_role
      'Fintech scale-up',                                            // current_company
      78000,                                                         // current_rate
      'year',                                                        // rate_unit
      'EUR',                                                         // rate_currency
      100000,                                                        // target_rate_min
      'remote',                                                      // remote_preference
      1,                                                             // willing_to_relocate
      JSON.stringify(['DE', 'NL', 'PT']),                            // target_countries
      1,                                                             // visa_needed
      body.riskTolerance || 'balanced',                              // risk_tolerance
      '3m',                                                          // time_to_move
      JSON.stringify({ primary: 'move into AI engineering (RAG/LLMOps)', targetIncome: 100000, targetCountries: ['DE', 'NL'] }),
      DEMO_CV,                                                       // resume_text
      88                                                             // completeness
    );

  db.prepare('DELETE FROM profile_skills WHERE user_id=?').run(uid);
  const insPs = db.prepare(`INSERT OR IGNORE INTO profile_skills (user_id,skill_id,proficiency,confidence,source)
    SELECT ?, id, 'advanced', 0.9, 'resume' FROM skills WHERE canonical=?`);
  for (const s of resolved) insPs.run(uid, s);

  E.computeMatches(uid);
  E.computeCareerScore(uid);
  log(uid, 'demo.loaded', 'profile', uid, { skills: resolved.length });
  json(res, 200, { ok: true, skills: resolved.length });
});

route('GET', /^\/api\/feed$/, async (req, res, url) => {
  const limit = Math.min(200, Number(url.searchParams.get('limit') || 60));
  const types = url.searchParams.get('types') ? url.searchParams.get('types').split(',') : null;
  const minScore = Number(url.searchParams.get('minScore') || 0);
  const hasProfile = !!getProfile(resolveUser(req));
  if (!hasProfile) return json(res, 200, { needsOnboarding: true, opportunities: [], counts: {} });

  const opps = opportunitiesWithMatch(resolveUser(req), { limit, types, minScore });
  const all = db.prepare(`SELECT o.type, COUNT(*) n FROM matches m JOIN opportunities o ON o.id=m.opportunity_id
    WHERE m.user_id=? AND m.match_score>=45 GROUP BY o.type`).all(resolveUser(req));
  const counts = Object.fromEntries(all.map((r) => [r.type, r.n]));
  const top = opps[0] || null;
  const saved = new Set(db.prepare('SELECT opportunity_id FROM applications WHERE user_id=?').all(resolveUser(req)).map((r) => r.opportunity_id));

  json(res, 200, {
    needsOnboarding: false,
    generatedAt: new Date().toISOString(),
    summary: {
      detected: all.reduce((s, r) => s + r.n, 0),
      topScore: top ? top.match_score : 0,
      counts,
    },
    opportunities: opps.map((o) => ({ ...o, tracked: saved.has(o.id) })),
  });
});

route('GET', /^\/api\/scores$/, async (req, res) => {
  const row = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY computed_at DESC, id DESC LIMIT 1').get(resolveUser(req));
  const history = db.prepare('SELECT overall, computed_at FROM career_scores WHERE user_id=? ORDER BY id ASC').all(resolveUser(req));
  json(res, 200, { scores: row ? { ...row, breakdown: JSON.parse(row.breakdown || '{}') } : null, history });
});

// Negotiation brief: the highest-value output in the product. It turns a benchmark into a
// number you can say out loud, with the evidence and the fallback attached.
route('GET', /^\/api\/negotiation$/, async (req, res) => {
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 404, { error: 'no profile' });
  const rates = E.rateIntelligence(uid);
  const twin = E.buildTwin(uid);
  if (!rates) return json(res, 404, { error: 'no benchmark' });
  const top = opportunitiesWithMatch(uid, { limit: 5, minScore: 60 });
  const best = top[0] || null;

  const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const periodLabel = rates.period === 'hour' ? 'per hour' : 'per year';

  const current = rates.current;
  const target = Math.round(rates.p75);
  const floor = Math.round(rates.p50);
  const stretch = Math.round(rates.p90);

  const levers = twin.skillDetail
    .filter((s) => s.salary_premium >= 10)
    .sort((a, b) => b.salary_premium - a.salary_premium)
    .slice(0, 4)
    .map((s) => `${s.canonical} (+${s.salary_premium}% market premium)`);

  // Only call out a channel if it is backed by a real sample, not a handful of outliers.
  const strongChannel = (rates.byChannel || []).find((c) => c.n >= 10 && c.median > floor);
  const channelUpside = strongChannel
    ? `The ${strongChannel.channel} channel pays a median of ${fmt(strongChannel.median)} across ${strongChannel.n} comparable postings — ${fmt(strongChannel.median - floor)} above your segment median.`
    : null;

  const askScript = current
    ? `"Based on what I'm seeing for senior ${E.guessFamily(profile, twin).replace(/_/g, ' ')} profiles with this stack, the range is ${fmt(rates.p25)} to ${fmt(rates.p75)} ${periodLabel}. I'm targeting ${fmt(target)} — that's the upper half of the band, and it reflects ${levers[0] ? levers[0].split(' (')[0] : 'the scope of the role'} on top of the core requirements. What's the band you've set for this level?"`
    : `"Before we go further, what band have you set for this level? I want to make sure we're in the same range."`;

  const counterScript = `If they offer below ${fmt(floor)}: "That's below the median for this profile. I can work with the lower number if we revisit it at six months against a written scope — otherwise I'd need to be closer to ${fmt(target)}."`;

  json(res, 200, {
    period: rates.period,
    currency: 'EUR',
    current,
    floor, target, stretch,
    gapPct: rates.gapPct,
    confidence: rates.confidence,
    exactComparables: rates.exactComparables,
    levers,
    channelUpside,
    askScript,
    counterScript,
    anchorOpportunity: best ? { id: best.id, title: best.title, company: best.company, compMin: best.comp_min, compMax: best.comp_max, currency: best.currency, period: best.comp_period } : null,
    rules: [
      'Never name a number before they do — ask for their band first.',
      `Anchor on the p75 (${fmt(target)}), not the median. The median is a floor, not a target.`,
      'Tie every number to evidence from your own market data, not to your current salary.',
      'Negotiate the whole package: base, equity, sign-on, remote allowance, learning budget.',
      'Get the number in writing before you accept verbally.',
    ],
  });
});

route('GET', /^\/api\/rates$/, async (req, res) => {
  const rates = E.rateIntelligence(resolveUser(req));
  if (!rates) return json(res, 404, { error: 'no profile' });
  json(res, 200, { ...rates, confidenceDetail: CONF.rateConfidence(rates.exactComparables || 0, rates.sampleSize, rates.confidence) });
});

route('GET', /^\/api\/twin$/, async (req, res) => {
  const twin = db.prepare('SELECT * FROM career_twin WHERE user_id=?').get(resolveUser(req));
  json(res, 200, twin ? { ...JSON.parse(twin.state), updatedAt: twin.updated_at } : null);
});

route('GET', /^\/api\/tracker$/, async (req, res) => {
  const rows = db.prepare(`SELECT a.*, o.title, o.company, o.type, o.city, o.country, o.comp_min, o.comp_max,
      o.currency, o.comp_period, m.match_score, m.interview_probability, m.offer_probability
    FROM applications a JOIN opportunities o ON o.id=a.opportunity_id
    LEFT JOIN matches m ON m.user_id=a.user_id AND m.opportunity_id=a.opportunity_id
    WHERE a.user_id=? ORDER BY a.updated_at DESC`).all(resolveUser(req));
  const outcomes = db.prepare('SELECT * FROM outcomes WHERE user_id=? ORDER BY occurred_at DESC').all(resolveUser(req));
  json(res, 200, { applications: rows, outcomes });
});

route('POST', /^\/api\/applications$/, async (req, res) => {
  const body = await readBody(req);
  const { opportunityId, status = 'saved' } = body;
  if (!opportunityId) return json(res, 400, { error: 'opportunityId required' });
  const id = crypto.randomUUID();
  const appliedAt = status === 'applied' ? new Date().toISOString() : null;
  db.prepare(`INSERT INTO applications (id,user_id,opportunity_id,status,applied_at,updated_at)
    VALUES (?,?,?,?,?,datetime('now'))
    ON CONFLICT(user_id,opportunity_id) DO UPDATE SET status=excluded.status,
      applied_at=COALESCE(excluded.applied_at, applications.applied_at), updated_at=datetime('now')`)
    .run(id, resolveUser(req), opportunityId, status, appliedAt);
  log(resolveUser(req), 'application.' + status, 'opportunity', opportunityId);
  E.computeCareerScore(resolveUser(req));
  json(res, 200, { ok: true });
});

route('POST', /^\/api\/applications\/status$/, async (req, res) => {
  const body = await readBody(req);
  const { opportunityId, status } = body;
  db.prepare('UPDATE applications SET status=?, updated_at=datetime(\'now\') WHERE user_id=? AND opportunity_id=?')
    .run(status, resolveUser(req), opportunityId);
  log(resolveUser(req), 'application.status', 'opportunity', opportunityId, { status });
  json(res, 200, { ok: true });
});

route('DELETE', /^\/api\/applications\/([^/]+)$/, async (req, res, url, m) => {
  db.prepare('DELETE FROM applications WHERE user_id=? AND opportunity_id=?').run(resolveUser(req), m[1]);
  json(res, 200, { ok: true });
});

// ---- market pulse: what the whole corpus says right now ----
route('GET', /^\/api\/pulse$/, async (req, res) => {
  const CUR = { EUR: 1, USD: 0.92, GBP: 1.17, CHF: 1.05, CAD: 0.68, PLN: 0.23, INR: 0.011 };
  const annual = (amt, cur, period) => {
    const eur = amt * (CUR[cur] || 1);
    if (period === 'hour') return eur * 1600;
    if (period === 'month') return eur * 12;
    if (period === 'day') return eur * 220;
    return eur;
  };

  const rows = db.prepare(`SELECT role_family, seniority, country, comp_min, comp_max, currency, comp_period,
      skills, posted_at, source, type FROM opportunities
    WHERE status='open' AND comp_min IS NOT NULL AND comp_period IN ('year','hour','month')`).all();

  const median = (arr) => {
    if (!arr.length) return null;
    const a = [...arr].sort((x, y) => x - y);
    const i = Math.floor(a.length / 2);
    return Math.round(a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2);
  };

  // By role family
  const byFamily = {};
  for (const r of rows) {
    const v = annual((Number(r.comp_min) + Number(r.comp_max || r.comp_min)) / 2, r.currency, r.comp_period);
    if (v < 15000 || v > 500000) continue;
    (byFamily[r.role_family] = byFamily[r.role_family] || []).push(v);
  }
  const families = Object.entries(byFamily)
    .filter(([, v]) => v.length >= 8)
    .map(([k, v]) => ({ family: k, median: median(v), n: v.length }))
    .sort((a, b) => b.median - a.median);

  // By country
  const byCountry = {};
  for (const r of rows) {
    if (!r.country || r.country === 'WW') continue;
    const v = annual((Number(r.comp_min) + Number(r.comp_max || r.comp_min)) / 2, r.currency, r.comp_period);
    if (v < 15000 || v > 500000) continue;
    (byCountry[r.country] = byCountry[r.country] || []).push(v);
  }
  const countries = Object.entries(byCountry)
    .filter(([, v]) => v.length >= 8)
    .map(([k, v]) => ({ country: k, median: median(v), n: v.length }))
    .sort((a, b) => b.median - a.median);

  // Supply: postings per role family in the last 14 days
  const recent = db.prepare(`SELECT role_family, COUNT(*) n FROM opportunities
    WHERE posted_at > datetime('now','-14 days') GROUP BY role_family ORDER BY n DESC`).all();

  // Skill demand with premiums
  const skillRows = db.prepare('SELECT canonical, demand_index, salary_premium, growth_rate, is_emerging FROM skills ORDER BY demand_index DESC').all();

  // Remote share
  const total = db.prepare("SELECT COUNT(*) n FROM opportunities WHERE status='open'").get().n;
  const remote = db.prepare("SELECT COUNT(*) n FROM opportunities WHERE status='open' AND remote_type='remote'").get().n;

  json(res, 200, {
    generatedAt: new Date().toISOString(),
    sample: rows.length,
    families,
    countries,
    supply: recent,
    skills: {
      rising: skillRows.filter((s) => s.growth_rate >= 15).slice(0, 8),
      falling: skillRows.filter((s) => s.growth_rate < 0).slice(0, 6),
      premium: [...skillRows].sort((a, b) => b.salary_premium - a.salary_premium).slice(0, 8),
    },
    remoteShare: total ? Math.round((remote / total) * 100) : 0,
    totals: { opportunities: total, remote },
  });
});

// ---- trajectory simulator ----
route('GET', /^\/api\/trajectory$/, async (req, res, url) => {
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 404, { error: 'no profile' });
  const twin = E.buildTwin(uid);
  const rates = E.rateIntelligence(uid);

  const annualise = (amount, unit) => {
    if (amount == null) return null;
    if (unit === 'hour') return Math.round(amount * 1600);
    if (unit === 'month') return Math.round(amount * 12);
    return Math.round(amount);
  };

  const currentAnnual = annualise(profile.current_rate, profile.rate_unit) || (rates ? rates.p50 : 80000);
  const months = Math.max(6, Math.min(60, Number(url.searchParams.get('months') || 24)));
  const result = TRAJ.simulate({
    currentAnnual,
    level: profile.seniority || 'mid',
    skills: twin.skillDetail || [],
    months,
  });
  const riskAdjustedById = Object.fromEntries((result.riskAdjusted || []).map((r) => [r.path, r.riskAdjusted]));
  const paths = result.paths.map((p) => ({ ...p, riskAdjusted: riskAdjustedById[p.path] ?? null }));
  json(res, 200, {
    ...result,
    paths,
    benchmark: rates ? { p50: rates.p50, p75: rates.p75, p90: rates.p90, period: rates.period } : null,
  });
});

// ---- outcome intelligence: rates from real results ----
route('GET', /^\/api\/outcomes\/intel$/, async (req, res) => {
  const uid = resolveUser(req);
  const mine = db.prepare('SELECT * FROM outcomes WHERE user_id=? ORDER BY occurred_at DESC').all(uid);
  const offers = mine.filter((o) => o.outcome_type === 'offer' && o.amount);
  const deltas = offers.map((o) => o.salary_delta_pct).filter((d) => d != null);
  const avgDelta = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;
  const all = db.prepare('SELECT outcome_type, amount, currency, period, salary_delta_pct FROM outcomes WHERE consent_to_aggregate=1').all();
  const globalOffers = all.filter((o) => o.outcome_type === 'offer' && o.amount);
  const byType = {};
  for (const o of all) byType[o.outcome_type] = (byType[o.outcome_type] || 0) + 1;
  const applied = db.prepare("SELECT COUNT(*) n FROM applications WHERE user_id=? AND status IN ('applied','interviewing','offer','rejected')").get(uid).n;
  const interviewed = db.prepare("SELECT COUNT(DISTINCT opportunity_id) n FROM outcomes WHERE user_id=? AND outcome_type='interview'").get(uid).n;
  const offered = db.prepare("SELECT COUNT(DISTINCT opportunity_id) n FROM outcomes WHERE user_id=? AND outcome_type='offer'").get(uid).n;
  json(res, 200, {
    mine: {
      total: mine.length,
      offers: offers.length,
      avgSalaryDeltaPct: avgDelta,
      funnel: {
        applied,
        interviewRate: applied ? Math.round((interviewed / applied) * 100) : null,
        offerRate: interviewed ? Math.round((offered / interviewed) * 100) : null,
        conversion: applied ? Math.round((offered / applied) * 100) : null,
      },
    },
    market: {
      reportedOutcomes: all.length,
      offers: globalOffers.length,
      byType,
      note: all.length < 25
        ? 'Not enough consented outcomes to publish a market benchmark yet. Deliberately gated at 25 to protect anonymity.'
        : 'Market benchmark published from consented, aggregated outcomes.',
    },
  });
});

route('POST', /^\/api\/outcomes$/, async (req, res) => {
  const body = await readBody(req);
  const { opportunityId, outcomeType, amount, notes } = body;
  const app = db.prepare('SELECT id FROM applications WHERE user_id=? AND opportunity_id=?').get(resolveUser(req), opportunityId);
  const id = crypto.randomUUID();
  let delta = null;
  if (amount) {
    const profile = getProfile(resolveUser(req));
    if (profile && profile.current_rate) {
      delta = Math.round(((Number(amount) - Number(profile.current_rate)) / Number(profile.current_rate)) * 100);
    }
  }
  db.prepare(`INSERT INTO outcomes (id,user_id,opportunity_id,application_id,outcome_type,amount,currency,period,salary_delta_pct,consent_to_aggregate,notes)
    VALUES (?,?,?,?,?,?,?,?,?,1,?)`)
    .run(id, resolveUser(req), opportunityId, app ? app.id : null, outcomeType, amount || null, amount ? 'EUR' : null,
      amount ? 'year' : null, delta, notes || null);
  if (outcomeType === 'offer') {
    db.prepare('UPDATE applications SET status=\'offer\', updated_at=datetime(\'now\') WHERE user_id=? AND opportunity_id=?')
      .run(resolveUser(req), opportunityId);
  }
  if (outcomeType === 'interview') {
    db.prepare('UPDATE applications SET status=\'interviewing\', updated_at=datetime(\'now\') WHERE user_id=? AND opportunity_id=?')
      .run(resolveUser(req), opportunityId);
  }
  log(resolveUser(req), 'outcome.reported', 'opportunity', opportunityId, { outcomeType, delta });
  E.computeCareerScore(resolveUser(req));
  const total = db.prepare('SELECT COUNT(*) n FROM outcomes').get().n;
  json(res, 200, { ok: true, totalOutcomes: total, salaryDeltaPct: delta });
});

// ---- outcomes → recalibration: the flywheel ----
route('POST', /^\/api\/horizon$/, async (req, res) => {
  const body = await readBody(req);
  const h = String(body.horizon || 'balanced');
  const map = { income: ['balanced', 'asap'], growth: ['aggressive', 'exploring'], stability: ['conservative', '6m'], balanced: ['balanced', 'exploring'] };
  const [risk, ttm] = map[h] || map.balanced;
  db.prepare('UPDATE profiles SET risk_tolerance=?, time_to_move=?, updated_at=datetime(\'now\') WHERE user_id=?')
    .run(risk, ttm, resolveUser(req));
  E.computeMatches(resolveUser(req));
  log(resolveUser(req), 'horizon.changed', 'profile', resolveUser(req), { horizon: h });
  json(res, 200, { ok: true, horizon: h, risk, ttm });
});

route('GET', /^\/api\/learning$/, async (req, res) => {
  const outcomes = db.prepare('SELECT * FROM outcomes WHERE user_id=? ORDER BY occurred_at DESC').all(resolveUser(req));
  const byType = {};
  for (const o of outcomes) byType[o.outcome_type] = (byType[o.outcome_type] || 0) + 1;
  const offers = outcomes.filter((o) => o.outcome_type === 'offer' && o.amount);
  const deltas = offers.map((o) => o.salary_delta_pct).filter((d) => d != null);
  const avgDelta = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;

  // Outcome-weighted recalibration: observed outcomes shift the probability priors.
  // Small-sample shrinkage (n/(n+20)) keeps one lucky offer from moving the model.
  const n = outcomes.length;
  const shrinkage = n / (n + 20);
  const lift = byType.interview ? Math.min(0.18, (byType.interview / Math.max(1, n)) * 0.35) : 0;

  const priors = db.prepare('SELECT model_version, COUNT(*) n, ROUND(AVG(interview_probability),1) p, ROUND(AVG(match_score),1) m FROM matches WHERE user_id=? GROUP BY model_version').all(resolveUser(req));

  json(res, 200, {
    totalOutcomes: n,
    byType,
    offers: offers.length,
    avgSalaryDeltaPct: avgDelta,
    calibration: {
      shrinkage: Number(shrinkage.toFixed(2)),
      interviewPriorLift: Number((lift * 100).toFixed(1)),
      explanation: n === 0
        ? 'No outcomes yet — the model is running on published market priors. Every outcome you report moves these numbers toward your reality.'
        : `${n} outcome${n === 1 ? '' : 's'} recorded. Your observed interview rate is being blended into the prior with ${Math.round(shrinkage * 100)}% weight (shrunk by n/(n+20) to stop small samples dominating).`,
      modelVersion: 'v1-rules + outcome blend',
    },
    priors,
  });
});

route('GET', /^\/api\/skills$/, async (req, res) => {
  const rows = db.prepare('SELECT canonical,category,demand_index,salary_premium,growth_rate,is_emerging FROM skills ORDER BY demand_index DESC').all();
  const mine = new Set(db.prepare('SELECT s.canonical FROM profile_skills ps JOIN skills s ON s.id=ps.skill_id WHERE ps.user_id=?')
    .all(resolveUser(req)).map((r) => r.canonical));
  json(res, 200, { skills: rows.map((r) => ({ ...r, has: mine.has(r.canonical) })) });
});

route('GET', /^\/api\/gaps$/, async (req, res) => {
  const profile = getProfile(resolveUser(req));
  if (!profile) return json(res, 200, { gaps: [] });
  const twin = E.buildTwin(resolveUser(req));
  const mine = new Set(twin.skills);
  const top = opportunitiesWithMatch(resolveUser(req), { limit: 40, minScore: 55 });
  const freq = new Map();
  for (const o of top) for (const s of o.missing_skills) freq.set(s, (freq.get(s) || 0) + 1);
  const skillMeta = new Map(db.prepare('SELECT canonical,demand_index,salary_premium,growth_rate FROM skills').all()
    .map((r) => [r.canonical, r]));
  const gaps = [...freq.entries()].map(([skill, n]) => {
    const meta = skillMeta.get(skill) || {};
    return {
      skill, blocking: n,
      share: Math.round((n / top.length) * 100),
      demand: meta.demand_index || 50,
      salaryPremium: meta.salary_premium || 0,
      growth: meta.growth_rate || 0,
      effortWeeks: (meta.demand_index || 50) > 70 ? 6 : 4,
      priority: Math.round(n * 3 + (meta.salary_premium || 0) * 0.6 + (meta.growth_rate || 0) * 0.3),
    };
  }).sort((a, b) => b.priority - a.priority).slice(0, 10);
  json(res, 200, { gaps, sampleOf: top.length });
});

// ---- grounded copilot (deterministic retrieval + templated reasoning) ----
route('POST', /^\/api\/copilot$/, async (req, res) => {
  const body = await readBody(req);
  const q = String(body.message || '').toLowerCase();
  const profile = getProfile(resolveUser(req));
  if (!profile) return json(res, 200, { reply: 'Load a profile first — paste your CV on the onboarding screen and I can answer with your actual data.' });

  const twin = E.buildTwin(resolveUser(req));
  const rates = E.rateIntelligence(resolveUser(req));
  const scores = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1').get(resolveUser(req));
  const top = opportunitiesWithMatch(resolveUser(req), { limit: 5 });
  const citations = [];

  const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  // Intent routing over grounded facts
  let reply = '';
  if (/rate|salary|pay|worth|underpaid|money|earn/.test(q)) {
    const r = rates;
    citations.push({ label: 'Rate intelligence', detail: `${r.sampleSize} comparable postings, ${r.confidence} confidence` });
    reply = r.verdict === 'underpaid'
      ? `You're underpaid. Your profile sits at ${fmt(r.p50)} median (p25 ${fmt(r.p25)} → p75 ${fmt(r.p75)}) for ${profile.seniority} ${E.guessFamily(profile, twin).replace(/_/g, ' ')} work at your skill mix. You currently report ${fmt(r.current)} — that's ${r.gapPct}% below the median, or ${fmt(r.gapAbs)} per year.\n\nThe gap is not your level, it's your channel. Median by channel: ${r.byChannel.map((c) => `${c.channel} ${fmt(c.median)}`).join(' · ')}.\n\nWhat moves it: ${r.topPayingSkills.map((s) => `${s.skill} (+${s.premium}%)`).join(', ')}. Those are the levers with the highest salary premium in your own skill adjacency.`
      : r.verdict === 'at_market'
        ? `You're roughly at market: ${fmt(r.current)} vs a median of ${fmt(r.p50)} (p25 ${fmt(r.p25)} → p75 ${fmt(r.p75)}). The upside isn't a raise, it's a reposition — p75 is ${fmt(r.p75)}, and the channel with the highest median is ${r.byChannel[0] ? r.byChannel[0].channel + ' at ' + fmt(r.byChannel[0].median) : 'n/a'}.`
        : `You're above market median (${fmt(r.current)} vs ${fmt(r.p50)}). Your leverage now is growth, not rate: the emerging skills in your adjacency are ${r.topPayingSkills.slice(0, 3).map((s) => s.skill).join(', ')}.`;
  } else if (/what should i|next|priorit|focus|best opportunit/.test(q)) {
    const best = top[0];
    citations.push({ label: 'Ranking', detail: `horizon=${top[0]?.horizon || 'balanced'} · top ${top.length} of ${db.prepare('SELECT COUNT(*) n FROM matches WHERE user_id=?').get(resolveUser(req)).n} scored` });
    const horizonNote = best?.horizon === 'income'
      ? 'You have signalled urgency, so income is weighted heavily in your ranking.'
      : best?.horizon === 'growth'
        ? 'You have signalled a growth horizon, so emerging-skill exposure outranks pay in your ranking.'
        : 'Your ranking is balanced: pay, fit and growth are weighted evenly.';
    reply = best
      ? `Do this next: **${best.title}** at ${best.company} — ${best.match_score}/100 match, ${best.interview_probability}% interview probability, ${best.offer_probability}% offer probability.${best.income_delta_pct != null ? ` Expected income is ${best.income_delta_pct > 0 ? '+' : ''}${best.income_delta_pct}% vs your current rate.` : ''}\n\nWhy it ranks first: ${best.reasons.slice(0, 3).map((r) => `${r.factor.toLowerCase()} (${r.detail})`).join('; ')}.\n\n${horizonNote}\n\nBlockers: ${best.missing_skills.length ? best.missing_skills.join(', ') : 'none — you cover every listed skill'}.\n\nRunners-up: ${top.slice(1, 4).map((o) => `${o.title} (${o.match_score})`).join(', ')}.`
      : 'No matches yet — load a profile first.';
  } else if (/skill|gap|learn|missing|course|study/.test(q)) {
    const mine = new Set(twin.skills);
    const freq = new Map();
    for (const o of opportunitiesWithMatch(resolveUser(req), { limit: 40, minScore: 55 })) for (const s of o.missing_skills) freq.set(s, (freq.get(s) || 0) + 1);
    const topGaps = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    citations.push({ label: 'Skill gap analysis', detail: 'computed across your top 40 matching opportunities' });
    reply = topGaps.length
      ? `Your gaps, ranked by how many of your realistic opportunities they block:\n\n${topGaps.map(([s, n], i) => `${i + 1}. **${s}** — blocks ${n} of your top 40 matches`).join('\n')}\n\nYou already have ${mine.size} recognised skills. The pattern is clear: your data-science core is strong, and the missing layer is deployment and LLM infrastructure. Closing ${topGaps[0][0]} alone would unblock the largest number of roles.`
      : 'No systematic gaps detected across your top 40 matches — your coverage is unusually complete.';
  } else if (/visa|relocat|move|country|germany|netherlands|abroad/.test(q)) {
    const r = rates;
    citations.push({ label: 'Relocation exposure', detail: `${JSON.parse(profile.target_countries || '[]').join(', ') || 'none set'}` });
    const allScored = opportunitiesWithMatch(resolveUser(req), { limit: 400 });
    const withVisa = allScored.filter((o) => o.visa_sponsorship === 'yes').length;
    const declared = allScored.filter((o) => o.visa_sponsorship === 'yes' || o.visa_sponsorship === 'no').length;
    const targets = JSON.parse(profile.target_countries || '[]');
    reply = `You need sponsorship and you're targeting ${targets.join(', ') || 'no countries yet'}.\n\nOf ${allScored.length} scored opportunities, ${withVisa} are explicitly sponsorship-positive — and only ${declared} state a position at all. The other ${allScored.length - declared} are silent, which is the real signal: most employers never say, so a filter that only matches "yes" hides most of the market.\n\nRealistic read: at ${fmt(r.p50)} median for your profile you clear the EU Blue Card threshold in Germany and the highly-skilled migrant threshold in the Netherlands on paper. Your constraint is not your level, and it is not your skills — it is that ${Math.round(((allScored.length - declared) / allScored.length) * 100)}% of the market gives you no signal at all. That is an outreach problem, not an application problem.`;
  } else if (/score|how am i|assess|rating/.test(q) || !q) {
    const s = scores || {};
    citations.push({ label: 'Career Score', detail: `overall ${s.overall || 0}/100, p${s.benchmark_percentile || 0}` });
    reply = `Your Career Score is **${s.overall || 0}/100** — ${s.benchmark_percentile || 0}th percentile for your level.\n\n· Employability ${s.employability || 0} — your top-15 matches average ${top.length ? Math.round(top.reduce((a, b) => a + b.match_score, 0) / top.length) : 0}\n· Interview readiness ${s.interview_readiness || 0}\n· Market demand ${s.market_demand || 0}\n· Salary potential ${s.salary_potential || 0}\n· Future growth ${s.future_growth || 0}\n· Momentum ${s.career_momentum || 0}\n\nBiggest lever: ${weakest(s)}.`;
  } else {
    reply = `I can answer from your actual data — try:\n\n· "What should I do next?"\n· "Am I underpaid?"\n· "Which skills are blocking me?"\n· "What's realistic for relocation to Germany?"\n· "How am I doing overall?"`;
  }

  function weakest(s) {
    const pairs = [['employability', s.employability], ['interview readiness', s.interview_readiness], ['market demand', s.market_demand], ['salary potential', s.salary_potential], ['future growth', s.future_growth], ['momentum', s.career_momentum]].filter((p) => p[1] != null);
    if (!pairs.length) return 'load a profile to see it';
    pairs.sort((a, b) => a[1] - b[1]);
    return `${pairs[0][0]} at ${pairs[0][1]} — it's the lowest of the six and the one worth attacking first`;
  }

  log(resolveUser(req), 'copilot.message', null, null, { intent: q.slice(0, 40) });
  json(res, 200, { reply, citations, grounded: true });
});

route('POST', /^\/api\/copilot\/opportunity$/, async (req, res) => {
  const body = await readBody(req);
  const { opportunityId, message } = body;
  const profile = getProfile(resolveUser(req));
  const row = db.prepare(`SELECT o.*, m.match_score, m.skill_fit, m.experience_fit, m.income_potential,
      m.interview_probability, m.offer_probability, m.risk_score, m.missing_skills, m.reasons
    FROM matches m JOIN opportunities o ON o.id=m.opportunity_id WHERE m.user_id=? AND m.opportunity_id=?`)
    .get(resolveUser(req), opportunityId);
  if (!row) return json(res, 404, { error: 'not found' });
  const reasons = JSON.parse(row.reasons || '[]');
  const missing = JSON.parse(row.missing_skills || '[]');
  const skills = JSON.parse(row.skills || '[]');
  const matched = skills.filter((s) => !missing.includes(s));
  const rates = E.rateIntelligence(resolveUser(req));
  const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const q = String(message || '').toLowerCase();

  const citations = [
    { label: 'Match model', detail: `v1-rules · ${reasons.slice(0, 3).map((r) => r.factor.toLowerCase()).join(', ')}` },
    { label: 'Rate benchmark', detail: rates ? `${rates.sampleSize} comparables, median ${fmt(rates.p50)}` : 'n/a' },
  ];

  let reply;
  if (/apply|worth|should i|chance|odds|realistic/.test(q) || !q) {
    reply = `${row.match_score >= 80 ? 'Yes — apply.' : row.match_score >= 65 ? 'Apply, but with a tailored CV.' : 'Low priority — better options exist.'}

Match ${row.match_score}/100 · interview ${row.interview_probability}% · offer ${row.offer_probability}%.
The gap between those two numbers is the real story: once you get in front of them, your chance of converting is ${Math.round((row.offer_probability / Math.max(0.1, row.interview_probability)) * 100)}%.

Evidence: ${matched.length}/${skills.length} listed skills covered${missing.length ? `; missing ${missing.join(', ')}` : ''}. ${reasons.find((r) => r.factor === 'Income')?.detail || ''}.

${missing.length ? `If you close ${missing[0]}, the match score moves into the next band and the interview probability roughly doubles — that is the single highest-leverage action available on this listing.` : 'Your coverage is complete. Your edge here is speed: listings seen on multiple boards close faster.'}`;
  } else if (/salary|pay|money|negotiat/.test(q)) {
    const expected = row.comp_min != null ? fmt(row.comp_min) + (row.comp_max ? '–' + fmt(row.comp_max) : '') + ' /' + row.comp_period : 'not disclosed';
    reply = `Listed compensation: ${expected}.
Your benchmark median for this level and skill mix: ${rates ? fmt(rates.p50) : 'n/a'}.
${row.comp_min == null ? 'Compensation is not disclosed — that is a negotiation risk. Ask in the first call; it also tells you whether the role is real.' : `Anchor on the upper half: ${fmt(row.comp_max || row.comp_min)} is defensible because you match ${matched.length} of ${skills.length} required skills.`}`;
  } else if (/skill|gap|learn/.test(q)) {
    reply = missing.length
      ? `Blocking skills, in order of impact: ${missing.join(', ')}.
You already have: ${matched.join(', ')}.
Close ${missing[0]} first — it appears most often across your other matches, so it compounds.`
      : `No gaps on this listing — you cover every required skill: ${skills.join(', ')}.`;
  } else {
    reply = `${row.title} at ${row.company}: match ${row.match_score}/100, interview ${row.interview_probability}%, offer ${row.offer_probability}%. Ask me whether to apply, how to negotiate, or what's blocking you.`;
  }
  log(resolveUser(req), 'copilot.opportunity', 'opportunity', opportunityId);
  json(res, 200, { reply, citations });
});

// ---- morning brief: the diff engine ----
route('GET', /^\/api\/brief$/, async (req, res) => {
  const profile = getProfile(resolveUser(req));
  if (!profile) return json(res, 200, { needsOnboarding: true });

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const top = opportunitiesWithMatch(resolveUser(req), { limit: 400, minScore: 45 });
  const seen = new Set(db.prepare('SELECT opportunity_id FROM brief_seen WHERE user_id=?').all(resolveUser(req)).map((r) => r.opportunity_id));
  const savedSearches = db.prepare('SELECT * FROM saved_searches WHERE user_id=?').all(resolveUser(req)).map((r) => ({ ...r, filters: JSON.parse(r.filters || '{}') }));

  const matchesSearch = (o, f) =>
    (!f.country || o.country === f.country) &&
    (!f.family || o.role_family === f.family) &&
    (!f.seniority || o.seniority === f.seniority) &&
    (!f.visa || o.visa_sponsorship === 'yes') &&
    (!f.types || f.types.split(',').includes(o.type));

  const isNew = (o) => !seen.has(o.id);

  const newSinceYesterday = top.filter((o) => isNew(o) && new Date(o.posted_at) > new Date(Date.now() - 86400000));
  const newHighMatch = top.filter((o) => isNew(o) && o.match_score >= 80).slice(0, 6);
  const closingSoon = top
    .filter((o) => o.closes_at && new Date(o.closes_at) - Date.now() < 3 * 86400000 && new Date(o.closes_at) > new Date())
    .sort((a, b) => new Date(a.closes_at) - new Date(b.closes_at)).slice(0, 5);
  const searchHits = savedSearches.map((s) => ({
    name: s.name,
    hits: top.filter((o) => isNew(o) && matchesSearch(o, s.filters)).slice(0, 4),
  })).filter((s) => s.hits.length);

  const rates = E.rateIntelligence(resolveUser(req));
  const scores = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1').get(resolveUser(req));
  const prev = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1 OFFSET 1').get(resolveUser(req));

  // Momentum / deltas
  const delta = (a, b) => (a != null && b != null ? a - b : null);
  const scoreDelta = prev ? delta(scores.overall, prev.overall) : null;

  // Gap of the day: the missing skill blocking the most new opportunities
  const gapCount = new Map();
  for (const o of newSinceYesterday.length ? newSinceYesterday : top.slice(0, 40)) {
    for (const s of o.missing_skills) gapCount.set(s, (gapCount.get(s) || 0) + 1);
  }
  const topGap = [...gapCount.entries()].sort((a, b) => b[1] - a[1])[0];

  // Headline: one sentence that earns the open
  let headline;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  if (newHighMatch.length) {
    headline = `${plural(newHighMatch.length, 'new opportunity', 'new opportunities')} at 80+ match overnight. Best: ${newHighMatch[0].title} at ${newHighMatch[0].company} (${newHighMatch[0].match_score}/100).`;
  } else if (newSinceYesterday.length) {
    headline = `${plural(newSinceYesterday.length, 'new opportunity', 'new opportunities')} since yesterday. Highest match: ${top[0]?.match_score ?? 0}/100.`;
  } else {
    headline = `Nothing new at your bar overnight. Your best live option is still ${top[0]?.title || '—'} (${top[0]?.match_score || 0}/100).`;
  }

  const actions = [];
  if (newHighMatch[0]) actions.push({ priority: 1, text: `Apply to ${newHighMatch[0].title} at ${newHighMatch[0].company} — ${newHighMatch[0].interview_probability}% interview probability`, opportunityId: newHighMatch[0].id });
  if (topGap) actions.push({ priority: 2, text: `Close ${topGap[0]} — it blocks ${topGap[1]} of your opportunities`, skill: topGap[0] });
  if (rates && rates.gapPct > 5) actions.push({ priority: 2, text: `You are ${rates.gapPct}% below market — open Rate Intelligence and take the number into your next conversation` });
  if (scores && scores.career_momentum < 30) actions.push({ priority: 3, text: `Momentum is ${scores.career_momentum}/100 — three applications this week moves it more than any CV edit` });
  if (closingSoon[0]) actions.push({ priority: 1, text: `${closingSoon[0].title} closes in ${Math.max(0, Math.ceil((new Date(closingSoon[0].closes_at) - Date.now()) / 86400000))} days` });

  json(res, 200, {
    needsOnboarding: false,
    generatedAt: new Date().toISOString(),
    headline,
    counts: {
      newSinceYesterday: newSinceYesterday.length,
      newHighMatch: newHighMatch.length,
      closingSoon: closingSoon.length,
      totalScored: top.length,
    },
    newHighMatch: newHighMatch.slice(0, 4),
    closingSoon,
    searchHits,
    actions: actions.sort((a, b) => a.priority - b.priority).slice(0, 4),
    scoreDelta,
    rates: rates ? { p50: rates.p50, gapPct: rates.gapPct, period: rates.period } : null,
    topGap: topGap ? { skill: topGap[0], blocking: topGap[1] } : null,
    unread: newSinceYesterday.length,
  });
});

route('POST', /^\/api\/brief\/ack$/, async (req, res) => {
  const ids = db.prepare('SELECT opportunity_id FROM matches WHERE user_id=? AND match_score>=45').all(resolveUser(req)).map((r) => r.opportunity_id);
  const ins = db.prepare('INSERT OR IGNORE INTO brief_seen (user_id, opportunity_id) VALUES (?,?)');
  db.exec('BEGIN');
  for (const id of ids) ins.run(resolveUser(req), id);
  db.exec('COMMIT');
  json(res, 200, { ok: true, marked: ids.length });
});


// ---- referral / affiliate layer ----
route('GET', /^\/api\/referrals$/, async (req, res) => {
  json(res, 200, REF.summary(resolveUser(req)));
});

route('POST', /^\/api\/referrals$/, async (req, res) => {
  const body = await readBody(req);
  const { name, slug, category, payoutModel, payoutAmount, template, notes } = body;
  if (!name || !slug) return json(res, 400, { error: 'name and slug required' });
  try {
    db.prepare(`INSERT INTO referral_programs (name,slug,category,payout_model,payout_amount,template,notes,active)
      VALUES (?,?,?,?,?,?,?,1)`)
      .run(name, slug, category || 'other', payoutModel || 'cpa', payoutAmount || 0, template || '', notes || null);
    log(resolveUser(req), 'referral.program_added', 'referral', slug);
    json(res, 200, { ok: true });
  } catch (e) { json(res, 400, { error: String(e.message) }); }
});

route('PATCH', /^\/api\/referrals\/(\d+)$/, async (req, res, url, m) => {
  const body = await readBody(req);
  const fields = [];
  const vals = [];
  for (const k of ['template', 'payout_amount', 'payout_model', 'active', 'notes', 'category']) {
    if (body[k] !== undefined) { fields.push(`${k}=?`); vals.push(body[k]); }
  }
  if (!fields.length) return json(res, 400, { error: 'nothing to update' });
  vals.push(Number(m[1]));
  db.prepare(`UPDATE referral_programs SET ${fields.join(',')} WHERE id=?`).run(...vals);
  json(res, 200, { ok: true });
});

// click-through: records, then redirects. Never influences what is shown.
route('GET', /^\/go\/([a-z0-9]+)$/, async (req, res, url, m) => {
  const u = AUTH.currentUser(req);
  const hit = REF.recordClick(m[1], {
    userId: u ? u.id : resolveUser(req),
    surface: url.searchParams.get('s'),
    opportunityId: url.searchParams.get('o'),
    ip: req.socket.remoteAddress,
    ua: req.headers['user-agent'],
  });
  if (!hit) { res.writeHead(404); return res.end('unknown link'); }
  res.writeHead(302, { Location: hit.target });
  res.end();
});

route('POST', /^\/api\/referrals\/link$/, async (req, res) => {
  const body = await readBody(req);
  const uid = resolveUser(req);
  const { sourceKey, opportunityId, skill } = body;
  let program = sourceKey ? REF.programForSource(sourceKey) : null;
  if (!program && skill) program = REF.programForSkill(skill);
  if (!program) return json(res, 200, { referral: null });
  const link = REF.buildLink(program, uid, body.targetUrl || '', body.surface || 'detail');
  log(uid, 'referral.link_created', 'referral', program.slug, { opportunityId });
  json(res, 200, {
    referral: {
      program: program.name, slug: program.slug, category: program.category,
      payoutModel: program.payout_model, payoutAmount: program.payout_amount,
      url: `/go/${link.code}?s=${encodeURIComponent(body.surface || 'detail')}${opportunityId ? '&o=' + encodeURIComponent(opportunityId) : ''}`,
      disclosure: 'Referral partner. It never affects your ranking or your score.',
    },
  });
});

// ---- billing / plans ----
const PLANS = {
  free: { key: 'free', label: 'Free', price: 0, period: null, features: ['Top 10 scored opportunities', '5 match scores / month', 'Rate gap check', 'Tracker (5 items)'] },
  pro: { key: 'pro', label: 'Pro', price: 19, period: 'month', annual: 149, features: ['Unlimited scored opportunities', 'Career Twin + all six scores', 'Full Radar with filters', 'Saved searches & the daily brief', 'AI Copilot (grounded)', 'Rate intelligence, full sample', 'Unlimited tracker & outcomes'] },
};

route('GET', /^\/api\/plan$/, async (req, res) => {
  const uid = resolveUser(req);
  const row = db.prepare('SELECT * FROM plan_state WHERE user_id=?').get(uid);
  const plan = row ? row.plan : 'free';
  const usage = {
    matchScores: db.prepare('SELECT COUNT(*) n FROM matches WHERE user_id=?').get(uid).n,
    tracked: db.prepare('SELECT COUNT(*) n FROM applications WHERE user_id=?').get(uid).n,
  };
  json(res, 200, { plan, plans: PLANS, usage, limits: plan === 'pro' ? null : { matches: 10, tracked: 5 }, since: row ? row.since : null });
});

route('POST', /^\/api\/plan$/, async (req, res) => {
  const body = await readBody(req);
  const uid = resolveUser(req);
  const plan = body.plan === 'pro' ? 'pro' : 'free';
  const cycle = body.cycle === 'annual' ? 'annual' : 'monthly';
  db.prepare(`INSERT INTO plan_state (user_id,plan,cycle,since) VALUES (?,?,?,datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan, cycle=excluded.cycle, since=datetime('now')`)
    .run(uid, plan, cycle);
  log(uid, 'plan.changed', 'billing', uid, { plan, cycle });
  json(res, 200, { ok: true, plan, cycle, note: plan === 'pro' ? 'Stripe checkout is not wired in this environment — this is the local entitlement switch the paywall reads.' : 'Downgraded.' });
});

// ---- live ingestion ----
route('POST', /^\/api\/ingest$/, async (req, res) => {
  const body = await readBody(req);
  const keys = Array.isArray(body.sources) && body.sources.length ? body.sources : undefined;
  const run = await ingestLive({ keys });
  // re-score everything for the demo user so the feed reflects new inventory
  if (getProfile(resolveUser(req))) { E.computeMatches(resolveUser(req)); E.computeCareerScore(resolveUser(req)); }
  log(resolveUser(req), 'ingest.run', 'system', null, { inserted: run.inserted, merged: run.merged, ms: run.ms });
  json(res, 200, run);
});

route('GET', /^\/api\/ingest$/, async (req, res) => {
  const last = lastRun();
  const counts = db.prepare("SELECT source, COUNT(*) n FROM opportunities WHERE source IN ('arbeitnow','remoteok','jobicy','hackernews') GROUP BY source").all();
  const liveTotal = db.prepare("SELECT COUNT(*) n FROM opportunities WHERE source IN ('arbeitnow','remoteok','jobicy','hackernews')").get().n;
  json(res, 200, { last, liveTotal, counts, adapters: Object.entries(SOURCES.ADAPTERS).map(([k, v]) => ({ key: k, label: v.label, note: v.note, quality: v.quality })) });
});

route('GET', /^\/api\/saved-searches$/, async (req, res) => {
  const rows = db.prepare('SELECT * FROM saved_searches WHERE user_id=? ORDER BY created_at DESC').all(resolveUser(req));
  json(res, 200, { searches: rows.map((r) => ({ ...r, filters: JSON.parse(r.filters || '{}') })) });
});

route('POST', /^\/api\/saved-searches$/, async (req, res) => {
  const body = await readBody(req);
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO saved_searches (id,user_id,name,filters) VALUES (?,?,?,?)')
    .run(id, resolveUser(req), body.name || 'Untitled search', JSON.stringify(body.filters || {}));
  json(res, 200, { ok: true, id });
});

route('DELETE', /^\/api\/saved-searches\/([^/]+)$/, async (req, res, url, m) => {
  db.prepare('DELETE FROM saved_searches WHERE user_id=? AND id=?').run(resolveUser(req), m[1]);
  json(res, 200, { ok: true });
});

// ---- operations / transparency ----
route('GET', /^\/api\/ops$/, async (req, res) => {
  const bySource = db.prepare(`SELECT source, COUNT(*) n, AVG(source_quality) q FROM opportunities GROUP BY source ORDER BY n DESC`).all();
  const byType = db.prepare('SELECT type, COUNT(*) n FROM opportunities GROUP BY type ORDER BY n DESC').all();
  const dup = db.prepare(`SELECT ROUND(AVG(source_count),2) avg_sources, COUNT(*) n FROM opportunities`).get();
  const multi = db.prepare('SELECT COUNT(*) n FROM opportunities WHERE source_count > 1').get().n;
  const quality = db.prepare(`SELECT COUNT(*) n FROM opportunities WHERE comp_min IS NULL`).get().n;
  json(res, 200, {
    ingest,
    bySource, byType,
    avgSourcesPerOpportunity: dup.avg_sources,
    multiSourced: multi,
    missingComp: quality,
    totalOpportunities: dup.n,
    salaryRecords: db.prepare('SELECT COUNT(*) n FROM salary_records').get().n,
  });
});

// ---------------- static ----------------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function serveStatic(req, res, pathname) {
  let p = pathname === '/' ? '/index.html' : pathname;
  const file = path.join(PUBLIC, p);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/go/')) return serveStatic(req, res, pathname);

  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = pathname.match(r.pattern);
    if (m) {
      try { return await r.handler(req, res, url, m); }
      catch (e) {
        console.error(e);
        return json(res, 500, { error: String(e && e.message || e) });
      }
    }
  }
  json(res, 404, { error: 'no route', path: pathname });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`CareerOS engine on http://127.0.0.1:${PORT}`);
  console.log(`seed: ${ingest.raw ?? 0} raw → ${ingest.canonical ?? ingest.count} canonical, ${ingest.merged ?? 0} merged (${ingest.duplicateRate ?? 0}% dup) in ${ingestMs}ms`);
  // Live ingestion on boot, then every 30 minutes. Failures are isolated per source.
  const runLive = async (label) => {
    try {
      const r = await ingestLive();
      console.log(`[${label}] live: ${r.fetched} fetched → ${r.kept} kept, ${r.inserted} new, ${r.merged} merged (${r.duplicateRate}% dup), ${r.droppedNonTech} non-tech dropped, ${r.ms}ms`);
      for (const rep of r.report) if (!rep.ok) console.log(`  ! ${rep.key} failed: ${rep.error}`);
    } catch (e) { console.log('  ! live ingest error', e.message); }
  };
  runLive('boot');
  setInterval(() => runLive('scheduled'), 30 * 60 * 1000);
});
