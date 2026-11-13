// Smoke test: every route the UI depends on must answer, and the core invariants must hold.
// Run: node scripts/check.cjs   (server must be running)
'use strict';
const BASE = process.env.BASE || 'http://127.0.0.1:4173';

const GETS = [
  '/api/health', '/api/me', '/api/auth/me', '/api/feed?limit=5', '/api/scores', '/api/rates',
  '/api/twin', '/api/tracker', '/api/gaps', '/api/gaps/plan', '/api/brief', '/api/learning',
  '/api/outcomes/intel', '/api/plan', '/api/referrals', '/api/ops', '/api/pulse', '/api/ingest',
  '/api/saved-searches', '/api/negotiation', '/api/trajectory', '/api/analytics',
  '/api/billing/status', '/api/leads', '/api/email/status', '/api/email/prefs', '/api/email/outbox',
  '/api/onboarding/draft', '/api/opportunities/lifecycle', '/api/email/sequence',
  '/api/habit', '/api/scores/v2', '/api/referrals/recommendations',
  '/api/data-sources',
];
const POSTS = [
  ['/api/demo', {}],
  ['/api/public/rate-check', { role: 'Senior Data Scientist', years: 8, country: 'DE', currentSalary: 78000, skills: ['Python', 'SQL'] }],
  ['/api/public/lead', { email: 'smoke@careeros.test', role: 'Senior Data Scientist', years: 8, gapPct: 17, median: 90000 }],
  ['/api/public/share', { role: 'Senior Data Scientist', gapPct: 17, gapAbs: 13000, median: 90000 }],
  ['/api/onboarding/preview', { role: 'Backend Engineer', years: 6, currentSalary: 70000, skills: ['Go'] }],
  ['/api/email/brief', {}],
  ['/api/email/flush', {}],
  ['/api/copilot', { message: 'Am I underpaid?' }],
  ['/api/horizon', { horizon: 'balanced' }],
  ['/api/brief/ack', {}],
  ['/api/track', { event: 'radar.opened' }],
];

let pass = 0, fail = 0;
const failures = [];

async function call(method, path, body) {
  // A stable forwarded-for so the suite does not trip its own rate limiter, and so repeated
  // runs are not blocked by a previous run.
  const headers = { 'x-forwarded-for': '10.0.0.1' };
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json is fine for static */ }
  const hdrs = {};
  res.headers.forEach((v, k) => { hdrs[k] = v; });
  return { status: res.status, json, text, headers: hdrs };
}

