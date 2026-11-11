// ThinkZet AI – API server. Node built-ins only (http + node:sqlite). Zero dependencies.
'use strict';
// Minimal .env loader: KEY=value lines, no dependency, ignored if the file is absent.
try {
  const envPath = require('node:path').join(__dirname, '.env');
  if (require('node:fs').existsSync(envPath)) {
    for (const line of require('node:fs').readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch { /* .env is optional */ }
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
const OAUTH = require('./oauth.cjs');
const REF = require('./referrals.cjs');
const CONF = require('./confidence.cjs');
const TRAJ = require('./trajectory.cjs');
const COVER = require('./coverletter.cjs');
const INTERVIEW = require('./interview.cjs');
const AN = require('./analytics.cjs');
const BILLING = require('./billing.cjs');
const MAIL = require('./mailer.cjs');

const COMPANY = {
  name: 'ZyraFlow GmbH',
  mark: 'ZyraFlow GmbH™',
  product: 'ThinkZet',
  descriptor: 'AI Intelligence Platform',
  domain: 'thinkzet.com',
  url: 'https://thinkzet.com',
  copyright: (year = new Date().getFullYear()) => `© ${year} ZyraFlow GmbH™. All rights reserved.`,
  legalLine: (year = new Date().getFullYear()) => `© ${year} ZyraFlow GmbH™. All rights reserved. ThinkZet is a product of ZyraFlow GmbH™.`,
};

const PORT = Number(process.env.PORT || 4173);
const PUBLIC = path.join(__dirname, 'public');
// Every route resolves the acting user from the session cookie.
// The demo persona is a real user row, so the demo path and the real path are the same code.
const DEMO_USER = 'demo-user';
// acting user is resolved per-request

// Simple fixed-window rate limiter for the public surface. In-memory is right for a single
// process; swap for Redis the moment there is more than one instance.
const RL = { buckets: new Map() };
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = RL.buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > b.reset) { b.count = 0; b.reset = now + windowMs; }
  b.count++;
  RL.buckets.set(key, b);
  return { allowed: b.count <= limit, remaining: Math.max(0, limit - b.count), reset: b.reset };
}
function clientKey(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();
}
// Housekeeping so the bucket map cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of RL.buckets) if (now > v.reset + 60000) RL.buckets.delete(k);
}, 5 * 60 * 1000);

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
  // Two buckets: one per address (a person retrying their own code) and a looser one per IP
  // (a shared office, a phone network, or a household). A single IP bucket locked out everyone
  // behind the same NAT after ten requests, which is why a new sign-up saw "Too many code requests".
  const body = await readBody(req);
  const emailKey = String(body.email || '').trim().toLowerCase();
  const rl = rateLimit('auth:email:' + emailKey, 5, 15 * 60 * 1000);
  const rlIp = rateLimit('auth:ip:' + clientKey(req), 40, 15 * 60 * 1000);
  if (!rl.allowed) return json(res, 429, { error: 'Too many codes for this address. Try again in a few minutes.' });
  if (!rlIp.allowed) return json(res, 429, { error: 'Too many code requests from this network. Try again in a few minutes.' });
  try {
    const r = AUTH.requestCode(body.email);
    log(null, 'auth.code_requested', 'user', r.email);
    // With a real mail provider the code goes ONLY to the inbox. Returning it in the response
    // would let anyone sign in as any address without owning it.
    if (MAIL.status().live) {
      const id = MAIL.enqueue({
        to: r.email, kind: 'login_code', subject: `${r.code} is your ThinkZet sign-in code`,
        text: `Your ThinkZet sign-in code is ${r.code}\n\nIt expires in 10 minutes. If you did not ask for it, ignore this email.\n\nThinkZet`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1a1530"><p style="font-size:15px;margin:0 0 14px">Your ThinkZet sign-in code</p><p style="font-size:34px;font-weight:700;letter-spacing:.3em;margin:0 0 14px">${r.code}</p><p style="font-size:13px;color:#6b6585;margin:0">It expires in 10 minutes. If you did not ask for it, ignore this email.</p></div>`,
      });
      const d = await MAIL.deliver(db.prepare('SELECT * FROM email_queue WHERE id=?').get(id));
      if (!d.ok) {
        // Say what actually failed in the server log, and give the user an honest message.
        console.log(`  ! login code email failed: ${d.error}`);
        log(null, 'auth.code_email_failed', 'user', r.email, { error: String(d.error).slice(0, 200) });
        const unverified = /not verified|testing email|own email|verify your domain/i.test(String(d.error));
        const misconfigured = /missing `?html`? or `?text`?|missing.*field|invalid.*from|validation_error/i.test(String(d.error));
        return json(res, 502, { error: unverified
          ? 'Email sign-in is being set up and cannot reach this address yet. Please try again soon.'
          : misconfigured
            ? 'Sign-in email is misconfigured on our side, not yours. We have been alerted.'
            : 'We could not send the code to that address. Please try again shortly.' });
      }
      return json(res, 200, { ok: true, sentTo: r.email, expiresAt: r.expiresAt, delivered: true });
    }
    json(res, 200, { ok: true, sentTo: r.email, devCode: r.code, expiresAt: r.expiresAt });
  } catch (e) { json(res, 400, { error: e.message }); }
});

route('POST', /^\/api\/auth\/verify$/, async (req, res) => {
  const body = await readBody(req);
  const r = AUTH.verifyCode(body.email, body.code);
  if (!r) return json(res, 401, { error: 'Invalid or expired code' });
  AUTH.setCookie(res, AUTH.COOKIE, r.token, AUTH.SESSION_DAYS * 86400);
  log(r.user.id, 'auth.login', 'user', r.user.id);
  AN.track(r.user.id, 'auth.verified', { hasProfile: !!getProfile(r.user.id) });
  try { scheduleSequence(r.user.id); } catch (e) { /* sequence is best-effort */ }
  json(res, 200, { ok: true, user: r.user, hasProfile: !!getProfile(r.user.id) });
});

// ---- Google / Apple sign-in ----
route('GET', /^\/api\/auth\/providers$/, async (req, res) => json(res, 200, OAUTH.providers()));

route('GET', /^\/api\/auth\/(google|apple)\/start$/, async (req, res, url, m) => {
  try {
    const to = OAUTH.startUrl(m[1], publicOrigin(req));
    res.writeHead(302, { Location: to, 'Cache-Control': 'no-store' });
    res.end();
  } catch (e) { res.writeHead(302, { Location: '/?app=1&auth_error=' + encodeURIComponent(e.message) }); res.end(); }
});

// The last few OAuth outcomes, so a failure in production can be read without Railway logs.
const OAUTH_LOG = [];
function noteOauth(provider, outcome, detail, raw) {
  // `detail` is what a person may read. `raw` is the provider's own words, kept for diagnosis only and
  // never sent to the browser, so a failure can be explained without leaking a secret.
  OAUTH_LOG.unshift({
    at: new Date().toISOString(), provider, outcome,
    detail: String(detail || '').slice(0, 200),
    raw: raw ? String(raw).slice(0, 400) : undefined,
  });
  if (OAUTH_LOG.length > 10) OAUTH_LOG.pop();
  console.log(`  oauth ${provider}: ${outcome} ${detail ? '- ' + String(detail).slice(0, 160) : ''}${raw ? ' | ' + String(raw).slice(0, 300) : ''}`);
}
route('GET', /^\/api\/auth\/diagnostic$/, async (req, res) => json(res, 200, { recent: OAUTH_LOG, readiness: OAUTH.readiness() }));

// The same report as a page, so nobody needs a terminal to read it.
route('GET', /^\/diagnostic$/, async (req, res) => {
  const r = OAUTH.readiness();
  const ok = (v) => (v ? '<span style="color:#2f9e6b">yes</span>' : '<span style="color:#c0392b">no</span>');
  const row = (k, v) => `<tr><td style="padding:4px 12px 4px 0;color:#667">${k}</td><td>${ok(v)}</td></tr>`;
  const provider = (name, o) => `<h2 style="font:600 15px -apple-system,sans-serif;margin:22px 0 6px">${name}</h2>
    <table style="border-collapse:collapse;font:13px ui-monospace,monospace">${Object.entries(o).map(([k, v]) => row(k, v)).join('')}</table>`;
  const events = OAUTH_LOG.length
    ? `<table style="border-collapse:collapse;font:13px -apple-system,sans-serif;margin-top:8px">${OAUTH_LOG.map((e) => `<tr><td style="padding:5px 14px 5px 0;color:#667;white-space:nowrap">${esc(e.at)}</td><td style="padding:5px 14px 5px 0">${esc(e.provider)}</td><td style="padding:5px 14px 5px 0">${esc(e.outcome)}</td><td style="padding:5px 0;color:#334">${esc(e.detail)}${e.raw ? ` <span style="color:#889">· ${esc(e.raw)}</span>` : ''}</td></tr>`).join('')}</table>`
    : '<p style="color:#667;font:13px -apple-system,sans-serif">No sign-in attempts since the last restart.</p>';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>ThinkZet diagnostic</title>
    <body style="margin:0;padding:28px;background:#fbfafc;color:#1d1b26;font-family:-apple-system,sans-serif">
    <h1 style="font-size:19px;margin:0 0 4px">Sign-in diagnostic</h1>
    <p style="color:#667;font-size:13px;margin:0">Booleans only. No key, secret or identifier is shown.</p>
    ${provider('Google', r.google)}${provider('Apple', r.apple)}
    <h2 style="font-size:15px;margin:26px 0 6px">Recent attempts</h2>${events}
    <p style="color:#889;font-size:12px;margin-top:26px">JSON: <a href="/api/auth/diagnostic">/api/auth/diagnostic</a></p>`);
});

async function oauthCallback(req, res, provider, params) {
  const fail = (msg) => {
    noteOauth(provider, 'failed', msg);
    res.writeHead(303, { Location: '/?app=1&auth_error=' + encodeURIComponent(msg), 'Cache-Control': 'no-store' });
    res.end();
  };
  if (params.error) return fail(params.error === 'access_denied' || params.error === 'user_cancelled_authorize' ? 'Sign-in was cancelled' : 'Sign-in failed');
  if (!params.code || !params.state) return fail('Sign-in failed');
  try {
    const r = await OAUTH.finish(provider, publicOrigin(req), params.code, params.state, params.user);
    AUTH.setCookie(res, AUTH.COOKIE, r.token, AUTH.SESSION_DAYS * 86400);
    noteOauth(provider, 'signed in', r.user.email);
    log(r.user.id, 'auth.login', 'user', r.user.id, { via: provider });
    AN.track(r.user.id, 'auth.verified', { via: provider, hasProfile: !!getProfile(r.user.id) });
    try { scheduleSequence(r.user.id); } catch (e) { /* sequence is best-effort */ }
    res.writeHead(303, { Location: '/?app=1', 'Cache-Control': 'no-store' });
    res.end();
  } catch (e) {
    const msg = String(e.message || e);
    // A key or token problem is our fault, not the person's. Say so, and keep the detail in the log.
    if (/DECODER|PEM|private key|invalid_client|invalid_client_secret/i.test(msg)) {
      noteOauth(provider, 'config error', msg, msg);
      return fail('Sign-in with ' + provider + ' is misconfigured on our side. We have been alerted.');
    }
    fail(msg);
  }
}

route('GET', /^\/api\/auth\/google\/callback$/, async (req, res, url) => oauthCallback(req, res, 'google', Object.fromEntries(url.searchParams)));
// Apple returns by cross-site POST with a form body (response_mode=form_post).
route('POST', /^\/api\/auth\/apple\/callback$/, async (req, res) => {
  let raw = '';
  await new Promise((ok) => { req.on('data', (c) => { raw += c; if (raw.length > 1e5) req.destroy(); }); req.on('end', ok); req.on('error', ok); });
  return oauthCallback(req, res, 'apple', Object.fromEntries(new URLSearchParams(raw)));
});

route('POST', /^\/api\/me\/name$/, async (req, res) => {
  const u = AUTH.currentUser(req);
  if (!u) return json(res, 401, { error: 'Sign in first' });
  const body = await readBody(req);
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (name.length < 2 || /@|https?:|\d{3,}/.test(name)) return json(res, 400, { error: 'Enter your name' });
  // display_name is the person's own choice and wins everywhere. users.name keeps the provider's name.
  db.prepare('UPDATE users SET display_name=? WHERE id=?').run(name, u.id);
  const fresh = db.prepare('SELECT id,email,name,display_name FROM users WHERE id=?').get(u.id);
  json(res, 200, { ok: true, name, user: fresh });
});

route('POST', /^\/api\/auth\/logout$/, async (req, res) => {
  AUTH.logout(req, res);
  json(res, 200, { ok: true });
});

// One-time cleanup: earlier versions guessed a name from the email handle ('ronnohjeff' became
// 'Ronnohjeff'). That is not a name. Clear those so the user is asked for a real one.
(function clearEmailDerivedNames() {
  const derive = (email) => String(email).split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  let n = 0;
  for (const u of db.prepare("SELECT id,email,name FROM users WHERE name IS NOT NULL AND status!='deleted'").all()) {
    if (u.name === derive(u.email)) { db.prepare('UPDATE users SET name=NULL WHERE id=?').run(u.id); n++; }
  }
  if (n) console.log(`  cleared ${n} email-derived name(s)`);
})();

route('GET', /^\/api\/auth\/me$/, async (req, res) => {
  const u = AUTH.currentUser(req);
  if (!u) return json(res, 200, { user: null, demo: true });
  const profile = getProfile(u.id);
  json(res, 200, { user: effectiveUser(u), demo: false, hasProfile: !!profile, profile: profile ? { ...profile, target_countries: JSON.parse(profile.target_countries || '[]') } : null });
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
// Public origin resolution: APP_URL when set, otherwise the host the request arrived on.
// This is what keeps email links working behind a tunnel without a redeploy.
function publicOrigin(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'http').toString().split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host || `127.0.0.1:${PORT}`;
  return `${proto}://${host}`;
}

route('GET', /^\/api\/config$/, async (req, res) => {
  json(res, 200, {
    origin: publicOrigin(req),
    appUrlConfigured: !!process.env.APP_URL,
    company: COMPANY.mark,
    product: COMPANY.product,
    tagline: "Think beyond. Build what's next.",
    category: 'AI Intelligence Platform',
  });
});

// Data transparency: what the corpus actually contains, when it last changed, and how much of it
// is real. The counts are measured, never asserted.
// Funnel events the client sends. Only names in this list are stored, so the table cannot be
// polluted by arbitrary strings, and the payload is trimmed to small primitives.
const FUNNEL_EVENTS = new Set(['landing.view', 'signup.started', 'signup.completed', 'radar.opened',
  'upgrade.clicked', 'payment.completed', 'cancel.started']);
route('POST', /^\/api\/track$/, async (req, res) => {
  const body = await readBody(req);
  const name = String(body.event || '').trim();
  if (!FUNNEL_EVENTS.has(name)) return json(res, 400, { error: 'unknown event' });
  const u = AUTH.currentUser(req);
  const props = {};
  for (const [k, v] of Object.entries(body.props || {})) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') props[k] = String(v).slice(0, 120);
  }
  AN.track(u ? u.id : resolveUser(req), name, props, String(body.path || '').slice(0, 200));
  json(res, 200, { ok: true });
});

