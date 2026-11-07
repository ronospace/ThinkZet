// Career Twin + Match Scoring + Career Score + Rate Intelligence.
// Deterministic, explainable, calibrated by priors — no black box.
'use strict';
const { db } = require('./db.cjs');
const { SKILLS, resolveSkill } = require('./taxonomy.cjs');
const { CURRENCY_RATES, SENIORITY_MULT, BASE_ANNUAL_EUR } = require('./corpus.cjs');
const { extractYearsRequired } = require('./classify.cjs');

const SENIORITY_RANK = { junior: 1, mid: 2, senior: 3, staff: 4, lead: 4, principal: 5 };

// ---------- CV parsing (deterministic, explainable, no external model) ----------
const SECTION_HINTS = ['experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'summary'];

function parseResume(text) {
  const lower = text.toLowerCase();
  const found = new Map();
  for (const [canonical, , aliases] of SKILLS) {
    const needles = [canonical.toLowerCase(), ...aliases];
    for (const n of needles) {
      const re = new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (re.test(lower)) {
        const confidence = n === canonical.toLowerCase() ? 0.95 : 0.82;
        const prev = found.get(canonical);
        if (!prev || prev.confidence < confidence) found.set(canonical, { confidence, evidence: n });
        break;
      }
    }
  }

  // Years of experience
  const yearMatches = [...lower.matchAll(/(19|20)\d{2}/g)].map((m) => parseInt(m[0], 10)).filter((y) => y >= 1995 && y <= 2026);
  let years = null;
  const explicit = lower.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)?/);
  if (explicit) years = parseInt(explicit[1], 10);
  else if (yearMatches.length >= 2) years = Math.max(1, Math.min(30, new Date().getFullYear() - Math.min(...yearMatches)));

  // Seniority signals
  let seniority = 'mid';
  if (/principal|distinguished/.test(lower)) seniority = 'principal';
  else if (/staff/.test(lower)) seniority = 'staff';
  else if (/head of|director|vp of/.test(lower)) seniority = 'lead';
  else if (/lead|team lead|tech lead|manager/.test(lower)) seniority = 'lead';
  else if (/senior|sr\.?\s/.test(lower)) seniority = 'senior';
  else if (/junior|graduate|intern|entry/.test(lower)) seniority = 'junior';
  if (years != null) {
    const byYears = years >= 12 ? 'staff' : years >= 7 ? 'senior' : years >= 4 ? 'mid' : 'junior';
    if (SENIORITY_RANK[byYears] > SENIORITY_RANK[seniority]) seniority = byYears;
  }

  // Role family guess
  const famSignals = [
    ['ai_engineering', ['llm', 'rag', 'genai', 'prompt', 'langchain', 'openai']],
    ['ml_engineering', ['mlops', 'pytorch', 'model serving', 'ml engineer', 'machine learning']],
    ['data_science', ['data scientist', 'statistics', 'experimentation', 'a/b test']],
    ['data_engineering', ['data engineer', 'airflow', 'dbt', 'etl', 'pipeline']],
    ['platform', ['kubernetes', 'terraform', 'sre', 'platform engineer', 'devops']],
    ['mobile', ['flutter', 'ios', 'android', 'swift', 'kotlin']],
    ['frontend', ['react', 'frontend', 'typescript', 'next.js']],
    ['product', ['product manager', 'roadmap', 'product owner']],
    ['backend', ['backend', 'node', 'golang', 'microservice', 'api']],
  ];
  let roleFamily = 'backend';
  let best = 0;
  for (const [fam, signals] of famSignals) {
    const hits = signals.filter((s) => lower.includes(s)).length;
    if (hits > best) { best = hits; roleFamily = fam; }
  }

  // Current rate / salary
  let currentRate = null, rateUnit = null;
  const rateMatch = lower.match(/([€$£])\s?(\d{2,4})(?:k)?\s*(?:\/|per\s*)?(hr|hour|h|day|month|mo|year|yr|annum)/);
  const kMatch = lower.match(/([€$£])?\s?(\d{2,3})k\s*(?:\/|per\s*)?(year|yr|annum|month|mo)?/);
  if (rateMatch) {
    currentRate = parseInt(rateMatch[2], 10);
    const u = rateMatch[3];
    rateUnit = /hr|hour|^h$/.test(u) ? 'hour' : /day/.test(u) ? 'day' : /month|mo/.test(u) ? 'month' : 'year';
  } else if (kMatch) {
    currentRate = parseInt(kMatch[2], 10) * 1000;
    rateUnit = kMatch[3] && /month|mo/.test(kMatch[3]) ? 'month' : 'year';
  }

  const countries = [];
  const countryMap = { germany: 'DE', netherlands: 'NL', portugal: 'PT', poland: 'PL', ireland: 'IE', spain: 'ES', france: 'FR', canada: 'CA', uk: 'GB', 'united kingdom': 'GB', switzerland: 'CH', sweden: 'SE', india: 'IN', dubai: 'AE', uae: 'AE', 'united states': 'US', usa: 'US' };
  for (const [name, code] of Object.entries(countryMap)) if (lower.includes(name)) countries.push(code);

  const wantsRemote = /remote|distributed|anywhere/.test(lower);
  const needsVisa = /visa|sponsorship|relocat|blue card/.test(lower);

  return {
    skills: [...found.entries()].map(([canonical, v]) => ({ canonical, confidence: v.confidence, evidence: v.evidence })),
    years, seniority, roleFamily, currentRate, rateUnit,
    countries: Array.from(new Set(countries)), wantsRemote, needsVisa,
    sectionsDetected: SECTION_HINTS.filter((s) => lower.includes(s)),
  };
}

