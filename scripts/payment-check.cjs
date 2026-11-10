// Payment safety tests: PAY-02 (checkout), PAY-04 (cancellation), PAY-03 (Pro+ hidden).
//
// Two servers are started by the caller, each on its own port and its own data directory:
//   SAFE_URL      production semantics, Stripe deliberately unconfigured (no keys at all)
//   DEV_URL       development semantics, Stripe unconfigured (the local switch is allowed there)
// Nothing here talks to real Stripe: the Stripe side is exercised through the recorded link row
// and through a stubbed fetch, and the real-subscription flow is documented in docs/planning/PAYMENTS.md.
//
// Run: node scripts/payment-check.cjs
'use strict';
const SAFE = process.env.SAFE_URL || 'http://127.0.0.1:4181';
const DEV = process.env.DEV_URL || 'http://127.0.0.1:4182';

let pass = 0; let fail = 0;
const failures = [];
const ok = (name, cond, detail) => { if (cond) pass++; else { fail++; failures.push(`${name}${detail ? ' -> ' + detail : ''}`); } };

async function call(base, method, path, body, cookie) {
  const headers = { 'x-forwarded-for': '10.0.0.9' };
  if (body) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* static pages are not json */ }
  const setCookie = (res.headers.get('set-cookie') || '').split(';')[0];
  return { status: res.status, json, text, cookie: setCookie };
}