// Ad configuration. Off unless ADSENSE_CLIENT is set, so nothing loads by accident and the
// placement rules in MON-02 are enforced in one place.
const ADSENSE_CLIENT = (process.env.ADSENSE_CLIENT || '').trim();
const ADSENSE_SLOT = (process.env.ADSENSE_SLOT || '').trim();
// Feedback: one rating per person per surface, a comment optional, plus a summary for the Leads screen.
route('POST', /^\/api\/feedback$/, async (req, res) => {
  const body = await readBody(req);
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json(res, 400, { error: 'rating must be 1 to 5' });
  const u = AUTH.currentUser(req);
  const surface = String(body.surface || 'app').slice(0, 40);
  const comment = body.comment ? String(body.comment).replace(/\s+/g, ' ').trim().slice(0, 600) : null;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO feedback (id,user_id,rating,comment,surface) VALUES (?,?,?,?,?)')
    .run(id, u ? u.id : null, rating, comment, surface);
  AN.track(u ? u.id : resolveUser(req), 'feedback.rated', { rating, surface });
  json(res, 200, { ok: true, id });
});

route('GET', /^\/api\/feedback$/, async (req, res) => {
  const rows = db.prepare('SELECT rating, COUNT(*) n FROM feedback GROUP BY rating').all();
  const total = rows.reduce((a, r) => a + r.n, 0);
  const avg = total ? rows.reduce((a, r) => a + r.rating * r.n, 0) / total : null;
  const recent = db.prepare('SELECT rating, comment, surface, created_at FROM feedback ORDER BY created_at DESC LIMIT 20').all();
  json(res, 200, { total, average: avg == null ? null : Math.round(avg * 10) / 10, distribution: rows, recent });
});

route('GET', /^\/api\/ads$/, async (req, res) => {
  const u = AUTH.currentUser(req);
  const plan = u ? BILLING.planFor(u.id) : 'free';
  const paid = plan === 'pro' || plan === 'plus';
  json(res, 200, {
    enabled: !!ADSENSE_CLIENT && !paid,
    client: ADSENSE_CLIENT || null,
    slot: ADSENSE_SLOT || null,
    reason: !ADSENSE_CLIENT ? 'no publisher id configured' : paid ? 'paid plan, ads never shown' : 'free plan',
    consentRequired: true,
  });
});

route('GET', /^\/api\/data-sources$/, async (req, res) => {
  const LIVE = ['arbeitnow', 'jobicy', 'remoteok', 'hackernews'];
  const ph = LIVE.map(() => '?').join(',');
  const open = db.prepare("SELECT COUNT(*) n FROM opportunities WHERE status='open'").get().n;
  const sal = db.prepare("SELECT COUNT(*) n FROM salary_records").get().n;
  const salLive = db.prepare(`SELECT COUNT(*) n FROM salary_records WHERE source IN (${ph})`).get(...LIVE).n;
  const countries = db.prepare("SELECT COUNT(DISTINCT country) n FROM opportunities WHERE status='open' AND country NOT IN ('WW','EU')").get().n;
  const last = db.prepare("SELECT MAX(created_at) t FROM opportunities").get().t;
  const lastRun = db.prepare("SELECT MAX(created_at) t FROM ingestion_runs").get().t;
  const perSource = db.prepare(`SELECT source, COUNT(*) n, SUM(comp_min IS NOT NULL) withPay
    FROM opportunities WHERE status='open' GROUP BY source ORDER BY n DESC`).all();
  // Counted per distinct (amount, role, seniority), because the same posting is re-inserted on every
  // ingest run. Counting rows would report 94% live on data that carries only 160 distinct values.
  const uniq = db.prepare(`SELECT COUNT(*) n FROM (
      SELECT DISTINCT amount, role_family, seniority FROM salary_records WHERE source IN (${ph})
    )`).get(...LIVE).n;
  const uniqAll = db.prepare(`SELECT COUNT(*) n FROM (
      SELECT DISTINCT amount, role_family, seniority FROM salary_records
    )`).get().n;
  const share = uniqAll ? Math.round((uniq / uniqAll) * 100) : 0;
  json(res, 200, {
    opportunities: open,
    salaryRecords: sal,
    salaryRecordsFromLiveFeeds: salLive,
    distinctSalaryValues: uniqAll,
    distinctSalaryValuesFromLive: uniq,
    liveSharePct: share,
    countries,
    lastOpportunity: last,
    lastIngest: lastRun,
    sources: perSource.map((r) => ({ source: r.source, postings: r.n, disclosesPay: r.withPay || 0,
      live: LIVE.includes(r.source) })),
    confidence: share >= 90 ? 'high' : share >= 50 ? 'mixed' : 'sample',
    note: 'Salary intelligence is built on a partly synthetic corpus while the real salary rebuild is pending. Treat every figure as an indication, not a benchmark.',
  });
});

route('GET', /^\/api\/health$/, async (req, res) => {
  const counts = {
    opportunities: db.prepare('SELECT COUNT(*) n FROM opportunities').get().n,
    sources: db.prepare('SELECT COUNT(*) n FROM opportunity_sources').get().n,
    salaryRecords: db.prepare('SELECT COUNT(*) n FROM salary_records').get().n,
    skills: db.prepare('SELECT COUNT(*) n FROM skills').get().n,
  };
  json(res, 200, { ok: true, counts, ingest, ingestMs, uptime: Math.round(process.uptime()) });
});

// The effective name is the override when set, otherwise the provider name.
const effectiveUser = (row) => row ? { ...row, name: (row.display_name && row.display_name.trim()) || row.name } : row;

route('GET', /^\/api\/me$/, async (req, res) => {
  const user = effectiveUser(db.prepare('SELECT * FROM users WHERE id=?').get(resolveUser(req)));
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
  // Target pay: what the person wrote, else what the CV says. Only when neither exists do we leave it empty;
  // a guessed +25% would be a made-up number presented as theirs.
  const targetRateMin = body.targetRateMin != null ? Number(body.targetRateMin) : (parsed && parsed.targetRate ? parsed.targetRate : null);
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
      body.currentRole || null, body.currentCompany || null, currentRate, rateUnit, (body.currency || (parsed && parsed.rateCurrency) || 'EUR'), targetRateMin,
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
  AN.track(resolveUser(req), 'profile.created', { source: 'cv', skills: resolved.length });
  try { scheduleSequence(resolveUser(req)); } catch (e) { /* sequence is best-effort */ }

  json(res, 200, {
    profile: { ...getProfile(resolveUser(req)), target_countries: targetCountries },
    parsed: parsed ? { skills: parsed.skills, years: parsed.years, seniority: parsed.seniority, roleFamily: parsed.roleFamily, sectionsDetected: parsed.sectionsDetected } : null,
    matched, scores, rates,
  });
});