// ---------- Twin ----------
function buildTwin(userId) {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id=?').get(userId);
  if (!profile) return null;
  const skills = db.prepare(`SELECT s.id, s.canonical, s.category, s.demand_index, s.salary_premium, s.growth_rate,
      ps.proficiency, ps.confidence FROM profile_skills ps JOIN skills s ON s.id=ps.skill_id WHERE ps.user_id=?`).all(userId);
  const apps = db.prepare('SELECT status, COUNT(*) n FROM applications WHERE user_id=? GROUP BY status').all(userId);
  const outcomes = db.prepare('SELECT outcome_type, COUNT(*) n FROM outcomes WHERE user_id=? GROUP BY outcome_type').all(userId);
  const dismissed = db.prepare(`SELECT m.opportunity_id FROM matches m WHERE m.user_id=? AND m.match_score < 40`).all(userId);

  const skillNames = skills.map((s) => s.canonical);
  const topSkills = [...skills].sort((a, b) => (b.salary_premium || 0) - (a.salary_premium || 0)).slice(0, 6);

  const state = {
    version: 1,
    identity: { seniority: profile.seniority, years: profile.years_experience, headline: profile.headline },
    skills: skillNames,
    skillDetail: skills,
    constraints: {
      remotePreference: profile.remote_preference,
      willingToRelocate: !!profile.willing_to_relocate,
      targetCountries: JSON.parse(profile.target_countries || '[]'),
      visaNeeded: !!profile.visa_needed,
      targetRateMin: profile.target_rate_min,
      currentRate: profile.current_rate,
      rateUnit: profile.rate_unit,
    },
    preferences: { riskTolerance: profile.risk_tolerance, timeToMove: profile.time_to_move },
    behaviour: { applications: apps, outcomes, dismissals: dismissed.length },
    momentum: computeMomentum(profile, apps, outcomes),
    completeness: profile.completeness,
    updatedAt: new Date().toISOString(),
  };

  db.prepare(`INSERT INTO career_twin (user_id, version, state, updated_at) VALUES (?,?,?,datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET state=excluded.state, updated_at=datetime('now')`)
    .run(userId, 1, JSON.stringify(state));
  return state;
}