// Sign in for real: request a code (the server returns it only while no mail provider is live,
// which is the case in this suite) and verify it.
async function signIn(base, tag) {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@paytest.local`;
  const a = await call(base, 'POST', '/api/auth/request', { email });
  if (!a.json || !a.json.devCode) throw new Error(`could not get a code for ${email}: ${a.status} ${a.text.slice(0, 120)}`);
  const v = await call(base, 'POST', '/api/auth/verify', { email, code: a.json.devCode });
  if (!v.cookie) throw new Error('sign-in returned no session cookie');
  return { email, cookie: v.cookie, user: v.json.user };
}

(async () => {
  // ---------- PAY-02.1 authentication required before checkout ----------
  for (const base of [SAFE, DEV]) {
    const r = await call(base, 'POST', '/api/billing/checkout', { cycle: 'monthly' });
    ok('checkout refused when signed out', r.status === 401 && r.json && r.json.needsAuth === true, `${base} ${r.status} ${r.text.slice(0, 90)}`);
    const a = await call(base, 'POST', '/api/billing/checkout', { cycle: 'annual' });
    ok('annual checkout refused when signed out', a.status === 401, `${base} ${a.status}`);
  }

  // ---------- PAY-02.2 never attached to a demo account ----------
  // The demo account is what a signed-out request resolves to. Prove it is not reachable for money.
  const demoBefore = await call(SAFE, 'GET', '/api/plan');
  const demoPlanBefore = demoBefore.json?.plan;
  await call(SAFE, 'POST', '/api/billing/checkout', { cycle: 'monthly' });
  const demoAfter = await call(SAFE, 'GET', '/api/plan');
  ok('demo account plan unchanged by a signed-out checkout', demoAfter.json?.plan === demoPlanBefore, `${demoPlanBefore} -> ${demoAfter.json?.plan}`);
  ok('demo account is not pro', demoAfter.json?.plan !== 'pro', String(demoAfter.json?.plan));

  // ---------- PAY-02.3 no path grants Pro when Stripe keys are missing ----------
  const s = await signIn(SAFE, 'safe');
  const safeCheckout = await call(SAFE, 'POST', '/api/billing/checkout', { cycle: 'monthly' }, s.cookie);
  ok('production checkout refuses when Stripe is unconfigured', safeCheckout.status === 503, `${safeCheckout.status} ${safeCheckout.text.slice(0, 90)}`);
  ok('refusal says the customer was not charged', /not been charged/i.test(safeCheckout.json?.error || ''), safeCheckout.json?.error);
  const safePlan = await call(SAFE, 'GET', '/api/plan', null, s.cookie);
  ok('no Pro granted after the refused checkout', safePlan.json?.plan !== 'pro', String(safePlan.json?.plan));

  // The development switch still works, and only there, so the product stays testable.
  const d = await signIn(DEV, 'dev');
  const devCheckout = await call(DEV, 'POST', '/api/billing/checkout', { cycle: 'monthly' }, d.cookie);
  ok('development checkout still grants locally', devCheckout.status === 200 && devCheckout.json?.fallback === true, `${devCheckout.status}`);
  const devPlan = await call(DEV, 'GET', '/api/plan', null, d.cookie);
  ok('development plan became pro', devPlan.json?.plan === 'pro', String(devPlan.json?.plan));

  // ---------- PAY-04 cancellation reaches Stripe ----------
  const c = await signIn(SAFE, 'cancel');
  const anonCancel = await call(SAFE, 'POST', '/api/billing/cancel', {});
  ok('cancel refused when signed out', anonCancel.status === 401, `${anonCancel.status}`);
  const noSub = await call(SAFE, 'POST', '/api/billing/cancel', {}, c.cookie);
  ok('cancel without a Stripe subscription does not claim Stripe was touched', noSub.status === 200 && /no stripe subscription/i.test(noSub.json?.note || ''), JSON.stringify(noSub.json));

  // With a recorded subscription but no keys, cancellation must refuse rather than silently downgrade.
  // Write through the SAFE server's own database file, so the row belongs to that server's data.
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(process.env.SAFE_DB || '/tmp/pay-safe/data/careeros.db');
  db.prepare(`INSERT INTO billing_events (user_id,kind,plan,cycle,source,external_id,status) VALUES (?,?,?,?,?,?,?)`)
    .run(c.user.id, 'link', 'pro', 'monthly', 'stripe', 'sub_test_pay04', 'active');
  db.prepare(`INSERT INTO plan_state (user_id,plan,cycle,since) VALUES (?,?,?,datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET plan='pro', cycle='monthly'`).run(c.user.id, 'pro', 'monthly');
  db.close();
  const noKeys = await call(SAFE, 'POST', '/api/billing/cancel', {}, c.cookie);
  ok('cancel refuses when Stripe is unreachable', noKeys.status === 503, `${noKeys.status} ${noKeys.text.slice(0, 90)}`);
  const stillPro = await call(SAFE, 'GET', '/api/plan', null, c.cookie);
  ok('plan unchanged after a refused cancellation', stillPro.json?.plan === 'pro', String(stillPro.json?.plan));

  // ---------- PAY-03 Pro+ is not sold ----------
  const cat = await call(SAFE, 'GET', '/api/plan');
  ok('catalogue has no plus tier', !cat.json?.plans?.plus, JSON.stringify(Object.keys(cat.json?.plans || {})));
  const interest = await call(SAFE, 'POST', '/api/plus/interest', {});
  ok('interest endpoint records without selling', interest.status === 200 && /will not be charged before/i.test(interest.json?.note || ''), JSON.stringify(interest.json));
  // Pro+ is displayed again, but it must never reach a checkout: its action records interest only.
  const land = await call(SAFE, 'GET', '/');
  ok('landing page shows Pro+ as a plan', /Pro\+/.test(land.text), 'Pro+ missing from the landing page');
  ok('Pro+ action is the waitlist, not a checkout', /plus\/interest/.test(land.text), 'no interest handler on the landing page');
  const plusCheckout = await call(SAFE, 'POST', '/api/billing/checkout', { cycle: 'monthly', plan: 'plus' }, s.cookie);
  ok('a plus checkout cannot be bought', plusCheckout.status !== 200 || !plusCheckout.json?.url, JSON.stringify(plusCheckout.json).slice(0, 90));

  console.log(`\npayment checks: ${pass} passed, ${fail} failed`);
  if (fail) { for (const f of failures) console.log('  FAIL ' + f); process.exitCode = 1; }
})().catch((e) => { console.error('suite crashed:', e.message); process.exitCode = 1; });