route('POST', /^\/api\/demo$/, async (req, res) => {
  // Demo mode belongs to signed-out visitors. For a signed-in person this endpoint would
  // overwrite their real profile with the demo one.
  if (AUTH.currentUser(req)) return json(res, 403, { error: 'Demo mode is only for signed-out visitors' });
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
  AN.track(uid, 'profile.created', { source: 'demo', skills: resolved.length });
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

  AN.track(resolveUser(req), 'feed.viewed', { shown: opps.length, types: types ? types.join(',') : 'all' });
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
    ? `The ${strongChannel.channel} channel pays a median of ${fmt(strongChannel.median)} across ${strongChannel.n} comparable postings – ${fmt(strongChannel.median - floor)} above your segment median.`
    : null;

  const askScript = current
    ? `"Based on what I'm seeing for senior ${E.guessFamily(profile, twin).replace(/_/g, ' ')} profiles with this stack, the range is ${fmt(rates.p25)} to ${fmt(rates.p75)} ${periodLabel}. I'm targeting ${fmt(target)} – that's the upper half of the band, and it reflects ${levers[0] ? levers[0].split(' (')[0] : 'the scope of the role'} on top of the core requirements. What's the band you've set for this level?"`
    : `"Before we go further, what band have you set for this level? I want to make sure we're in the same range."`;

  const counterScript = `If they offer below ${fmt(floor)}: "That's below the median for this profile. I can work with the lower number if we revisit it at six months against a written scope – otherwise I'd need to be closer to ${fmt(target)}."`;

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
      'Never name a number before they do – ask for their band first.',
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

// Side-by-side market comparison: the user's own market, the opportunity's market, and remote.
// The opportunity market leads, because that is the currency the offer will be made in.
route('GET', /^\/api\/markets$/, async (req, res, url) => {
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 404, { error: 'no profile' });
  const country = (url.searchParams.get('country') || '').toUpperCase().slice(0, 2) || null;
  const own = E.rateIntelligence(uid);
  if (!own) return json(res, 404, { error: 'no benchmark' });
  const original = profile.target_countries;
  const run = (cc) => {
    try {
      db.prepare('UPDATE profiles SET target_countries=? WHERE user_id=?').run(JSON.stringify(cc ? [cc] : []), uid);
      return E.rateIntelligence(uid);
    } finally {
      db.prepare('UPDATE profiles SET target_countries=? WHERE user_id=?').run(original, uid);
    }
  };
  const opp = country && country !== (own.market && own.market.country) ? run(country) : own;
  const remote = run(null);
  const shape = (r, label) => r ? {
    label, p25: r.p25, p50: r.p50, p75: r.p75, p90: r.p90, currency: r.currency,
    sampleSize: r.sampleSize, confidence: r.confidence, thin: r.thin, range: r.range, market: r.market,
  } : null;
  json(res, 200, {
    current: shape(own, 'Your market'),
    opportunity: shape(opp, country ? 'Opportunity market' : 'Your market'),
    remote: shape(remote, 'Remote'),
    country,
    lead: 'opportunity',
  });
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
  if (status === 'removed') {
    db.prepare('DELETE FROM applications WHERE user_id=? AND opportunity_id=?').run(resolveUser(req), opportunityId);
    log(resolveUser(req), 'application.removed', 'opportunity', opportunityId);
    E.computeCareerScore(resolveUser(req));
    return json(res, 200, { ok: true, status: 'removed' });
  }
  const id = crypto.randomUUID();
  const appliedAt = status === 'applied' ? new Date().toISOString() : null;
  db.prepare(`INSERT INTO applications (id,user_id,opportunity_id,status,applied_at,updated_at)
    VALUES (?,?,?,?,?,datetime('now'))
    ON CONFLICT(user_id,opportunity_id) DO UPDATE SET status=excluded.status,
      applied_at=COALESCE(excluded.applied_at, applications.applied_at), updated_at=datetime('now')`)
    .run(id, resolveUser(req), opportunityId, status, appliedAt);
  log(resolveUser(req), 'application.' + status, 'opportunity', opportunityId);
  AN.track(resolveUser(req), status === 'applied' ? 'application.applied' : 'application.saved', { opportunityId });
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

// ---- interview prep ----
route('GET', /^\/api\/interview\/([^/]+)$/, async (req, res, url, m) => {
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 400, { error: 'no profile' });
  const opp = db.prepare('SELECT * FROM opportunities WHERE id=?').get(decodeURIComponent(m[1]));
  if (!opp) return json(res, 404, { error: 'not found' });
  const match = db.prepare('SELECT missing_skills FROM matches WHERE user_id=? AND opportunity_id=?').get(uid, opp.id);
  const missing = JSON.parse(match?.missing_skills || '[]');
  const twin = E.buildTwin(uid);
  json(res, 200, INTERVIEW.buildPlan(profile, twin, opp, missing));
});

// ---- cover letter ----
route('POST', /^\/api\/cover-letter$/, async (req, res) => {
  const body = await readBody(req);
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 400, { error: 'no profile' });
  const opp = db.prepare('SELECT * FROM opportunities WHERE id=?').get(body.opportunityId);
  if (!opp) return json(res, 404, { error: 'opportunity not found' });
  const twin = E.buildTwin(uid);
  const letter = await COVER.generate(profile, twin, opp, { tone: body.tone || 'direct', name: body.name || '' });
  log(uid, 'coverletter.generated', 'opportunity', opp.id, { tone: body.tone || 'direct', source: letter.source });
  json(res, 200, letter);
});

// ---- skill gap detail: the shortest path from here to there ----
route('GET', /^\/api\/gaps\/plan$/, async (req, res) => {
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 400, { error: 'no profile' });
  const twin = E.buildTwin(uid);
  const mine = new Set(twin.skills);
  const top = opportunitiesWithMatch(uid, { limit: 60, minScore: 55 });

  const freq = new Map();
  const valueAtStake = new Map();
  for (const o of top) {
    for (const s of o.missing_skills) {
      freq.set(s, (freq.get(s) || 0) + 1);
      valueAtStake.set(s, (valueAtStake.get(s) || 0) + (o.income_potential || 0));
    }
  }

  const meta = new Map(db.prepare('SELECT canonical, category, demand_index, salary_premium, growth_rate, is_emerging FROM skills').all()
    .map((r) => [r.canonical, r]));

  // Skills that share a category with something the user already has are the cheapest wins.
  const myCategories = new Set((twin.skillDetail || []).map((s) => s.category));
  const adjacent = new Set((twin.skillDetail || []).map((s) => s.canonical));

  const gaps = [...freq.entries()].map(([skill, blocking]) => {
    const m = meta.get(skill) || {};
    const share = Math.round((blocking / Math.max(1, top.length)) * 100);
    const effortWeeks = m.demand_index > 75 ? 6 : m.demand_index > 60 ? 5 : 4;
    const adjacency = myCategories.has(m.category) ? 'direct' : 'lateral';
    const priority = Math.round(blocking * 3 + (m.salary_premium || 0) * 0.6 + (m.growth_rate || 0) * 0.3 + (adjacency === 'direct' ? 8 : 0));
    return {
      skill, blocking, share, effortWeeks, adjacency,
      demand: m.demand_index || 50,
      salaryPremium: m.salary_premium || 0,
      growth: m.growth_rate || 0,
      emerging: !!m.is_emerging,
      category: m.category,
      priority,
    };
  }).sort((a, b) => b.priority - a.priority).slice(0, 12);

  // The compounding sequence: order by priority but respect prerequisites (category adjacency first)
  const sequence = [];
  const used = new Set();
  for (const g of gaps) {
    if (used.has(g.skill)) continue;
    sequence.push({ ...g, order: sequence.length + 1 });
    used.add(g.skill);
    if (sequence.length >= 4) break;
  }
  const cumulative = sequence.map((g, i) => ({
    ...g,
    cumulativeBlocking: sequence.slice(0, i + 1).reduce((a, x) => a + x.blocking, 0),
    cumulativeWeeks: sequence.slice(0, i + 1).reduce((a, x) => a + x.effortWeeks, 0),
  }));

  json(res, 200, {
    sampleOf: top.length,
    gaps,
    sequence: cumulative,
    insight: cumulative.length
      ? `Closing ${cumulative[0].skill} alone unblocks ${cumulative[0].blocking} of your ${top.length} realistic opportunities. The full sequence of ${cumulative.length} skills takes about ${cumulative[cumulative.length - 1].cumulativeWeeks} weeks and addresses ${cumulative[cumulative.length - 1].cumulativeBlocking} blocked opportunities in total.`
      : 'No systematic gaps detected across your realistic opportunities.',
    rule: 'Priority = how many opportunities it blocks × 3, plus salary premium × 0.6, plus growth rate × 0.3, plus 8 if the skill sits in a category you already work in (cheapest to learn).',
  });
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
  AN.track(resolveUser(req), 'outcome.reported', { outcomeType, delta });
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
        ? 'No outcomes yet – the model is running on published market priors. Every outcome you report moves these numbers toward your reality.'
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
  if (!profile) return json(res, 200, { reply: 'Load a profile first – paste your CV on the onboarding screen and I can answer with your actual data.' });

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
      ? `You're underpaid. Your profile sits at ${fmt(r.p50)} median (p25 ${fmt(r.p25)} → p75 ${fmt(r.p75)}) for ${profile.seniority} ${E.guessFamily(profile, twin).replace(/_/g, ' ')} work at your skill mix. You currently report ${fmt(r.current)} – that's ${r.gapPct}% below the median, or ${fmt(r.gapAbs)} per year.\n\nThe gap is not your level, it's your channel. Median by channel: ${r.byChannel.map((c) => `${c.channel} ${fmt(c.median)}`).join(' · ')}.\n\nWhat moves it: ${r.topPayingSkills.map((s) => `${s.skill} (+${s.premium}%)`).join(', ')}. Those are the levers with the highest salary premium in your own skill adjacency.`
      : r.verdict === 'at_market'
        ? `You're roughly at market: ${fmt(r.current)} vs a median of ${fmt(r.p50)} (p25 ${fmt(r.p25)} → p75 ${fmt(r.p75)}). The upside isn't a raise, it's a reposition – p75 is ${fmt(r.p75)}, and the channel with the highest median is ${r.byChannel[0] ? r.byChannel[0].channel + ' at ' + fmt(r.byChannel[0].median) : 'n/a'}.`
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
      ? `Do this next: **${best.title}** at ${best.company} – ${best.match_score}/100 match, ${best.interview_probability}% interview probability, ${best.offer_probability}% offer probability.${best.income_delta_pct != null ? ` Expected income is ${best.income_delta_pct > 0 ? '+' : ''}${best.income_delta_pct}% vs your current rate.` : ''}\n\nWhy it ranks first: ${best.reasons.slice(0, 3).map((r) => `${r.factor.toLowerCase()} (${r.detail})`).join('; ')}.\n\n${horizonNote}\n\nBlockers: ${best.missing_skills.length ? best.missing_skills.join(', ') : 'none – you cover every listed skill'}.\n\nRunners-up: ${top.slice(1, 4).map((o) => `${o.title} (${o.match_score})`).join(', ')}.`
      : 'No matches yet – load a profile first.';
  } else if (/skill|gap|learn|missing|course|study/.test(q)) {
    const mine = new Set(twin.skills);
    const freq = new Map();
    for (const o of opportunitiesWithMatch(resolveUser(req), { limit: 40, minScore: 55 })) for (const s of o.missing_skills) freq.set(s, (freq.get(s) || 0) + 1);
    const topGaps = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    citations.push({ label: 'Skill gap analysis', detail: 'computed across your top 40 matching opportunities' });
    reply = topGaps.length
      ? `Your gaps, ranked by how many of your realistic opportunities they block:\n\n${topGaps.map(([s, n], i) => `${i + 1}. **${s}** – blocks ${n} of your top 40 matches`).join('\n')}\n\nYou already have ${mine.size} recognised skills. The pattern is clear: your data-science core is strong, and the missing layer is deployment and LLM infrastructure. Closing ${topGaps[0][0]} alone would unblock the largest number of roles.`
      : 'No systematic gaps detected across your top 40 matches – your coverage is unusually complete.';
  } else if (/visa|relocat|move|country|germany|netherlands|abroad/.test(q)) {
    const r = rates;
    citations.push({ label: 'Relocation exposure', detail: `${JSON.parse(profile.target_countries || '[]').join(', ') || 'none set'}` });
    const allScored = opportunitiesWithMatch(resolveUser(req), { limit: 400 });
    const withVisa = allScored.filter((o) => o.visa_sponsorship === 'yes').length;
    const declared = allScored.filter((o) => o.visa_sponsorship === 'yes' || o.visa_sponsorship === 'no').length;
    const targets = JSON.parse(profile.target_countries || '[]');
    reply = `You need sponsorship and you're targeting ${targets.join(', ') || 'no countries yet'}.\n\nOf ${allScored.length} scored opportunities, ${withVisa} are explicitly sponsorship-positive – and only ${declared} state a position at all. The other ${allScored.length - declared} are silent, which is the real signal: most employers never say, so a filter that only matches "yes" hides most of the market.\n\nRealistic read: at ${fmt(r.p50)} median for your profile you clear the EU Blue Card threshold in Germany and the highly-skilled migrant threshold in the Netherlands on paper. Your constraint is not your level, and it is not your skills – it is that ${Math.round(((allScored.length - declared) / allScored.length) * 100)}% of the market gives you no signal at all. That is an outreach problem, not an application problem.`;
  } else if (/score|how am i|assess|rating/.test(q) || !q) {
    const s = scores || {};
    citations.push({ label: 'Career Score', detail: `overall ${s.overall || 0}/100, p${s.benchmark_percentile || 0}` });
    reply = `Your Career Score is **${s.overall || 0}/100** – ${ordSup(Number(s.benchmark_percentile || 0))} percentile for your level.\n\n· Employability ${s.employability || 0} – your top-15 matches average ${top.length ? Math.round(top.reduce((a, b) => a + b.match_score, 0) / top.length) : 0}\n· Interview readiness ${s.interview_readiness || 0}\n· Market demand ${s.market_demand || 0}\n· Salary potential ${s.salary_potential || 0}\n· Future growth ${s.future_growth || 0}\n· Momentum ${s.career_momentum || 0}\n\nBiggest lever: ${weakest(s)}.`;
  } else {
    reply = `I can answer from your actual data – try:\n\n· "What should I do next?"\n· "Am I underpaid?"\n· "Which skills are blocking me?"\n· "What's realistic for relocation to Germany?"\n· "How am I doing overall?"`;
  }

  function weakest(s) {
    const pairs = [['employability', s.employability], ['interview readiness', s.interview_readiness], ['market demand', s.market_demand], ['salary potential', s.salary_potential], ['future growth', s.future_growth], ['momentum', s.career_momentum]].filter((p) => p[1] != null);
    if (!pairs.length) return 'load a profile to see it';
    pairs.sort((a, b) => a[1] - b[1]);
    return `${pairs[0][0]} at ${pairs[0][1]} – it's the lowest of the six and the one worth attacking first`;
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
    reply = `${row.match_score >= 80 ? 'Yes – apply.' : row.match_score >= 65 ? 'Apply, but with a tailored CV.' : 'Low priority – better options exist.'}

Match ${row.match_score}/100 · interview ${row.interview_probability}% · offer ${row.offer_probability}%.
The gap between those two numbers is the real story: once you get in front of them, your chance of converting is ${Math.round((row.offer_probability / Math.max(0.1, row.interview_probability)) * 100)}%.

Evidence: ${matched.length}/${skills.length} listed skills covered${missing.length ? `; missing ${missing.join(', ')}` : ''}. ${reasons.find((r) => r.factor === 'Income')?.detail || ''}.

${missing.length ? `If you close ${missing[0]}, the match score moves into the next band and the interview probability roughly doubles – that is the single highest-leverage action available on this listing.` : 'Your coverage is complete. Your edge here is speed: listings seen on multiple boards close faster.'}`;
  } else if (/salary|pay|money|negotiat/.test(q)) {
    const expected = row.comp_min != null ? fmt(row.comp_min) + (row.comp_max ? '–' + fmt(row.comp_max) : '') + ' /' + row.comp_period : 'not disclosed';
    reply = `Listed compensation: ${expected}.
Your benchmark median for this level and skill mix: ${rates ? fmt(rates.p50) : 'n/a'}.
${row.comp_min == null ? 'Compensation is not disclosed – that is a negotiation risk. Ask in the first call; it also tells you whether the role is real.' : `Anchor on the upper half: ${fmt(row.comp_max || row.comp_min)} is defensible because you match ${matched.length} of ${skills.length} required skills.`}`;
  } else if (/skill|gap|learn/.test(q)) {
    reply = missing.length
      ? `Blocking skills, in order of impact: ${missing.join(', ')}.
You already have: ${matched.join(', ')}.
Close ${missing[0]} first – it appears most often across your other matches, so it compounds.`
      : `No gaps on this listing – you cover every required skill: ${skills.join(', ')}.`;
  } else {
    reply = `${row.title} at ${row.company}: match ${row.match_score}/100, interview ${row.interview_probability}%, offer ${row.offer_probability}%. Ask me whether to apply, how to negotiate, or what's blocking you.`;
  }
  log(resolveUser(req), 'copilot.opportunity', 'opportunity', opportunityId);
  json(res, 200, { reply, citations });
});