function computeMomentum(profile, apps, outcomes) {
  const applied = (apps.find((a) => a.status === 'applied')?.n || 0) +
                  (apps.find((a) => a.status === 'interviewing')?.n || 0) +
                  (apps.find((a) => a.status === 'offer')?.n || 0);
  const wins = (outcomes.find((o) => o.outcome_type === 'interview')?.n || 0) +
               (outcomes.find((o) => o.outcome_type === 'offer')?.n || 0);
  return Math.min(100, 25 + applied * 8 + wins * 15);
}

// ---------- Match scoring ----------
function skillFit(userSkills, oppSkills, importance = 0.75) {
  if (!oppSkills.length) return { score: 55, matched: [], missing: [] };
  const have = new Set(userSkills);
  const matched = oppSkills.filter((s) => have.has(s));
  const missing = oppSkills.filter((s) => !have.has(s));
  const raw = matched.length / oppSkills.length;
  return { score: Math.round(Math.min(100, 30 + raw * 90)), matched, missing };
}

// Experience fit uses the years of experience actually stated in the posting when it is
// available, and falls back to a seniority-label comparison when it is not. The stated
// requirement is the ground truth; the label is an inference.
function experienceFit(profile, opp) {
  const required = extractYearsRequired(opp.description);
  const have = profile.years_experience;

  if (required != null && have != null) {
    const gap = have - required;
    if (gap >= 6) return 88;                 // comfortably overqualified
    if (gap >= 1) return 100;                // right band
    if (gap === 0) return 96;
    if (gap >= -2) return 76;                // close stretch
    if (gap >= -4) return 54;
    return 30;                               // genuinely too junior for the stated bar
  }

  const pr = SENIORITY_RANK[profile.seniority] || 2;
  const or = SENIORITY_RANK[opp.seniority] || 2;
  const diff = or - pr;
  if (diff === 0) return 100;
  if (diff === -1) return 86;
  if (diff === 1) return 74;
  if (diff === -2) return 58;
  if (diff <= -2) return 66;
  return 38;
}

function annualise(amount, currency, period) {
  if (amount == null) return null;
  const rate = CURRENCY_RATES[currency] || 1;
  let eur = Number(amount) * rate;
  if (period === 'hour') eur *= 1600;
  if (period === 'day') eur *= 220;
  if (period === 'month') eur *= 12;
  if (period === 'stipend' || period === 'oneoff' || period === 'prize' || period === 'fee') eur = eur; // as-is
  if (period === 'investment' || period === 'equity') return null;
  return eur;
}

function incomePotential(profile, opp) {
  // Salary-equivalent normalisation: hourly contract rates are gross and carry no
  // holiday, pension or employer social contributions, so they are discounted to a
  // comparable annual package before any comparison is made.
  let annual = annualise(opp.comp_max || opp.comp_min, opp.currency, opp.comp_period);
  if (opp.comp_period === 'hour' && annual != null) annual = annual * 0.78;
  if (annual == null) return { score: 40, expected: null, deltaPct: null };
  const current = annualise(profile.current_rate, profile.rate_currency || 'EUR', profile.rate_unit || 'year');
  const target = annualise(profile.target_rate_min, profile.rate_currency || 'EUR', profile.rate_unit || 'year');
  let score = 55;
  if (target) score = annual >= target ? 85 + Math.min(15, ((annual - target) / target) * 40) : 55 * (annual / target);
  else if (current) score = annual >= current ? 78 : 40;
  const deltaPct = current ? Math.round(((annual - current) / current) * 100) : null;
  return { score: Math.max(10, Math.min(100, Math.round(score))), expected: Math.round(annual), deltaPct };
}

// Probability priors: base interview rate by match bucket, adjusted by source quality,
// competition (source_count = more boards = more applicants), and seniority stretch.
const BASE_INTERVIEW = { '90': 0.62, '80': 0.49, '70': 0.36, '60': 0.24, '50': 0.14, '40': 0.07, '0': 0.03 };

