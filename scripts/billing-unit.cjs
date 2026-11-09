// PAY-04 unit test: cancellation must call Stripe itself.
//
// Runs in its own process with a temporary database and a stubbed fetch, so no real card or
// subscription is touched. It proves the exact request that leaves the server.
//
// Run: node scripts/billing-unit.cjs
'use strict';
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tz-billing-'));
process.env.DATA_DIR = dir;
process.env.STRIPE_SECRET_KEY = 'sk_test_stub_for_unit_test';
process.env.STRIPE_ALLOW_LIVE = 'false';

let pass = 0; let fail = 0;
const failures = [];
const ok = (name, cond, detail) => { if (cond) pass++; else { fail++; failures.push(`${name}${detail ? ' -> ' + detail : ''}`); } };

const calls = [];
global.fetch = async (url, opts = {}) => {
  calls.push({ url: String(url), method: opts.method || 'GET', body: String(opts.body || '') });
  if (String(url).includes('/subscriptions/sub_unit_1')) {
    return { ok: true, json: async () => ({ id: 'sub_unit_1', status: 'active', cancel_at_period_end: true, current_period_end: 1790000000 }) };
  }
  return { ok: false, json: async () => ({ error: { message: 'unexpected call in unit test: ' + url } }) };
};

const { db } = require('../app/db.cjs');
const BILLING = require('../app/billing.cjs');

(async () => {
  const uid = 'unit-user-1';
  db.prepare('INSERT INTO users (id,email,name) VALUES (?,?,?)').run(uid, 'unit@paytest.local', 'Unit Tester');

  // No subscription on record: nothing to cancel at Stripe, and no Stripe call is made.
  const before = calls.length;
  const none = await BILLING.cancelSubscription(uid);
  ok('no subscription on record is reported as such', none.ok === false && none.reason === 'no-subscription', JSON.stringify(none));
  ok('no Stripe call when there is nothing to cancel', calls.length === before, `${calls.length - before} call(s)`);

  // A recorded subscription: the cancellation must be a POST to that subscription with cancel_at_period_end.
  db.prepare(`INSERT INTO billing_events (user_id,kind,plan,cycle,source,external_id,status) VALUES (?,?,?,?,?,?,?)`)
    .run(uid, 'link', 'pro', 'monthly', 'stripe', 'sub_unit_1', 'active');
  const r = await BILLING.cancelSubscription(uid);
  const call = calls[calls.length - 1] || {};
  ok('cancellation succeeds', r.ok === true, JSON.stringify(r));
  ok('it is a POST to the subscription', call.method === 'POST' && /\/v1\/subscriptions\/sub_unit_1$/.test(call.url), `${call.method} ${call.url}`);
  ok('it sets cancel_at_period_end=true', /cancel_at_period_end=true/.test(call.body), call.body);
  ok('the returned period end is passed through', r.periodEnd === new Date(1790000000 * 1000).toISOString(), String(r.periodEnd));
  ok('access stays pro until the period ends', BILLING.planFor(uid) === 'pro', BILLING.planFor(uid));

  // A Stripe refusal must not change the plan.
  global.fetch = async () => ({ ok: false, json: async () => ({ error: { message: 'No such subscription' } }) });
  let threw = false;
  try { await BILLING.cancelSubscription(uid); } catch { threw = true; }
  ok('a Stripe refusal surfaces as an error', threw);
  ok('the plan is untouched after a refusal', BILLING.planFor(uid) === 'pro', BILLING.planFor(uid));

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`billing unit checks: ${pass} passed, ${fail} failed`);
  if (fail) { for (const f of failures) console.log('  FAIL ' + f); process.exitCode = 1; }
})().catch((e) => { console.error('unit suite crashed:', e.message); process.exitCode = 1; });