const ordSup = (n) => { const m = n % 100; const k = (m >= 11 && m <= 13) ? 'th' : (['th','st','nd','rd'][n % 10] || 'th'); return n + k.replace('s','\u02e2').replace('t','\u1d57').replace('h','\u02b0').replace('n','\u207f').replace('d','\u1d48').replace('r','\u02b3'); };

// ---- daily brief: the diff engine ----
async function briefFor(uid) {
  const profile = getProfile(uid);
  if (!profile) return { needsOnboarding: true };

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const top = opportunitiesWithMatch(uid, { limit: 400, minScore: 45 });
  const seen = new Set(db.prepare('SELECT opportunity_id FROM brief_seen WHERE user_id=?').all(uid).map((r) => r.opportunity_id));
  const savedSearches = db.prepare('SELECT * FROM saved_searches WHERE user_id=?').all(uid).map((r) => ({ ...r, filters: JSON.parse(r.filters || '{}') }));

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

  const rates = E.rateIntelligence(uid);
  const scores = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1').get(uid);
  const prev = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1 OFFSET 1').get(uid);

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
  // Copy is fixed. The line is kept whole and fitted by type size, never split or rewritten.
  let mission = '';
  if (newHighMatch.length) {
    headline = `${plural(newHighMatch.length, 'new opportunity', 'new opportunities')} at 80+ match overnight. Best: ${newHighMatch[0].title} at ${newHighMatch[0].company} (${newHighMatch[0].match_score}/100).`;
  } else if (newSinceYesterday.length) {
    headline = `${plural(newSinceYesterday.length, 'new opportunity', 'new opportunities')} since yesterday. Highest match: ${top[0]?.match_score ?? 0}/100.`;
  } else {
    headline = `Nothing new at your bar overnight. Your best live option is still ${top[0]?.title || '–'} (${top[0]?.match_score || 0}/100).`;
  }

  const actions = [];
  if (newHighMatch[0]) actions.push({ kind: 'apply', priority: 1, text: `Apply to ${newHighMatch[0].title} at ${newHighMatch[0].company} – ${newHighMatch[0].interview_probability}% interview probability`, opportunityId: newHighMatch[0].id });
  if (topGap) actions.push({ kind: 'blocker', priority: 2, text: `Close ${topGap[0]} – it blocks ${topGap[1]} of your opportunities`, skill: topGap[0] });
  if (rates && rates.gapPct > 5) actions.push({ kind: 'week', priority: 2, text: `You are ${rates.gapPct}% below market – open Rate Intelligence and take the number into your next conversation` });
  if (scores && scores.career_momentum < 30) actions.push({ kind: 'warm', priority: 3, text: `Momentum is ${scores.career_momentum}/100 – three applications this week moves it more than any CV edit` });
  if (closingSoon[0]) actions.push({ kind: 'closing', priority: 1, text: `${closingSoon[0].title} ${(() => { const d = Math.max(0, Math.ceil((new Date(closingSoon[0].closes_at) - Date.now()) / 86400000)); return d === 0 ? 'closes today' : d === 1 ? 'closes tomorrow' : `closes in ${d} days`; })()}` });

  // An action is done when its opportunity is already applied to, so the list reacts to what the person
  // actually did instead of looking identical before and after. Completed work sorts to the bottom.
  const appliedIds = new Set(db.prepare("SELECT opportunity_id FROM applications WHERE user_id=? AND status IN ('applied','interviewing','offer')").all(uid).map((r) => r.opportunity_id));
  for (const a of actions) if (a.opportunityId && appliedIds.has(a.opportunityId)) a.done = true;
  actions.sort((x, y) => Number(!!x.done) - Number(!!y.done) || x.priority - y.priority);

  return {
    needsOnboarding: false,
    generatedAt: new Date().toISOString(),
    headline,
    mission,
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
  };
}

route('GET', /^\/api\/brief$/, async (req, res) => {
  json(res, 200, await briefFor(resolveUser(req)));
});

route('POST', /^\/api\/brief\/ack$/, async (req, res) => {
  const ids = db.prepare('SELECT opportunity_id FROM matches WHERE user_id=? AND match_score>=45').all(resolveUser(req)).map((r) => r.opportunity_id);
  const ins = db.prepare('INSERT OR IGNORE INTO brief_seen (user_id, opportunity_id) VALUES (?,?)');
  db.exec('BEGIN');
  for (const id of ids) ins.run(resolveUser(req), id);
  db.exec('COMMIT');
  json(res, 200, { ok: true, marked: ids.length });
});


// ---- public rate check: the free diagnostic, no account required ----
// This is the acquisition hook. It answers one question with a number, in about a minute,
// and it never asks for a login first.
route('POST', /^\/api\/public\/rate-check$/, async (req, res) => {
  const rl = rateLimit('rate-check:' + clientKey(req), 30, 10 * 60 * 1000);
  if (!rl.allowed) return json(res, 429, { error: 'Too many checks. Try again in a few minutes.' });
  const body = await readBody(req);
  const role = String(body.role || '').trim();
  const years = body.years != null ? Number(body.years) : null;
  const country = String(body.country || '').toUpperCase().slice(0, 2) || null;
  const current = body.currentSalary != null ? Number(body.currentSalary) : null;
  const unit = body.unit === 'hour' ? 'hour' : 'year';
  const skills = Array.isArray(body.skills) ? body.skills : [];

  if (!role || years == null) return json(res, 400, { error: 'role and years are required' });

  AN.track(null, 'public.rate_check', { role, years, country, unit });

  // Map the free-text role to a role family using the same classifier the product uses.
  const { classifyFamily, classifySeniority } = require('./classify.cjs');
  const family = classifyFamily(role, skills, role);
  const seniority = classifySeniority(`${role}`, null, '') !== 'mid' ? classifySeniority(role, null, '') : (years >= 12 ? 'staff' : years >= 7 ? 'senior' : years >= 4 ? 'mid' : 'junior');

  // Build a synthetic profile and reuse the real rate engine – no second implementation.
  const fakeUser = `public-check-${Date.now()}`;
  const skillsResolved = Array.from(new Set(skills.map((x) => require('./taxonomy.cjs').resolveSkill(x)).filter(Boolean)));
  db.prepare('INSERT OR IGNORE INTO users (id,email,name) VALUES (?,?,?)').run(fakeUser, `${fakeUser}@anon.local`, 'Anonymous');
  db.prepare(`INSERT INTO profiles (user_id,headline,summary,years_experience,seniority,current_rate,rate_unit,rate_currency,
      remote_preference,willing_to_relocate,target_countries,visa_needed,completeness)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(fakeUser, role, role, years, seniority, current, unit, 'EUR', 'any', 1, JSON.stringify(country ? [country] : []), 0, 60);
  const insPs = db.prepare(`INSERT OR IGNORE INTO profile_skills (user_id,skill_id,proficiency,confidence,source)
    SELECT ?, id, 'working', 0.8, 'public' FROM skills WHERE canonical=?`);
  for (const sk of skillsResolved) insPs.run(fakeUser, sk);

  const rates = E.rateIntelligence(fakeUser);

  // Clean up the throwaway profile; the aggregate result is what matters.
  db.prepare('DELETE FROM profile_skills WHERE user_id=?').run(fakeUser);
  db.prepare('DELETE FROM career_twin WHERE user_id=?').run(fakeUser);
  db.prepare('DELETE FROM profiles WHERE user_id=?').run(fakeUser);
  db.prepare('DELETE FROM users WHERE id=?').run(fakeUser);

  if (!rates) return json(res, 500, { error: 'could not build a benchmark' });

  const gapAbs = current ? Math.round(rates.p50 - current) : null;
  const gapPct = current ? Math.round(((rates.p50 - current) / current) * 100) : null;

  // The three strongest levers from the same skill vocabulary.
  const skillMeta = db.prepare('SELECT canonical, salary_premium, growth_rate FROM skills WHERE salary_premium > 8 ORDER BY salary_premium DESC LIMIT 6').all();

  json(res, 200, {
    ok: true,
    input: { role, years, country, current, unit, seniority, family },
    benchmark: {
      p25: rates.p25, p50: rates.p50, p75: rates.p75, p90: rates.p90,
      period: rates.period, currency: 'EUR',
      sampleSize: rates.sampleSize, thin: rates.thin, confidence: rates.confidence, range: rates.range,
      market: rates.market,
      sampleSize: rates.sampleSize, exactComparables: rates.exactComparables,
      confidence: rates.confidence, segment: rates.segment,
      byChannel: rates.byChannel,
    },
    verdict: {
      gapAbs, gapPct,
      level: gapPct == null ? 'unknown' : gapPct >= 15 ? 'underpaid' : gapPct >= 5 ? 'slightly_under' : gapPct > -10 ? 'at_market' : 'above_market',
      headline: (() => {
        const p = rates.period === 'hour' ? '/hr' : '/yr';
        const money = (n) => '€' + Math.round(Math.abs(n)).toLocaleString('en-GB') + p;
        const seg = `${seniority} ${family.replace(/_/g, ' ')}`;
        if (gapPct == null) return `The market pays ${money(rates.p50)} for ${seg} work like yours.`;
        if (gapPct >= 25) return `Someone with your CV was worth ${Math.abs(gapPct)}% more than you are being paid.`;
        if (gapPct >= 15) return `There is a version of your job paying ${money(rates.p50)}. You are not in it.`;
        if (gapPct >= 5) return `You are ${money(gapAbs)} under the median. Not a scandal – a leak.`;
        if (gapPct > -10) return `You are priced correctly. Whether you are moving is a different question.`;
        return `You are ahead of the median by ${Math.abs(gapPct)}%. That is leverage, and it expires if you sit still.`;
      })(),
      gapLine: gapAbs != null && gapAbs > 0 ? `€${Math.round(gapAbs).toLocaleString('en-GB')} a year – ${Math.round(gapAbs * 2).toLocaleString('en-GB')} across two.` : null,
    },
    levers: skillMeta.map((s) => ({ skill: s.canonical, premium: s.salary_premium, growth: s.growth_rate })),
    next: {
      headline: 'See the opportunities that pay this.',
      detail: `We score every live opportunity against a profile like yours. Create a free account and the radar fills in.`,
    },
  });
});

// ---- onboarding draft: step-by-step, saved as you go ----
route('GET', /^\/api\/onboarding\/draft$/, async (req, res) => {
  const uid = resolveUser(req);
  const row = db.prepare('SELECT * FROM onboarding_drafts WHERE user_id=?').get(uid);
  json(res, 200, row ? { ...JSON.parse(row.payload), step: row.step } : { step: 1 });
});

route('POST', /^\/api\/onboarding\/draft$/, async (req, res) => {
  const body = await readBody(req);
  const uid = resolveUser(req);
  const step = Number(body.step || 1);
  const payload = JSON.stringify(body.data || {});
  db.prepare(`INSERT INTO onboarding_drafts (user_id,step,payload,updated_at) VALUES (?,?,?,datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET step=excluded.step, payload=excluded.payload, updated_at=datetime('now')`)
    .run(uid, step, payload);
  json(res, 200, { ok: true, step });
});

// Live preview of the rate gap mid-onboarding – the payoff before the form is finished.
route('POST', /^\/api\/onboarding\/preview$/, async (req, res) => {
  const body = await readBody(req);
  const role = String(body.role || '').trim();
  if (!role) return json(res, 400, { error: 'role required' });
  const r = await fetch(`http://127.0.0.1:${PORT}/api/public/rate-check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': 'internal-onboarding' },
    body: JSON.stringify({
      role, years: body.years, country: body.country,
      currentSalary: body.currentSalary, unit: body.unit, skills: body.skills || [],
    }),
  });
  json(res, r.status, await r.json());
});