function probabilities(matchScore, opp, profile, extras) {
  const bucket = matchScore >= 90 ? '90' : matchScore >= 80 ? '80' : matchScore >= 70 ? '70'
    : matchScore >= 60 ? '60' : matchScore >= 50 ? '50' : matchScore >= 40 ? '40' : '0';
  let pInterview = BASE_INTERVIEW[bucket];
  pInterview *= 0.7 + (opp.source_quality || 0.5) * 0.6;         // quality of the listing/channel
  pInterview *= 1 - Math.min(0.35, (opp.source_count - 1) * 0.08); // more boards = more competition
  if (extras.stretch) pInterview *= 0.72;
  if (extras.visaFriction) pInterview *= 0.6;
  if (opp.type === 'cofounder') pInterview *= 0.55;
  if (opp.type === 'grant' || opp.type === 'fellowship') pInterview *= 0.85;
  pInterview = Math.max(0.01, Math.min(0.95, pInterview));

  // Offer probability conditional on interview: strongly driven by skill coverage + seniority fit
  let pOfferGivenInterview = 0.34 + (extras.skillCoverage - 0.5) * 0.4 + (extras.experienceFit - 50) / 500;
  pOfferGivenInterview = Math.max(0.08, Math.min(0.72, pOfferGivenInterview));
  const pOffer = pInterview * pOfferGivenInterview;

  return {
    interviewProbability: Math.round(pInterview * 1000) / 10,
    offerProbability: Math.round(pOffer * 1000) / 10,
    conditionalOffer: Math.round(pOfferGivenInterview * 1000) / 10,
  };
}