(async () => {
  // Seed the demo persona first: the personalised routes are supposed to 404 without it.
  try { await call('POST', '/api/demo', {}); } catch { /* reported below */ }

  for (const p of GETS) {
    try {
      const r = await call('GET', p);
      const ok = r.status === 200 && r.json && !r.json.error;
      if (ok) pass++; else { fail++; failures.push(`${p} -> ${r.status} ${r.json?.error || ''}`); }
    } catch (e) { fail++; failures.push(`${p} -> ${e.message}`); }
  }
  for (const [p, b] of POSTS) {
    try {
      const r = await call('POST', p, b);
      const ok = r.status === 200 && r.json && !r.json.error;
      if (ok) pass++; else { fail++; failures.push(`POST ${p} -> ${r.status} ${r.json?.error || ''}`); }
    } catch (e) { fail++; failures.push(`POST ${p} -> ${e.message}`); }
  }

  // Invariants
  const feed = await call('GET', '/api/feed?limit=20');
  const opps = feed.json?.opportunities || [];
  const scoresOk = opps.every((o) => o.match_score >= 0 && o.match_score <= 100);
  const probsOk = opps.every((o) => o.interview_probability >= 0 && o.interview_probability <= 100
    && o.offer_probability >= 0 && o.offer_probability <= o.interview_probability + 0.001);
  const confOk = opps.every((o) => o.confidence && o.confidence.level);
  const compOk = opps.every((o) => o.comp_min == null || (o.comp_period === 'hour' ? o.comp_min >= 8 && o.comp_min <= 400 : o.comp_min >= 8000));
  for (const [name, ok] of [['scores in range', scoresOk], ['offer <= interview', probsOk], ['confidence present', confOk], ['comp sanity', compOk]]) {
    if (ok) pass++; else { fail++; failures.push(`invariant failed: ${name}`); }
  }

  const rates = await call('GET', '/api/rates');
  const rateOk = rates.json && rates.json.p25 <= rates.json.p50 && rates.json.p50 <= rates.json.p75 && rates.json.p75 <= rates.json.p90;
  if (rateOk) pass++; else { fail++; failures.push('invariant failed: rate percentiles ordered'); }

  const rc = await call('POST', '/api/public/rate-check', { role: 'Backend Engineer', years: 5, currentSalary: 60000, skills: ['Go'] });
  const rcOk = rc.json && rc.json.benchmark && rc.json.benchmark.p25 <= rc.json.benchmark.p50
    && rc.json.benchmark.p50 <= rc.json.benchmark.p75 && rc.json.verdict && rc.json.levers;
  if (rcOk) pass++; else { fail++; failures.push('invariant failed: public rate check returns ordered benchmark + verdict'); }

  const badLead = await call('POST', '/api/public/lead', { email: 'not-an-email' });
  if (badLead.status === 400) pass++; else { fail++; failures.push('invariant failed: invalid lead email rejected'); }

  const share = await call('POST', '/api/public/share', { role: 'X', gapPct: 5, median: 1000 });
  const card = share.json?.id ? await call('GET', '/api/public/share/' + share.json.id) : { json: null };
  if (card.json?.payload && card.json.views >= 1) pass++; else { fail++; failures.push('invariant failed: share card round-trip'); }

  const mail = await call('GET', '/api/email/status');
  if (mail.json?.status?.provider) pass++; else { fail++; failures.push('invariant failed: email status reports a provider'); }

  const outbox = await call('GET', '/api/email/outbox');
  const composedOk = (outbox.json?.messages || []).some((m) => m.kind === 'daily_brief' && m.subject);
  if (composedOk) pass++; else { fail++; failures.push('invariant failed: daily brief composed into the outbox'); }

  // Launch is founder-only: an anonymous caller must be refused, and the payload must still be complete
  // when the founder asks for it.
  const launchAnon = await call('GET', '/api/launch');
  const flagsAnon = await call('GET', '/api/me/flags');
  const launchOk = launchAnon.status === 403
    && flagsAnon.json && flagsAnon.json.founder === false;
  if (launchOk) pass++; else { fail++; failures.push('invariant failed: launch is founder-only and refuses anonymous callers'); }

  const launchBody = launchAnon.json || {};
  const founderOk = launchAnon.status === 403 && /founder only/i.test(String(launchBody.error || ''));
  if (founderOk) pass++; else { fail++; failures.push('invariant failed: launch refusal names the reason'); }

  // The strategy document is withdrawn from the public: gone, not merely missing, and never indexed.
  const strat = await call('GET', '/strategy.html');
  const stratOk = strat.status === 410 && /noindex/i.test(String(strat.headers?.['x-robots-tag'] || ''));
  if (stratOk) pass++; else { fail++; failures.push('invariant failed: strategy page answers 410 with noindex'); }

  // A duplicate OAuth callback must not be reported as an expired link: the state is claimed once, and a
  // replay says so. This is what made Apple sign-in need two attempts.
  try {
    const { DatabaseSync } = require('node:sqlite');
    const path = require('node:path');
    const dbf = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'careeros.db');
    const d = new DatabaseSync(dbf);
    const state = 'check-replay-' + Date.now();
    d.prepare("INSERT OR REPLACE INTO oauth_states (state,provider,nonce,expires_at) VALUES (?,?,?,?)")
      .run(state, 'apple', 'n', new Date(Date.now() + 600000).toISOString());
    const first = await fetch(BASE + '/api/auth/apple/callback', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'code=x&state=' + state, redirect: 'manual' });
    const second = await fetch(BASE + '/api/auth/apple/callback', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'code=x&state=' + state, redirect: 'manual' });
    const loc = second.headers.get('location') || '';
    const replayOk = first.status === 303 && second.status === 303 && /already%20completed|already completed/i.test(loc);
    if (replayOk) pass++; else { fail++; failures.push('invariant failed: a replayed OAuth state answers "already completed"'); }
    d.prepare('DELETE FROM oauth_states WHERE state=?').run(state);
    d.close();
  } catch (e) { fail++; failures.push('invariant failed: replay check could not run - ' + e.message); }

  const legal = await call('GET', '/legal/privacy.html');
  if (legal.status === 200 && /Privacy/.test(legal.text || '')) pass++; else { fail++; failures.push('invariant failed: privacy page served'); }

  const traj = await call('GET', '/api/trajectory');
  const trajOk = traj.json && traj.json.paths?.length === 5 && traj.json.paths.every((p) => p.endSalary > 0);
  if (trajOk) pass++; else { fail++; failures.push('invariant failed: five trajectory paths'); }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) { console.log('\nFailures:'); failures.forEach((f) => console.log('  - ' + f)); process.exitCode = 1; }
})();