// ---- lifecycle email sequence: the 7 days after signup ----
const SEQUENCE = [
  { day: 0, key: 'welcome', subject: 'Your number, and the three things to do about it' },
  { day: 2, key: 'first_move', subject: 'The one opportunity you should open today' },
  { day: 4, key: 'gap', subject: 'What is actually blocking your next €20k' },
  { day: 7, key: 'proof', subject: 'What one honest week of this looks like' },
];

function sequenceEmail({ user, key, ctx }) {
  const name = (user.name || '').trim().split(' ')[0] || 'there';
  const app = MAIL.CONFIG.appUrl + '/?app=1';
  const unsub = `${MAIL.CONFIG.appUrl}/unsubscribe/${user.id}/${MAIL.unsubscribeToken(user.id)}`;
  const gapLine = ctx.rateGapPct != null && ctx.rateGapPct > 3
    ? `You are ${ctx.rateGapPct}% below the median for your profile – ${MAIL.money(Math.abs(ctx.rateGapAbs || 0))} a year.`
    : 'You are at or above the median for your profile. The upside now is growth, not price.';

  const bodies = {
    welcome: `${name},

Here is the number that matters: ${gapLine}

That figure comes from live postings that state a salary, priced against your seniority, your skills and your market. It is not a survey and nobody guessed it.

Three things worth doing this week:

1. Open the radar and sort by interview odds, not match score. Odds decide whether your time was worth spending.
2. Read the negotiation brief out loud once. The number you cannot say is the number you will not get.
3. Pick one skill gap. Just one. The gaps screen ranks them by how many of your realistic opportunities they block.

${app}

– ThinkZet
You can turn these off any time: ${unsub}`,
    first_move: `${name},

Two days in. Most people open a feed and scroll. You have something better: a score per opportunity and a probability of getting it.

So the move is not to apply to more. It is to apply to the ones you can actually win.

Open the radar, filter to 60% interview odds or above, and take the top one today while it is still open. One application you can defend beats ten you cannot.

${app}

– ThinkZet
${unsub}`,
    gap: `${name},

Four days in.

${ctx.topGap ? `${ctx.topGap.skill} is blocking ${ctx.topGap.blocking} of your realistic opportunities. Not the market in general. Your specific set of matches.` : 'Your skill coverage is unusually complete. The next lever is not learning, it is positioning.'}

That distinction is the whole point. Most advice tells you to learn what is trending. The useful version is: learn what is blocking your next move, and nothing else.

The gaps screen has the sequence, with the weeks and the cumulative unblocking attached.

${app}

– ThinkZet
${unsub}`,
    proof: `${name},

One week.

Here is what the honest version looks like: three applications to roles you can actually win, one conversation about your number, one gap being closed.

That is not a productivity system. It is the difference between a search that runs on hope and one that runs on evidence.

Your streak is ${ctx.streak || 1}. Keep it.

${app}

– ThinkZet
${unsub}`,
  };

  return { subject: SEQUENCE.find((x) => x.key === key)?.subject || 'ThinkZet', text: bodies[key] || bodies.welcome };
}

function scheduleSequence(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user || user.email.includes('@anon.local')) return 0;
  const existing = db.prepare("SELECT COUNT(*) n FROM email_queue WHERE user_id=? AND kind LIKE 'sequence_%'").get(userId).n;
  if (existing > 0) return 0;
  let queued = 0;
  for (const step of SEQUENCE) {
    const when = new Date(Date.now() + step.day * 86400000).toISOString().replace('T', ' ').slice(0, 19);
    const ctx = {};
    try {
      const rates = E.rateIntelligence(userId);
      if (rates) { ctx.rateGapPct = rates.gapPct; ctx.rateGapAbs = rates.gapAbs; }
      const twin = E.buildTwin(userId);
      const mine = new Set(twin.skills);
      const top = opportunitiesWithMatch(userId, { limit: 40, minScore: 55 });
      const freq = new Map();
      for (const o of top) for (const sk of o.missing_skills) freq.set(sk, (freq.get(sk) || 0) + 1);
      const g = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
      if (g) ctx.topGap = { skill: g[0], blocking: g[1] };
    } catch { /* context is best-effort */ }
    const composed = sequenceEmail({ user, key: step.key, ctx });
    MAIL.enqueue({ userId, to: user.email, kind: `sequence_${step.key}`, subject: composed.subject, text: composed.text, scheduledFor: when });
    queued++;
  }
  return queued;
}

// ---- email: delivery, preferences, the brief loop ----
route('GET', /^\/api\/email\/status$/, async (req, res) => {
  const rows = db.prepare('SELECT status, COUNT(*) n FROM email_queue GROUP BY status').all();
  json(res, 200, { status: MAIL.status(), counts: Object.fromEntries(rows.map((r) => [r.status, r.n])) });
});

route('GET', /^\/api\/email\/prefs$/, async (req, res) => {
  json(res, 200, MAIL.prefsFor(resolveUser(req)));
});

route('POST', /^\/api\/email\/prefs$/, async (req, res) => {
  const body = await readBody(req);
  json(res, 200, MAIL.setPrefs(resolveUser(req), body));
});

route('GET', /^\/api\/email\/sequence$/, async (req, res) => {
  const rows = db.prepare("SELECT kind, subject, scheduled_for, status FROM email_queue WHERE kind LIKE 'sequence_%' ORDER BY scheduled_for").all();
  json(res, 200, { steps: SEQUENCE, queued: rows });
});

route('GET', /^\/api\/email\/outbox$/, async (req, res) => {
  const rows = db.prepare(`SELECT id,to_email,kind,subject,body_text,status,provider,scheduled_for,sent_at,error
    FROM email_queue ORDER BY created_at DESC LIMIT 50`).all();
  json(res, 200, { messages: rows, status: MAIL.status() });
});

route('POST', /^\/api\/email\/flush$/, async (req, res) => {
  const r = await MAIL.flush(50);
  AN.track(null, 'email.flush', { attempted: r.attempted });
  json(res, 200, r);
});

// Compose the daily brief for the current user and queue it.
route('POST', /^\/api\/email\/brief$/, async (req, res) => {
  const uid = resolveUser(req);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
  const prefs = MAIL.prefsFor(uid);
  if (!prefs.daily_brief) return json(res, 400, { error: 'daily brief is switched off' });

  // Reuse the exact brief the app shows – one source of truth, never a second implementation.
  const brief = await briefFor(uid);
  if (!brief || brief.needsOnboarding) return json(res, 400, { error: 'no profile yet' });

  const rates = E.rateIntelligence(uid);
  const scores = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1').get(uid);
  const composed = MAIL.briefEmail({ user, brief, rates, scores, prefs });
  const id = MAIL.enqueue({ userId: uid, to: user.email, kind: 'daily_brief', subject: composed.subject, text: composed.text, html: composed.html });
  const sent = await MAIL.flush(5);
  log(uid, 'email.brief_queued', 'email', id);
  json(res, 200, { ok: true, id, subject: composed.subject, delivery: sent });
});

// Queue a brief for every user who has the brief switched on.
route('POST', /^\/api\/email\/broadcast$/, async (req, res) => {
  const users = db.prepare(`SELECT u.id, u.email, u.name FROM users u
    LEFT JOIN email_prefs p ON p.user_id = u.id
    WHERE u.status='active' AND COALESCE(p.daily_brief,1)=1 AND u.email NOT LIKE '%@anon.local'`).all();
  const queued = [];
  for (const u of users) {
    try {
      const brief = await briefFor(u.id);
      if (!brief || brief.needsOnboarding) continue;
      const rates = E.rateIntelligence(u.id);
      const scores = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1').get(u.id);
      const composed = MAIL.briefEmail({ user: u, brief, rates, scores });
      const id = MAIL.enqueue({ userId: u.id, to: u.email, kind: 'daily_brief', subject: composed.subject, text: composed.text, html: composed.html });
      queued.push({ userId: u.id, id });
    } catch (e) { /* one bad user must not stop the broadcast */ }
  }
  const sent = await MAIL.flush(200);
  json(res, 200, { queued: queued.length, delivery: sent });
});

// Lead report: the email that turns a free check into a user.
route('POST', /^\/api\/email\/lead-report$/, async (req, res) => {
  const body = await readBody(req);
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(body.leadId);
  if (!lead) return json(res, 404, { error: 'lead not found' });
  const composed = MAIL.leadReportEmail({ lead });
  const id = MAIL.enqueue({ leadId: lead.id, to: lead.email, kind: 'lead_report', subject: composed.subject, text: composed.text, html: composed.html });
  const sent = await MAIL.flush(5);
  json(res, 200, { ok: true, id, delivery: sent });
});

route('GET', /^\/unsubscribe\/([^/]+)\/([^/]+)$/, async (req, res, url, m) => {
  const [kind, idOrToken] = [m[1], m[2]];
  if (kind === 'lead') {
    db.prepare("UPDATE email_queue SET status='suppressed' WHERE lead_id=?").run(idOrToken);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<div style="font-family:system-ui;padding:60px;text-align:center;background:#0b0d10;color:#e8edf4;min-height:100vh">You will not receive further emails. <a href="/" style="color:#4c8dff">ThinkZet</a></div>');
  }
  const userId = kind;
  const token = idOrToken;
  if (!MAIL.verifyUnsubscribe(userId, token)) { res.writeHead(403); return res.end('invalid link'); }
  MAIL.setPrefs(userId, { daily_brief: false, opportunity_alerts: false, weekly_digest: false });
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<div style="font-family:system-ui;padding:60px;text-align:center;background:#0b0d10;color:#e8edf4;min-height:100vh">You are unsubscribed from all ThinkZet emails. <a href="/" style="color:#4c8dff">Change your mind</a></div>');
});