function scoreOpportunity(profile, twin, opp) {
  const userSkills = twin.skills;
  const oppSkills = JSON.parse(opp.skills || '[]');
  const sf = skillFit(userSkills, oppSkills);
  const ef = experienceFit(profile, opp);
  const ip = incomePotential(profile, opp);

  const targetCountries = JSON.parse(profile.target_countries || '[]');
  const remotePref = profile.remote_preference || 'any';
  let locationFit = 70;
  if (opp.remote_type === 'remote') locationFit = remotePref === 'onsite' ? 55 : 95;
  else if (targetCountries.length && targetCountries.includes(opp.country)) locationFit = 92;
  else if (opp.country === profile.country) locationFit = 88;
  else if (profile.willing_to_relocate) locationFit = 70;
  else locationFit = 35;

  const visaFriction = profile.visa_needed && opp.visa_sponsorship !== 'yes' &&
    !(targetCountries.includes(opp.country)) && opp.country !== profile.country;

  const ageDays = (Date.now() - new Date(opp.posted_at).getTime()) / 86400000;
  const freshness = Math.max(0, 100 - ageDays * 1.6);

  const skillCoverage = oppSkills.length ? sf.matched.length / oppSkills.length : 0.5;
  const stretch = (SENIORITY_RANK[opp.seniority] || 2) - (SENIORITY_RANK[profile.seniority] || 2) >= 2;

  // Horizon-weighted ranking. The same opportunity is ranked differently depending on
  // what the user is optimising for — income, growth, stability or optionality.
  // Weights sum to 1.0. Default 'balanced' deliberately does NOT maximise income,
  // because "highest paying" and "best for you" are different questions.
  const HORIZON_WEIGHTS = {
    balanced: { skill: 0.30, exp: 0.16, income: 0.14, location: 0.12, fresh: 0.10, quality: 0.08, growth: 0.10 },
    income:   { skill: 0.24, exp: 0.12, income: 0.34, location: 0.10, fresh: 0.08, quality: 0.06, growth: 0.06 },
    growth:   { skill: 0.26, exp: 0.10, income: 0.08, location: 0.10, fresh: 0.08, quality: 0.06, growth: 0.32 },
    stability:{ skill: 0.28, exp: 0.22, income: 0.10, location: 0.16, fresh: 0.14, quality: 0.10, growth: 0.00 },
  };
  const horizon = profile.risk_tolerance === 'aggressive' ? 'growth' : (profile.time_to_move === 'asap' ? 'income' : 'balanced');
  const W = HORIZON_WEIGHTS[horizon] || HORIZON_WEIGHTS.balanced;

  // Growth signal: how much this role moves the user toward emerging, high-premium skills
  const skillMeta = new Map(db.prepare('SELECT canonical,growth_rate,salary_premium FROM skills').all().map((r) => [r.canonical, r]));
  const growthSignal = oppSkills.length
    ? Math.min(100, oppSkills.reduce((acc, sk) => {
        const m = skillMeta.get(sk);
        return acc + (m ? Math.max(0, m.growth_rate) * 0.9 + m.salary_premium * 0.6 : 0);
      }, 0) / oppSkills.length)
    : 40;

  const matchScore = Math.round(
    W.skill * sf.score +
    W.exp * ef +
    W.income * ip.score +
    W.location * locationFit +
    W.fresh * freshness +
    W.quality * (opp.source_quality * 100) +
    W.growth * growthSignal
  );

  const probs = probabilities(matchScore, opp, profile, { stretch, visaFriction, skillCoverage, experienceFit: ef });

  const riskScore = Math.round(
    (opp.type === 'cofounder' ? 45 : 10) +
    (opp.comp_min == null ? 25 : 0) +
    (ageDays > 45 ? 20 : 0) +
    (visaFriction ? 15 : 0) +
    (stretch ? 10 : 0)
  );

  const reasons = [
    { factor: 'Skills', detail: `${sf.matched.length}/${oppSkills.length} required skills matched`, weight: W.skill },
    { factor: 'Seniority', detail: `${opp.seniority} vs your ${profile.seniority}`, weight: W.exp },
    { factor: 'Income', detail: ip.deltaPct != null ? `${ip.deltaPct > 0 ? '+' : ''}${ip.deltaPct}% vs your current rate` : 'Compensation not disclosed', weight: W.income },
    { factor: 'Location', detail: `${opp.remote_type} · ${opp.city}`, weight: W.location },
    { factor: 'Freshness', detail: `posted ${Math.round(ageDays)}d ago`, weight: W.fresh },
    { factor: 'Channel quality', detail: `${opp.source} (${Math.round(opp.source_quality * 100)}/100)`, weight: W.quality },
    { factor: 'Growth', detail: `${Math.round(growthSignal)}/100 emerging-skill signal`, weight: W.growth },
  ].filter((r) => r.weight > 0).sort((a, b) => b.weight - a.weight);

  return {
    match_score: Math.max(5, Math.min(99, matchScore)),
    skill_fit: sf.score,
    experience_fit: ef,
    income_potential: ip.score,
    interview_probability: probs.interviewProbability,
    offer_probability: probs.offerProbability,
    risk_score: Math.min(100, riskScore),
    missing_skills: JSON.stringify(sf.missing.slice(0, 6)),
    matched_skills: sf.matched,
    reasons: JSON.stringify(reasons),
    expected_income: ip.expected,
    income_delta_pct: ip.deltaPct,
    location_fit: locationFit,
    freshness: Math.round(freshness),
    visa_friction: !!visaFriction,
    horizon,
    growth_signal: Math.round(growthSignal),
  };
}

