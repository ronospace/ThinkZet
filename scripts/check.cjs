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
  '/api/onboarding/draft', '/api/launch', '/api/opportunities/lifecycle', '/api/email/sequence',
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
  return { status: res.status, json, text };
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

  const launch = await call('GET', '/api/launch');
  const launchOk = launch.json && Array.isArray(launch.json.checks) && launch.json.checks.length >= 8
    && typeof launch.json.ready === 'boolean' && launch.json.verdict;
  if (launchOk) pass++; else { fail++; failures.push('invariant failed: launch readiness reports checks and a verdict'); }

  const legal = await call('GET', '/legal/privacy.html');
  if (legal.status === 200 && /Privacy/.test(legal.text || '')) pass++; else { fail++; failures.push('invariant failed: privacy page served'); }

  const traj = await call('GET', '/api/trajectory');
  const trajOk = traj.json && traj.json.paths?.length === 5 && traj.json.paths.every((p) => p.endSalary > 0);
  if (trajOk) pass++; else { fail++; failures.push('invariant failed: five trajectory paths'); }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) { console.log('\nFailures:'); failures.forEach((f) => console.log('  - ' + f)); process.exitCode = 1; }
})();