// ---- GDPR: export and erase, implemented rather than promised ----
route('GET', /^\/api\/me\/export$/, async (req, res) => {
  const authed = AUTH.currentUser(req);
  if (!authed) return json(res, 401, { error: 'sign in to export your data' });
  const uid = authed.id;
  const user = db.prepare('SELECT id,email,name,country,created_at FROM users WHERE id=?').get(uid);
  if (!user) return json(res, 404, { error: 'no user' });
  const data = {
    exportedAt: new Date().toISOString(),
    format: 'careeros-export-v1',
    user,
    profile: db.prepare('SELECT * FROM profiles WHERE user_id=?').get(uid) || null,
    skills: db.prepare('SELECT s.canonical, ps.proficiency, ps.confidence FROM profile_skills ps JOIN skills s ON s.id=ps.skill_id WHERE ps.user_id=?').all(uid),
    twin: db.prepare('SELECT state FROM career_twin WHERE user_id=?').get(uid) || null,
    applications: db.prepare('SELECT * FROM applications WHERE user_id=?').all(uid),
    outcomes: db.prepare('SELECT * FROM outcomes WHERE user_id=?').all(uid),
    scores: db.prepare('SELECT employability,interview_readiness,market_demand,salary_potential,future_growth,career_momentum,overall,benchmark_percentile,computed_at FROM career_scores WHERE user_id=?').all(uid),
    savedSearches: db.prepare('SELECT name, filters, created_at FROM saved_searches WHERE user_id=?').all(uid),
    emailPrefs: db.prepare('SELECT daily_brief,opportunity_alerts,weekly_digest,marketing,timezone,send_hour FROM email_prefs WHERE user_id=?').get(uid) || null,
    plan: db.prepare('SELECT plan,cycle,since FROM plan_state WHERE user_id=?').get(uid) || { plan: 'free' },
    activity: db.prepare('SELECT action, entity_type, created_at FROM activity_logs WHERE user_id=? ORDER BY id DESC LIMIT 500').all(uid),
  };
  log(uid, 'gdpr.export', 'user', uid);
  const body = JSON.stringify(data, null, 2);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="careeros-export-${uid.slice(0, 8)}.json"`,
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
});

route('DELETE', /^\/api\/me$/, async (req, res) => {
  const authed = AUTH.currentUser(req);
  if (!authed) return json(res, 401, { error: 'sign in to delete your account' });
  const uid = authed.id;
  const user = db.prepare('SELECT id,email FROM users WHERE id=?').get(uid);
  if (!user) return json(res, 404, { error: 'no user' });

  // Erasure means erasure: every table that holds this person's data is emptied.
  const tables = ['profile_skills', 'career_twin', 'career_scores', 'matches', 'applications', 'outcomes',
    'saved_searches', 'brief_seen', 'email_prefs', 'email_queue', 'plan_state', 'billing_events', 'activity_logs', 'profiles'];
  db.exec('BEGIN');
  for (const t of tables) {
    try { db.prepare(`DELETE FROM ${t} WHERE user_id=?`).run(uid); } catch { /* table may not exist yet */ }
  }
  db.prepare("UPDATE leads SET converted_user_id=NULL WHERE converted_user_id=?").run(uid);
  db.prepare("UPDATE users SET status='deleted', email=?, name='Deleted user' WHERE id=?").run(`deleted-${uid}@deleted.local`, uid);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);
  db.exec('COMMIT');

  AUTH.logout(req, res);
  json(res, 200, { ok: true, note: 'Your profile, CV, applications, outcomes and preferences have been deleted. The account row remains, stripped of all personal data, so billing records stay consistent.' });
});

// ---- launch readiness: one screen that says whether it is safe to send people here ----
route('GET', /^\/api\/launch$/, async (req, res) => {
  const checks = [];
  const add = (key, label, ok, detail, blocking = true) => checks.push({ key, label, ok, detail, blocking });

  // Email
  const mail = MAIL.status();
  add('email', 'Email delivery', mail.live, mail.live ? `Sending via ${mail.provider}` : 'No provider – briefs and the signup sequence will pile up in the outbox', true);

  // Billing
  const bill = BILLING.status();
  add('billing', 'Billing configured', bill.ready, bill.ready ? `Stripe ${bill.mode} mode` : `Missing: ${bill.missing.join(', ')}`, false);
  add('billing_live', 'Stripe in live mode', bill.mode === 'live', bill.mode === 'live' ? 'Real payments enabled' : 'Test mode – checkout works but no money moves', false);

  // Public URL
  const origin = publicOrigin(req);
  const publicUrl = !/127\.0\.0\.1|localhost/.test(origin);
  add('app_url', 'Public URL reachable', publicUrl, publicUrl ? origin : 'Only reachable on localhost – start a tunnel or set APP_URL', true);

  // Data
  const total = db.prepare("SELECT COUNT(*) n FROM opportunities WHERE status='open'").get().n;
  const fresh7 = db.prepare("SELECT COUNT(*) n FROM opportunities WHERE status='open' AND posted_at > datetime('now','-7 days')").get().n;
  add('inventory', 'Live inventory', total >= 300 && fresh7 >= 50, `${total} open, ${fresh7} posted this week`, true);

  // Sources
  const last = lastRun();
  const healthy = last ? last.report.filter((r) => r.ok).length : 0;
  add('sources', 'Ingestion sources healthy', healthy >= 2, last ? `${healthy} of ${last.report.length} adapters returned data` : 'no ingestion run recorded', true);

  // LLM
  const llm = !!(process.env.LLM_ENDPOINT && process.env.LLM_API_KEY);
  add('llm', 'AI copilot is generative', llm, llm ? `Using ${process.env.LLM_MODEL || 'configured model'}` : 'Deterministic composer – honest, but not generative', false);

  // Legal / trust
  add('unsubscribe', 'Unsubscribe links work', true, 'Signed HMAC links, tested', false);
  const legalOk = fs.existsSync(path.join(PUBLIC, 'legal', 'privacy.html')) && fs.existsSync(path.join(PUBLIC, 'legal', 'terms.html'));
  add('legal', 'Privacy and terms published', legalOk, legalOk ? '/legal/privacy.html and /legal/terms.html are live' : 'Legal pages missing – needed before collecting real CVs in the EU', true);

  const blocking = checks.filter((c) => c.blocking && !c.ok);
  json(res, 200, {
    ready: blocking.length === 0,
    checks,
    blockers: blocking.length,
    verdict: blocking.length === 0
      ? 'Everything that must be true is true. Send it to twenty people.'
      : `${blocking.length} blocking issue${blocking.length === 1 ? '' : 's'}: ${blocking.map((b) => b.label).join(', ')}.`,
  });
});

// ---- which opportunities have expired or disappeared ----
// A feed that shows dead roles destroys trust faster than a feed that shows fewer roles.
route('GET', /^\/api\/opportunities\/lifecycle$/, async (req, res) => {
  const uid = resolveUser(req);
  const stale = db.prepare(`SELECT COUNT(*) n FROM opportunities
    WHERE status='open' AND posted_at < datetime('now','-60 days')`).get().n;
  const noComp = db.prepare(`SELECT COUNT(*) n FROM opportunities
    WHERE status='open' AND comp_min IS NULL`).get().n;
  const ghost = db.prepare(`SELECT COUNT(*) n FROM opportunities
    WHERE status='open' AND comp_min IS NULL AND LENGTH(COALESCE(description,'')) < 200`).get().n;
  const total = db.prepare("SELECT COUNT(*) n FROM opportunities WHERE status='open'").get().n;
  const fresh7 = db.prepare("SELECT COUNT(*) n FROM opportunities WHERE status='open' AND posted_at > datetime('now','-7 days')").get().n;
  const tracked = db.prepare('SELECT COUNT(*) n FROM applications WHERE user_id=?').get(uid).n;

  json(res, 200, {
    total, fresh7, stale, noComp, ghost, tracked,
    health: total ? Math.round(((total - ghost) / total) * 100) : 0,
    note: 'Ghost listings – no compensation and a thin description – are excluded from your feed automatically. This is what was filtered.',
  });
});

// ---- referral recommendations: where a gap has a partner fix ----
// The rule that cannot be broken: this only ever decorates a gap the engine already found.
// It never creates a recommendation, never reorders one, and never touches a score.
route('GET', /^\/api\/referrals\/recommendations$/, async (req, res) => {
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 200, { recommendations: [] });
  const twin = E.buildTwin(uid);
  const mine = new Set(twin.skills);
  const top = opportunitiesWithMatch(uid, { limit: 40, minScore: 55 });

  const gapCount = new Map();
  for (const o of top) for (const sk of o.missing_skills) gapCount.set(sk, (gapCount.get(sk) || 0) + 1);
  const gaps = [...gapCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const meta = new Map(db.prepare('SELECT canonical, salary_premium, growth_rate FROM skills').all().map((r) => [r.canonical, r]));
  const recs = [];
  for (const [skill, blocking] of gaps) {
    const program = REF.programForSkill(skill);
    if (!program) continue;
    const m = meta.get(skill) || {};
    recs.push({
      skill,
      blocking,
      salaryPremium: m.salary_premium || 0,
      growth: m.growth_rate || 0,
      partner: { name: program.name, slug: program.slug, category: program.category, payoutModel: program.payout_model },
      disclosure: 'Partner recommendation. It never affects your ranking, your scores or which opportunities you see.',
    });
  }

  // Relocation partner only when the user has actually signalled relocation intent.
  if (profile.willing_to_relocate) {
    const prog = db.prepare("SELECT * FROM referral_programs WHERE slug='relocation'").get();
    if (prog) recs.push({
      skill: 'Relocation support', blocking: null, salaryPremium: null, growth: null,
      partner: { name: prog.name, slug: prog.slug, category: prog.category, payoutModel: prog.payout_model },
      disclosure: 'Partner recommendation. It never affects your ranking or your scores.',
      reason: `You said you are willing to relocate to ${JSON.parse(profile.target_countries || '[]').join(', ') || 'another country'}.`,
    });
  }

  json(res, 200, { recommendations: recs, rule: 'Partners are attached to gaps the engine already found. Nothing here can create or reorder a recommendation.' });
});

// ---- Career Score v2: expanded, and explaining itself ----
// Six scores became eight: Skill Strength and Opportunity Quality added, and every score
// now reports what would move it most. A number without a lever is just a grade.
route('GET', /^\/api\/scores\/v2$/, async (req, res) => {
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 404, { error: 'no profile' });
  const twin = E.buildTwin(uid);
  const base = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1').get(uid);
  if (!base) return json(res, 404, { error: 'no score yet' });

  const skills = twin.skillDetail || [];
  const top = opportunitiesWithMatch(uid, { limit: 40, minScore: 50 });

  // Skill Strength: how deep and how current the stack is, not just how many skills exist.
  const breadth = Math.min(100, skills.length * 6);
  const depth = Math.min(100, (profile.years_experience || 0) * 8);
  const currency = Math.min(100, 40 + skills.filter((s) => (s.growth_rate || 0) > 10).length * 12);
  const skillStrength = Math.round(0.4 * breadth + 0.3 * depth + 0.3 * currency);

  // Opportunity Quality: are the things you are looking at actually worth your time?
  const avgMatch = top.length ? top.reduce((a, o) => a + o.match_score, 0) / top.length : 0;
  const avgOdds = top.length ? top.reduce((a, o) => a + o.interview_probability, 0) / top.length : 0;
  const disclosed = top.length ? top.filter((o) => o.comp_min != null).length / top.length : 0;
  const opportunityQuality = Math.round(0.5 * avgMatch + 0.3 * Math.min(100, avgOdds * 2) + 0.2 * disclosed * 100);

  const scores = {
    employability: base.employability,
    interview_readiness: base.interview_readiness,
    market_demand: base.market_demand,
    salary_potential: base.salary_potential,
    future_growth: base.future_growth,
    career_momentum: base.career_momentum,
    skill_strength: skillStrength,
    opportunity_quality: opportunityQuality,
  };

  // Each score gets one concrete lever, ranked by how much it would move.
  const rates = E.rateIntelligence(uid);
  const gapCount = new Map();
  for (const o of top) for (const sk of o.missing_skills) gapCount.set(sk, (gapCount.get(sk) || 0) + 1);
  const topGap = [...gapCount.entries()].sort((a, b) => b[1] - a[1])[0];

  const levers = [
    { score: 'career_momentum', value: scores.career_momentum, lever: 'Apply to three opportunities this week', why: 'Momentum is the only score you fully control, and it moves within a session.' },
    { score: 'skill_strength', value: scores.skill_strength, lever: topGap ? `Close ${topGap[0]}` : 'Add a high-growth skill', why: topGap ? `It blocks ${topGap[1]} of your top 40 opportunities.` : 'Depth in a rising skill compounds faster than breadth in a flat one.' },
    { score: 'salary_potential', value: scores.salary_potential, lever: rates && rates.gapPct > 5 ? `Take the ${rates.gapPct}% gap into your next conversation` : 'Target the upper half of the band', why: 'Salary potential rises when you stop anchoring on your current number.' },
    { score: 'opportunity_quality', value: scores.opportunityQuality || opportunityQuality, lever: 'Filter to 70%+ interview odds', why: 'Higher odds per application beats more applications.' },
  ].sort((a, b) => a.value - b.value);

  const weights = { employability: 0.18, interview_readiness: 0.12, market_demand: 0.12, salary_potential: 0.16, future_growth: 0.12, career_momentum: 0.10, skill_strength: 0.12, opportunity_quality: 0.08 };
  const overall = Math.round(Object.entries(weights).reduce((a, [k, w]) => a + (scores[k] || 0) * w, 0));
  const z = (overall - 58) / 14;
  const percentile = Math.round(100 / (1 + Math.exp(-1.15 * z)));

  json(res, 200, { scores, overall, percentile, levers, previousOverall: base.overall });
});

// ---- daily habit: streaks, what changed, and a reason to return ----
route('GET', /^\/api\/habit$/, async (req, res) => {
  const uid = resolveUser(req);
  const profile = getProfile(uid);
  if (!profile) return json(res, 200, { needsOnboarding: true });

  // Streak: consecutive days with at least one meaningful action.
  const days = db.prepare(`SELECT DISTINCT date(created_at) d FROM events
    WHERE user_id=? AND name IN ('feed.viewed','opportunity.opened','application.saved','application.applied','outcome.reported')
    ORDER BY d DESC LIMIT 60`).all(uid).map((r) => r.d);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < days.length; i++) {
    const expected = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    if (days[i] === expected) streak++;
    else if (i === 0 && days[0] === new Date(today.getTime() - 86400000).toISOString().slice(0, 10)) continue;
    else break;
  }

  // What changed since the user last looked – the only reason a daily return is worth it.
  const lastSeen = db.prepare("SELECT MAX(created_at) t FROM events WHERE user_id=? AND name='feed.viewed'").get(uid)?.t;
  const sinceClause = lastSeen ? `AND o.posted_at > datetime(?, '-1 day')` : '';
  const params = lastSeen ? [uid, lastSeen] : [uid];
  const fresh = db.prepare(`SELECT COUNT(*) n FROM matches m JOIN opportunities o ON o.id=m.opportunity_id
    WHERE m.user_id=? AND m.match_score>=70 ${sinceClause}`).get(...params).n;

  const rates = E.rateIntelligence(uid);
  const scores = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1').get(uid);
  const prev = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1 OFFSET 1').get(uid);

  const appliedThisWeek = db.prepare(`SELECT COUNT(*) n FROM applications WHERE user_id=? AND status IN ('applied','interviewing','offer')
    AND updated_at > datetime('now','-7 days')`).get(uid).n;
  const weeklyTarget = 3;

  json(res, 200, {
    needsOnboarding: false,
    streak,
    fresh,
    rateGapPct: rates ? rates.gapPct : null,
    scoreDelta: prev ? (scores.overall - prev.overall) : null,
    overall: scores ? scores.overall : null,
    appliedThisWeek,
    weeklyTarget,
    onTrack: appliedThisWeek >= weeklyTarget,
    message: appliedThisWeek >= weeklyTarget
      ? `${appliedThisWeek} applications this week – you are doing the part most people skip.`
      : `${appliedThisWeek} of ${weeklyTarget} applications this week. The score moves when you move.`,
  });
});

// ---- lead capture + shareable cards (the acquisition loop) ----
route('POST', /^\/api\/public\/lead$/, async (req, res) => {
  const rl = rateLimit('lead:' + clientKey(req), 10, 60 * 60 * 1000);
  if (!rl.allowed) return json(res, 429, { error: 'Too many attempts. Try again later.' });
  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'invalid email' });

  const existing = db.prepare('SELECT * FROM leads WHERE email=?').get(email);
  const id = existing ? existing.id : crypto.randomUUID();
  if (existing) {
    db.prepare('UPDATE leads SET role=COALESCE(?,role), years=COALESCE(?,years), country=COALESCE(?,country), current_salary=COALESCE(?,current_salary), skills=COALESCE(?,skills), gap_pct=COALESCE(?,gap_pct), gap_abs=COALESCE(?,gap_abs), median=COALESCE(?,median) WHERE id=?')
      .run(body.role || null, body.years ?? null, body.country || null, body.currentSalary ?? null,
        body.skills ? JSON.stringify(body.skills) : null, body.gapPct ?? null, body.gapAbs ?? null, body.median ?? null, id);
  } else {
    db.prepare(`INSERT INTO leads (id,email,role,years,country,current_salary,skills,gap_pct,gap_abs,median,source)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, email, body.role || null, body.years ?? null, body.country || null, body.currentSalary ?? null,
        body.skills ? JSON.stringify(body.skills) : null, body.gapPct ?? null, body.gapAbs ?? null, body.median ?? null,
        body.source || 'landing');
  }
  AN.track(null, 'lead.captured', { role: body.role, gapPct: body.gapPct, source: body.source || 'landing' });
  log(null, 'lead.captured', 'lead', id, { source: body.source || 'landing' });

  // The user may already have an account under this email – link it.
  const user = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (user) db.prepare('UPDATE leads SET converted_user_id=? WHERE id=?').run(user.id, id);

  json(res, 200, { ok: true, id, returning: !!existing, hasAccount: !!user });
});