function computeMatches(userId) {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id=?').get(userId);
  if (!profile) return 0;
  const twin = buildTwin(userId);
  const opps = db.prepare("SELECT * FROM opportunities WHERE status='open'").all();
  const ins = db.prepare(`INSERT INTO matches
    (user_id,opportunity_id,match_score,skill_fit,experience_fit,income_potential,interview_probability,offer_probability,
     risk_score,missing_skills,reasons,model_version,computed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(user_id,opportunity_id) DO UPDATE SET
      match_score=excluded.match_score, skill_fit=excluded.skill_fit, experience_fit=excluded.experience_fit,
      income_potential=excluded.income_potential, interview_probability=excluded.interview_probability,
      offer_probability=excluded.offer_probability, risk_score=excluded.risk_score,
      missing_skills=excluded.missing_skills, reasons=excluded.reasons, computed_at=datetime('now')`);
  db.exec('BEGIN');
  for (const o of opps) {
    const s = scoreOpportunity(profile, twin, o);
    ins.run(userId, o.id, s.match_score, s.skill_fit, s.experience_fit, s.income_potential,
      s.interview_probability, s.offer_probability, s.risk_score, s.missing_skills, s.reasons, 'v1-rules');
  }
  db.exec('COMMIT');
  return opps.length;
}