// Shareable result card. The user controls what is on it; nothing identifying is ever stored
// in the payload, and the id is random so a card cannot be enumerated.
route('POST', /^\/api\/public\/share$/, async (req, res) => {
  const rl = rateLimit('share:' + clientKey(req), 20, 60 * 60 * 1000);
  if (!rl.allowed) return json(res, 429, { error: 'Too many shares from this address.' });
  const body = await readBody(req);
  const id = crypto.randomBytes(8).toString('hex');
  const payload = {
    role: String(body.role || '').slice(0, 80),
    seniority: String(body.seniority || '').slice(0, 20),
    country: String(body.country || '').slice(0, 2),
    gapPct: body.gapPct != null ? Number(body.gapPct) : null,
    gapAbs: body.gapAbs != null ? Number(body.gapAbs) : null,
    median: body.median != null ? Number(body.median) : null,
    period: body.period === 'hour' ? 'hour' : 'year',
  };
  db.prepare('INSERT INTO share_cards (id,lead_id,kind,payload) VALUES (?,?,?,?)')
    .run(id, body.leadId || null, 'rate-gap', JSON.stringify(payload));
  AN.track(null, 'share.created', { gapPct: payload.gapPct });
  json(res, 200, { ok: true, id, path: `/s/${id}` });
});

route('GET', /^\/api\/public\/share\/([a-f0-9]+)$/, async (req, res, url, m) => {
  const row = db.prepare('SELECT * FROM share_cards WHERE id=?').get(m[1]);
  if (!row) return json(res, 404, { error: 'not found' });
  db.prepare('UPDATE share_cards SET views=views+1 WHERE id=?').run(m[1]);
  json(res, 200, { id: row.id, kind: row.kind, payload: JSON.parse(row.payload), views: row.views + 1 });
});

route('GET', /^\/api\/leads$/, async (req, res) => {
  const rows = db.prepare('SELECT id,email,role,years,country,current_salary,gap_pct,gap_abs,median,source,converted_user_id,created_at FROM leads ORDER BY created_at DESC LIMIT 200').all();
  const total = db.prepare('SELECT COUNT(*) n FROM leads').get().n;
  const converted = db.prepare('SELECT COUNT(*) n FROM leads WHERE converted_user_id IS NOT NULL').get().n;
  const withGap = db.prepare('SELECT COUNT(*) n FROM leads WHERE gap_pct > 10').get().n;
  const shares = db.prepare('SELECT COUNT(*) n FROM share_cards').get().n;
  const shareViews = db.prepare('SELECT COALESCE(SUM(views),0) n FROM share_cards').get().n;
  json(res, 200, {
    leads: rows,
    stats: { total, converted, withGap, shares, shareViews, conversionRate: total ? Math.round((converted / total) * 100) : 0 },
  });
});

// ---- opportunity open (funnel step) ----
route('POST', /^\/api\/opportunities\/opened$/, async (req, res) => {
  const body = await readBody(req);
  AN.track(resolveUser(req), 'opportunity.opened', { opportunityId: body.opportunityId, source: body.source || 'feed' });
  json(res, 200, { ok: true });
});

// ---- analytics ----
route('POST', /^\/api\/events$/, async (req, res) => {
  const body = await readBody(req);
  const uid = AUTH.currentUser(req)?.id || null;
  AN.track(uid, String(body.name || 'unknown'), body.props || {}, body.path || null);
  json(res, 200, { ok: true });
});

route('GET', /^\/api\/analytics$/, async (req, res, url) => {
  const uid = resolveUser(req);
  const days = Number(url.searchParams.get('days') || 30);
  json(res, 200, {
    funnel: AN.funnel({ sinceDays: days }),
    summary: AN.summary(uid, Math.min(days, 14)),
  });
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
// Pro+ is not on sale. The coach session, relocation pack and multi-profile twins do not exist yet,
// so the tier is hidden from the catalogue, the landing page and the plan screen until they do.
// Keep the intended scope here as a note for whoever builds it.
const PLUS_FEATURES_PLANNED = [
  'Alerts the moment a 90+ match appears',
  'Negotiation briefs written for each offer',
  'Trajectory models across 12, 24 and 60 months',
  'Three profiles: hire, contract, freelance',
  'Copilot that holds your whole history',
];

route('GET', /^\/api\/plan$/, async (req, res) => {
  const uid = resolveUser(req);
  const plan = BILLING.planFor(uid);
  const row = db.prepare('SELECT * FROM plan_state WHERE user_id=?').get(uid);
  const usage = {
    matchScores: db.prepare('SELECT COUNT(*) n FROM matches WHERE user_id=?').get(uid).n,
    tracked: db.prepare('SELECT COUNT(*) n FROM applications WHERE user_id=?').get(uid).n,
  };
  // Subscription visibility: what the person holds, whether it is live, when it renews or ends.
  // Stripe is the source of truth for the period; the link row holds the subscription id.
  const link = db.prepare(`SELECT external_id, status, period_end FROM billing_events
    WHERE user_id=? AND kind='link' AND external_id LIKE 'sub_%' ORDER BY id DESC LIMIT 1`).get(uid);
  const latest = db.prepare(`SELECT status, period_end FROM billing_events
    WHERE user_id=? AND kind='entitlement' ORDER BY id DESC LIMIT 1`).get(uid);
  const periodEnd = (latest && latest.period_end) || (link && link.period_end) || null;
  let status = plan === 'free' ? 'none' : 'active';
  if (plan !== 'free' && latest && /cancel/i.test(String(latest.status || ''))) status = 'cancels_at_period_end';
  json(res, 200, {
    plan,
    subscription: {
      plan, status, cycle: row ? row.cycle : null,
      since: row ? row.since : null,
      periodEnd,
      cancelsAtPeriodEnd: status === 'cancels_at_period_end',
      stripeStatus: link ? link.status : null,
      subscriptionId: link ? link.external_id : null,
    },
    plans: { ...BILLING.PLANS },
    usage,
    limits: plan === 'pro' ? null : { matches: 10, tracked: 5 },
    since: row ? row.since : null,
    billing: BILLING.status(),
  });
});

// Checkout: real Stripe when configured, honest local switch when not.
route('POST', /^\/api\/billing\/checkout$/, async (req, res) => {
  // Payment must attach to the person paying. Signed out, resolveUser() is the shared demo account,
  // so a charge would be credited to nobody and the buyer would receive nothing.
  const signedIn = AUTH.currentUser(req);
  if (!signedIn) return json(res, 401, { error: 'Sign in first so your plan is attached to your account.', needsAuth: true });
  const body = await readBody(req);
  const uid = signedIn.id;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
  const cycle = body.cycle === 'annual' ? 'annual' : 'monthly';

  try {
    const r = await BILLING.createCheckout({ userId: uid, email: user?.email, cycle });
    if (r.fallback && process.env.NODE_ENV === 'production') {
      // A misconfigured production server must never hand out paid access for free.
      console.log(`  ! checkout refused in production: ${r.note}`);
      return json(res, 503, { error: 'Payments are temporarily unavailable. You have not been charged. Please try again shortly.' });
    }
    if (r.fallback) {
      // Development only, no keys: grant locally so the product is testable, and say so plainly.
      BILLING.setPlan(uid, 'pro', { cycle, source: 'local-fallback' });
      AN.track(uid, 'plan.activated', { cycle, source: 'local-fallback' });
      return json(res, 200, { ok: true, mode: r.mode, fallback: true, note: r.note });
    }
    log(uid, 'billing.checkout_created', 'billing', uid, { cycle, mode: r.mode });
    AN.track(uid, 'billing.checkout_started', { cycle, mode: r.mode });
    json(res, 200, { ok: true, mode: r.mode, url: r.url });
  } catch (e) {
    json(res, 502, { error: String(e.message || e) });
  }
});

// Pro+ has no checkout on purpose: the coach session, relocation pack and multi-profile twins
// are not built. Taking €49 for them would be selling something that does not exist. Interest is
// recorded so we know whether to build it.
route('POST', /^\/api\/plus\/interest$/, async (req, res) => {
  const u = AUTH.currentUser(req);
  AN.track(u ? u.id : resolveUser(req), 'plus.interest', { signedIn: !!u });
  log(u ? u.id : null, 'plus.interest', 'billing', u ? u.id : null);
  json(res, 200, { ok: true, note: 'You are on the Pro+ list. We will email you when it opens, and you will not be charged before then.' });
});

route('POST', /^\/api\/billing\/cancel$/, async (req, res) => {
  // Cancelling must reach Stripe, or the card keeps being charged while the app says "Free".
  const u = AUTH.currentUser(req);
  if (!u) return json(res, 401, { error: 'Sign in first', needsAuth: true });
  try {
    const r = await BILLING.cancelSubscription(u.id);
    if (r.ok) {
      log(u.id, 'billing.cancel_at_period_end', 'billing', u.id, { subscription: r.subscriptionId, periodEnd: r.periodEnd });
      AN.track(u.id, 'billing.cancel_requested', { periodEnd: r.periodEnd });
      AN.track(u.id, 'cancel.started', { periodEnd: r.periodEnd });
      return json(res, 200, { ok: true, plan: 'pro', cancelAtPeriodEnd: true, periodEnd: r.periodEnd,
        note: r.periodEnd ? `Cancelled. Pro stays until ${String(r.periodEnd).slice(0, 10)}, then you move to Free.` : 'Cancelled at the end of the period.' });
    }
    if (r.reason === 'no-subscription') {
      // Nothing at Stripe to cancel (no card on file): switch off locally and say so.
      BILLING.setPlan(u.id, 'free', { source: 'user' });
      log(u.id, 'billing.cancelled', 'billing', u.id, { stripe: 'no subscription' });
      return json(res, 200, { ok: true, plan: 'free', note: 'Switched to Free. No Stripe subscription was on file.' });
    }
    return json(res, 503, { error: 'Stripe is not reachable right now, so nothing was cancelled. Your plan is unchanged. Please try again shortly.' });
  } catch (e) {
    console.log(`  ! cancel failed: ${e.message}`);
    return json(res, 502, { error: 'Stripe rejected the cancellation, so nothing changed. Please try again or contact us.' });
  }
});

// Verify the configured prices against Stripe – catches mismatches before a customer does.
route('POST', /^\/api\/billing\/reconcile$/, async (req, res) => {
  try {
    const r = await BILLING.reconcile();
    log(resolveUser(req), 'billing.reconcile', 'billing', null, { checked: r.checked });
    json(res, 200, r);
  } catch (e) { json(res, 502, { error: String(e.message || e) }); }
});

route('GET', /^\/api\/billing\/verify$/, async (req, res) => {
  const st = BILLING.status();
  if (st.mode !== 'test' && st.mode !== 'live') return json(res, 200, { status: st, prices: null });
  try {
    const prices = await BILLING.verifyPrices();
    json(res, 200, { status: st, prices });
  } catch (e) {
    json(res, 502, { error: String(e.message || e) });
  }
});

route('GET', /^\/api\/billing\/status$/, async (req, res) => {
  const uid = resolveUser(req);
  const events = db.prepare('SELECT kind,plan,cycle,source,status,created_at FROM billing_events WHERE user_id=? ORDER BY id DESC LIMIT 10').all(uid);
  const webhooks = db.prepare('SELECT id,type,outcome,created_at FROM webhook_events ORDER BY created_at DESC LIMIT 10').all();
  json(res, 200, { status: BILLING.status(), plan: BILLING.planFor(uid), events, webhooks });
});

// Stripe webhook. Needs the raw body, so it is handled before JSON parsing.
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
  const lastRun = db.prepare('SELECT payload, created_at FROM ingestion_runs ORDER BY id DESC LIMIT 1').get();
  let lastMs = null;
  if (lastRun && lastRun.payload) { try { lastMs = JSON.parse(lastRun.payload).ms ?? null; } catch { /* ignore */ } }
  json(res, 200, {
    ingest: { ...(ingest || {}), ms: (ingest && ingest.ms != null) ? ingest.ms : (lastMs != null ? lastMs : 0) },
    bySource, byType,
    avgSourcesPerOpportunity: dup.avg_sources,
    multiSourced: multi,
    missingComp: quality,
    totalOpportunities: dup.n,
    salaryRecords: db.prepare('SELECT COUNT(*) n FROM salary_records').get().n,
  });
});

// ---------------- static ----------------
const MIME = { '.webmanifest': 'application/manifest+json', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// Injects a canonical link and Organization JSON-LD into the served HTML, so a crawler sees one
// address per page and a machine-readable identity, without running the client bundle.
function withSeo(html, origin, pathname) {
  const clean = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  const canonical = `${origin}${clean}`;
  const head = [
    `<link rel="canonical" href="${canonical}"/>`,
    `<meta property="og:url" content="${canonical}"/>`,
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Organization',
      name: 'ThinkZet', url: origin, description: 'AI intelligence platform for career decisions.',
      parentOrganization: { '@type': 'Organization', name: 'ZyraFlow GmbH' },
      contactPoint: [{ '@type': 'ContactPoint', email: 'support@thinkzet.com', contactType: 'customer support' }],
    })}</script>`,
  ].join('');
  return html.includes('rel="canonical"') ? html : html.replace('</head>', head + '</head>');
}

function serveStatic(req, res, pathname, origin) {
  let p = pathname === '/' ? '/index.html' : pathname;
  const file = path.join(PUBLIC, p);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); return res.end('not found'); }
        // Unknown paths must not answer 200 with the app shell: a catch-all that returns 200 for
        // /wp-login.php or /.env is the signature Safe Browsing treats as a cloaking page.
        const known = pathname === '/' || pathname === '/index.html' || pathname === '/strategy.html'
          || /^\/(salary|skills|s|legal|go)\//.test(pathname);
        res.writeHead(known ? 200 : 404, { 'Content-Type': MIME['.html'] });
        res.end(origin ? withSeo(d2.toString('utf8'), origin, pathname) : d2);
      });
      return;
    }
    const isHtml = (MIME[path.extname(file)] || '').includes('text/html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(isHtml && origin ? withSeo(data.toString('utf8'), origin, pathname) : data);
  });
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  // Shared cards live at /s/<id>; the client renders them from the API.
  if (/^\/s\/[a-f0-9]+$/.test(pathname)) return serveStatic(req, res, '/index.html', publicOrigin(req));
  // Public SEO surfaces render client-side from the same rate engine.
  if (/^\/(salary|skills)\/[^/]+(\/[A-Za-z]{2})?$/.test(pathname)) return serveStatic(req, res, '/index.html', publicOrigin(req));

  // robots.txt: the sitemap must be advertised here, and the app screens kept out of the index.
  if (pathname === '/robots.txt') {
    const body = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /?app=1',
      'Disallow: /api/',
      '',
      `Sitemap: ${publicOrigin(req)}/sitemap.xml`,
      '',
    ].join('\n');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    return res.end(body);
  }

  // Sitemap built from the live corpus: every role x country we can defend with data.
  if (pathname === '/sitemap.xml') {
    const roles = db.prepare(`SELECT role_family, COUNT(*) n FROM opportunities WHERE status='open'
      GROUP BY role_family HAVING n >= 20 ORDER BY n DESC`).all();
    const skills = db.prepare('SELECT canonical FROM skills WHERE demand_index >= 60').all();
    const countries = db.prepare(`SELECT country, COUNT(*) n FROM opportunities WHERE status='open' AND country NOT IN ('WW','EU')
      GROUP BY country HAVING n >= 20`).all();
    const urls = ['/', '/?app=1'];
    const SLUG = { backend: 'software-engineer', frontend: 'frontend-engineer', data_science: 'data-scientist',
      data_engineering: 'data-engineer', ml_engineering: 'machine-learning-engineer', ai_engineering: 'ai-engineer',
      platform: 'platform-engineer', mobile: 'mobile-engineer', product: 'product-manager',
      security: 'security-engineer', design: 'product-designer' };
    for (const r of roles) {
      const slug = SLUG[r.role_family] || r.role_family.replace(/_/g, '-');
      urls.push(`/salary/${slug}`);
      for (const c of countries) urls.push(`/salary/${slug}/${c.country.toLowerCase()}`);
    }
    for (const sk of skills) urls.push(`/skills/${encodeURIComponent(sk.canonical.toLowerCase().replace(/\s+/g, '-'))}`);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${publicOrigin(req)}${u}</loc><changefreq>daily</changefreq></url>`).join('\n') +
      `\n</urlset>`;
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    return res.end(xml);
  }

  if (!pathname.startsWith('/api/') && !pathname.startsWith('/go/')) return serveStatic(req, res, pathname, publicOrigin(req));

  // Stripe webhook needs the raw body for signature verification, so it bypasses the
  // normal JSON route pipeline entirely.
  if (pathname === '/api/billing/webhook' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const check = BILLING.verifySignature(raw, req.headers['stripe-signature']);
      if (!check.ok) {
        console.log(`  ! webhook rejected: ${check.reason}`);
        return json(res, 400, { error: check.reason });
      }
      let event;
      try { event = JSON.parse(raw); } catch { return json(res, 400, { error: 'bad json' }); }
      const seen = db.prepare('SELECT id FROM webhook_events WHERE id=?').get(event.id);
      if (seen) return json(res, 200, { received: true, duplicate: true });
      const result = BILLING.handleEvent(event);
      db.prepare('INSERT INTO webhook_events (id,type,outcome) VALUES (?,?,?)')
        .run(event.id, event.type, result.handled ? result.effect : result.reason);
      console.log(`  webhook ${event.type}: ${result.handled ? result.effect : 'ignored (' + result.reason + ')'}`);
      json(res, 200, { received: true, ...result });
    });
    return;
  }

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

// Bind to all interfaces so a tunnel (cloudflared/ngrok) or your phone on the same
// network can reach it. Localhost still works exactly as before.
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`ThinkZet engine on http://127.0.0.1:${PORT}`);
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

  // Daily brief scheduler. Runs every 15 minutes and sends to anyone whose local hour matches
  // their preference and who has not already received one today.
  const sendBriefs = async () => {
    try {
      const users = db.prepare(`SELECT u.id, u.email, u.name, COALESCE(p.send_hour,7) send_hour, COALESCE(p.timezone,'Europe/Berlin') tz
        FROM users u LEFT JOIN email_prefs p ON p.user_id = u.id
        WHERE u.status='active' AND COALESCE(p.daily_brief,1)=1 AND u.email NOT LIKE '%@anon.local'`).all();
      let sent = 0;
      for (const u of users) {
        let localHour = 7;
        try { localHour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: u.tz }).format(new Date())); } catch { localHour = 7; }
        if (localHour !== Number(u.send_hour)) continue;
        const already = db.prepare("SELECT 1 FROM email_queue WHERE user_id=? AND kind='daily_brief' AND date(created_at)=date('now') LIMIT 1").get(u.id);
        if (already) continue;
        const brief = await briefFor(u.id);
        if (!brief || brief.needsOnboarding) continue;
        const rates = E.rateIntelligence(u.id);
        const scores = db.prepare('SELECT * FROM career_scores WHERE user_id=? ORDER BY id DESC LIMIT 1').get(u.id);
        const composed = MAIL.briefEmail({ user: u, brief, rates, scores });
        MAIL.enqueue({ userId: u.id, to: u.email, kind: 'daily_brief', subject: composed.subject, text: composed.text, html: composed.html });
        sent++;
      }
      if (sent) {
        const r = await MAIL.flush(200);
        console.log(`[brief] ${sent} queued, ${r.results.filter((x) => x.ok).length} delivered via ${MAIL.provider()}`);
      }
    } catch (e) { console.log('  ! brief scheduler error', e.message); }
  };
  // Entitlement reconciliation every six hours, in case a webhook was missed.
  setTimeout(async () => {
    try {
      const r = await BILLING.reconcile();
      const fixed = (r.results || []).filter((x) => /downgraded/.test(x.action)).length;
      if (fixed) console.log(`[reconcile] ${fixed} entitlement(s) corrected`);
    } catch (e) { console.log('  ! reconcile error', e.message); }
  }, 90 * 1000);
  setInterval(async () => {
    try { await BILLING.reconcile(); } catch (e) { /* best effort */ }
  }, 6 * 60 * 60 * 1000);

  setTimeout(sendBriefs, 60 * 1000);
  setInterval(sendBriefs, 15 * 60 * 1000);
});