// ---------- Career Score ----------
function computeCareerScore(userId) {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id=?').get(userId);
  const twin = buildTwin(userId);
  const skills = twin.skillDetail || [];
  const matches = db.prepare('SELECT * FROM matches WHERE user_id=? ORDER BY match_score DESC LIMIT 60').all(userId);
  const apps = db.prepare('SELECT status, COUNT(*) n FROM applications WHERE user_id=? GROUP BY status').all(userId);
  const outcomes = db.prepare('SELECT outcome_type, COUNT(*) n FROM outcomes WHERE user_id=? GROUP BY outcome_type').all(userId);

  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const top = matches.slice(0, 15);

  const employability = Math.round(
    0.35 * avg(top.map((m) => m.match_score)) +
    0.25 * Math.min(100, skills.length * 8) +
    0.2 * (profile.completeness || 0) +
    0.2 * Math.min(100, (profile.years_experience || 0) * 7)
  );
  const interviewReadiness = Math.round(
    0.4 * avg(top.map((m) => m.interview_probability * 2.2)) +
    0.3 * Math.min(100, skills.length * 7) +
    0.3 * Math.min(100, 40 + (apps.find((a) => a.status === 'applied')?.n || 0) * 9)
  );
  const marketDemand = Math.round(avg(skills.map((s) => s.demand_index || 50)));
  const salaryPotential = Math.round(avg(top.map((m) => m.income_potential)));
  const emerging = skills.filter((s) => s.growth_rate > 20).length;
  const futureGrowth = Math.round(
    0.5 * Math.min(100, avg(skills.map((s) => 50 + (s.growth_rate || 0))) ) +
    0.3 * Math.min(100, 30 + emerging * 18) +
    0.2 * Math.min(100, (profile.years_experience || 0) * 6)
  );
  const careerMomentum = Math.round(
    0.5 * (twin.momentum || 25) +
    0.3 * Math.min(100, ((apps.find((a) => a.status === 'applied')?.n || 0) * 12)) +
    0.2 * Math.min(100, (outcomes.reduce((s, o) => s + o.n, 0)) * 20)
  );
  const overall = Math.round(
    0.22 * employability + 0.16 * interviewReadiness + 0.16 * marketDemand +
    0.2 * salaryPotential + 0.14 * futureGrowth + 0.12 * careerMomentum
  );

  // Percentile vs. a modelled benchmark distribution (mean 58, sd 14)
  const z = (overall - 58) / 14;
  const percentile = Math.round(100 / (1 + Math.exp(-1.15 * z)));

  const breakdown = {
    employability: { drivers: [`${top.length ? Math.round(avg(top.map((m) => m.match_score))) : 0} avg match on top 15`, `${skills.length} recognised skills`, `${profile.completeness || 0}% profile completeness`] },
    interviewReadiness: { drivers: [`${Math.round(avg(top.map((m) => m.interview_probability)))}% avg interview probability`, `${apps.find((a) => a.status === 'applied')?.n || 0} applications tracked`] },
    marketDemand: { drivers: [skills.slice(0, 3).map((s) => s.canonical).join(', ') || 'no skills yet'] },
    salaryPotential: { drivers: [`${Math.round(avg(top.map((m) => m.income_potential)))}/100 income score on top matches`] },
    futureGrowth: { drivers: [`${emerging} emerging skills (fast growth)`, `${skills.filter((s) => (s.growth_rate || 0) < 0).length} declining skills`] },
    careerMomentum: { drivers: [`${apps.find((a) => a.status === 'applied')?.n || 0} active applications`, `${outcomes.reduce((s, o) => s + o.n, 0)} recorded outcomes`] },
  };

  const row = {
    employability: Math.min(100, employability), interview_readiness: Math.min(100, interviewReadiness),
    market_demand: Math.min(100, marketDemand), salary_potential: Math.min(100, salaryPotential),
    future_growth: Math.min(100, futureGrowth), career_momentum: Math.min(100, careerMomentum),
    overall: Math.min(100, overall), benchmark_percentile: percentile, breakdown: JSON.stringify(breakdown),
  };
  db.prepare(`INSERT INTO career_scores (user_id,employability,interview_readiness,market_demand,salary_potential,
    future_growth,career_momentum,overall,benchmark_percentile,breakdown) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(userId, row.employability, row.interview_readiness, row.market_demand, row.salary_potential,
      row.future_growth, row.career_momentum, row.overall, row.benchmark_percentile, row.breakdown);
  return row;
}

// ---------- Rate intelligence (the wedge) ----------
function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function rateIntelligence(userId) {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id=?').get(userId);
  if (!profile) return null;
  const twin = buildTwin(userId);
  const userSkills = new Set(twin.skills);

  const recs = db.prepare('SELECT * FROM salary_records').all();
  const targetPeriod = profile.rate_unit === 'hour' ? 'hour' : 'year';

  const myFamily = guessFamily(profile, twin);

  // Stratified comparables: the segment is (role family, seniority, same currency period).
  // Widening happens in tiers so a thin segment falls back to "adjacent", never to noise.
  const TIERS = [
    { label: 'exact profile', test: (r) => r.role_family === myFamily && r.seniority === profile.seniority, weight: 1.0 },
    { label: 'same role, ±1 level', test: (r) => r.role_family === myFamily && Math.abs((SENIORITY_RANK[r.seniority] || 2) - (SENIORITY_RANK[profile.seniority] || 2)) === 1, weight: 0.8 },
    { label: 'adjacent role, same level', test: (r) => r.role_family !== myFamily && r.seniority === profile.seniority, weight: 0.6 },
    { label: 'market-wide, same level', test: (r) => r.seniority === profile.seniority, weight: 0.35 },
  ];

  const scored = [];
  for (const r of recs) {
    const skills = JSON.parse(r.skills || '[]');
    const overlap = skills.filter((s) => userSkills.has(s)).length;
    const skillSim = userSkills.size ? overlap / Math.min(8, userSkills.size) : 0;
    let tier = null;
    for (const t of TIERS) { if (t.test(r)) { tier = t; break; } }
    if (!tier) continue;
    const weight = tier.weight * (0.6 + 0.4 * Math.min(1, skillSim));
    scored.push({ r, weight, overlap, tier: tier.label });
  }

  // Convert everything to the user's period & EUR
  const converted = [];
  for (const x of scored) {
    const eur = Number(x.r.amount) * (CURRENCY_RATES[x.r.currency] || 1);
    let value;
    if (targetPeriod === 'hour') {
      if (x.r.period === 'hour') value = eur;
      else if (x.r.period === 'year') value = eur / 1600;
      else continue;
    } else {
      if (x.r.period === 'year') value = eur;
      else if (x.r.period === 'hour') value = eur * 1600;
      else continue;
    }
    converted.push({ value, weight: x.weight, channel: x.r.channel, country: x.r.country, source: x.r.source, tier: x.tier });
  }

  converted.sort((a, b) => a.value - b.value);
  const values = converted.map((c) => c.value);

  // Weighted percentiles: each comparable contributes in proportion to its tier + skill similarity.
  function weightedPercentile(p) {
    if (!values.length) return null;
    const total = converted.reduce((s, c) => s + c.weight, 0);
    let acc = 0;
    for (let i = 0; i < converted.length; i++) {
      acc += converted[i].weight;
      if (acc / total >= p) {
        const prev = i > 0 ? converted[i - 1].value : converted[i].value;
        return prev + (converted[i].value - prev) * 0.5;
      }
    }
    return values[values.length - 1];
  }

  const p25 = weightedPercentile(0.25);
  const p50 = weightedPercentile(0.5);
  const p75 = weightedPercentile(0.75);
  const p90 = weightedPercentile(0.9);
  const exactTier = converted.filter((c) => c.tier === 'exact profile').length;

  const current = profile.current_rate ? Number(profile.current_rate) : null;
  let gapPct = null, gapAbs = null, verdict = 'unknown';
  if (current && p50) {
    gapPct = Math.round(((p50 - current) / current) * 100);
    gapAbs = Math.round(p50 - current);
    verdict = gapPct >= 15 ? 'underpaid' : gapPct >= 5 ? 'slightly_under' : gapPct > -10 ? 'at_market' : 'above_market';
  }

  // Channel breakdown — where the money actually is
  const channels = {};
  for (const c of converted) {
    channels[c.channel] = channels[c.channel] || [];
    channels[c.channel].push(c.value);
  }
  const byChannel = Object.entries(channels)
    .filter(([, v]) => v.length >= 3)
    .map(([k, v]) => ({ channel: k, median: Math.round(percentile(v.sort((a, b) => a - b), 0.5)), n: v.length }))
    .sort((a, b) => b.median - a.median);

  return {
    period: targetPeriod,
    currency: 'EUR',
    sampleSize: converted.length,
    current,
    p25: Math.round(p25 || 0), p50: Math.round(p50 || 0), p75: Math.round(p75 || 0), p90: Math.round(p90 || 0),
    gapPct, gapAbs, verdict,
    byChannel,
    topPayingSkills: twin.skillDetail
      .filter((s) => s.salary_premium)
      .sort((a, b) => b.salary_premium - a.salary_premium).slice(0, 5)
      .map((s) => ({ skill: s.canonical, premium: s.salary_premium })),
    confidence: exactTier >= 25 ? 'high' : exactTier >= 10 ? 'medium' : 'low',
    exactComparables: exactTier,
    segment: myFamily.replace(/_/g, ' ') + ' · ' + profile.seniority,
    tierBreakdown: ['exact profile', 'same role, ±1 level', 'adjacent role, same level', 'market-wide, same level']
      .map((t) => ({ tier: t, n: converted.filter((c) => c.tier === t).length })),
  };
}

function guessFamily(profile, twin) {
  const text = `${profile.headline || ''} ${profile.summary || ''} ${twin.skills.join(' ')}`.toLowerCase();
  if (/llm|rag|genai|prompt/.test(text)) return 'ai_engineering';
  if (/mlops|pytorch|machine learning/.test(text)) return 'ml_engineering';
  if (/data scientist|statistics|experiment/.test(text)) return 'data_science';
  if (/airflow|dbt|pipeline|data engineer/.test(text)) return 'data_engineering';
  if (/kubernetes|terraform|sre/.test(text)) return 'platform';
  if (/flutter|mobile|ios|android/.test(text)) return 'mobile';
  if (/react|frontend/.test(text)) return 'frontend';
  if (/product manager|roadmap/.test(text)) return 'product';
  return 'backend';
}

module.exports = {
  parseResume, buildTwin, computeMatches, computeCareerScore, rateIntelligence,
  scoreOpportunity, annualise, guessFamily, SENIORITY_RANK,
};
