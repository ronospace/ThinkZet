// Billing: Stripe Checkout + webhooks, with a safe local fallback.
//
// Three states this module must handle honestly:
//   1. No keys configured   -> local entitlement switch, clearly labelled as such.
//   2. Test keys configured -> real Stripe Checkout in test mode, real webhooks, no real money.
//   3. Live keys configured -> real money. This is gated behind an explicit env flag so it
//                              can never happen by accident.
'use strict';
const crypto = require('node:crypto');
const { db } = require('./db.cjs');

const CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  priceMonthly: process.env.STRIPE_PRICE_MONTHLY || '',
  priceAnnual: process.env.STRIPE_PRICE_ANNUAL || '',
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://127.0.0.1:4173/?checkout=success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://127.0.0.1:4173/?checkout=cancelled',
  allowLive: process.env.STRIPE_ALLOW_LIVE === 'true',
};

const PLANS = {
  free: {
    key: 'free', label: 'Free', price: 0, period: null,
    features: ['Top 10 scored opportunities', 'Rate gap check (always free)', 'Tracker (5 items)'],
  },
  pro: {
    key: 'pro', label: 'Pro', price: 19, period: 'month', annual: 149,
    features: ['Unlimited scored opportunities', 'Career Twin + all six scores', 'Full Radar with filters and facets', 'Saved searches and the morning brief', 'Negotiation and trajectory', 'Cover letters and interview prep', 'Unlimited tracker and outcomes'],
  },
};

function mode() {
  if (!CONFIG.secretKey) return 'unconfigured';
  if (CONFIG.secretKey.startsWith('sk_live')) return CONFIG.allowLive ? 'live' : 'blocked-live';
  if (CONFIG.secretKey.startsWith('sk_test')) return 'test';
  if (CONFIG.secretKey.startsWith('rk_')) return 'restricted';
  return 'unknown';
}

function status() {
  const m = mode();
  const missing = [];
  if (!CONFIG.secretKey) missing.push('STRIPE_SECRET_KEY');
  if (!CONFIG.priceMonthly) missing.push('STRIPE_PRICE_MONTHLY');
  if (!CONFIG.priceAnnual) missing.push('STRIPE_PRICE_ANNUAL');
  if (!CONFIG.webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');
  return {
    mode: m,
    ready: (m === 'test' || m === 'live') && missing.length === 0,
    missing,
    liveBlocked: m === 'blocked-live',
    note: m === 'unconfigured'
      ? 'Stripe is not configured. The paywall uses a local entitlement switch so the gating is still real and testable.'
      : m === 'blocked-live'
        ? 'A live Stripe key was found but live mode is disabled. Set STRIPE_ALLOW_LIVE=true only when you intend to take real money.'
        : m === 'test'
          ? 'Stripe test mode. Checkout is real, cards are test cards, no money moves.'
          : 'Stripe live mode is enabled.',
  };
}

// ---- Stripe API (REST, no SDK) ----
async function stripe(path, form) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CONFIG.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `stripe ${path} failed`);
  return json;
}

async function createCheckout({ userId, email, cycle, plan = 'pro' }) {
  const m = mode();
  if (m === 'unconfigured' || m === 'blocked-live') {
    return { mode: m, fallback: true, note: status().note };
  }
  const price = cycle === 'annual' ? CONFIG.priceAnnual : CONFIG.priceMonthly;
  if (!price) return { mode: m, fallback: true, note: `Missing price id for ${cycle}.` };

  const session = await stripe('checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: CONFIG.successUrl + '&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: CONFIG.cancelUrl,
    client_reference_id: userId,
    customer_email: email || undefined,
    allow_promotion_codes: 'true',
    'subscription_data[metadata][user_id]': userId,
    'metadata[user_id]': userId,
    'metadata[plan]': plan,
  });
  return { mode: m, fallback: false, url: session.url, id: session.id };
}

// ---- entitlement ----
function setPlan(userId, plan, { cycle = 'monthly', source = 'local', externalId = null, status = 'active', periodEnd = null } = {}) {
  db.prepare(`INSERT INTO plan_state (user_id,plan,cycle,since) VALUES (?,?,?,datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan, cycle=excluded.cycle, since=datetime('now')`)
    .run(userId, plan, cycle);
  try {
    db.prepare(`INSERT INTO billing_events (user_id,kind,plan,cycle,source,external_id,status,period_end)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(userId, 'entitlement', plan, cycle, source, externalId, status, periodEnd);
  } catch { /* billing log must never block entitlement */ }
}

function planFor(userId) {
  const row = db.prepare('SELECT * FROM plan_state WHERE user_id=?').get(userId);
  return row ? row.plan : 'free';
}

// ---- webhook signature verification ----
function verifySignature(rawBody, signatureHeader) {
  if (!CONFIG.webhookSecret) return { ok: false, reason: 'no webhook secret configured' };
  const parts = Object.fromEntries(
    String(signatureHeader || '').split(',').map((p) => {
      const i = p.indexOf('=');
      return i === -1 ? [p, ''] : [p.slice(0, i), p.slice(i + 1)];
    })
  );
  const timestamp = parts.t;
  const provided = parts.v1;
  if (!timestamp || !provided) return { ok: false, reason: 'malformed signature header' };

  // Reject replays older than five minutes.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return { ok: false, reason: 'timestamp too old' };

  const expected = crypto
    .createHmac('sha256', CONFIG.webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  if (a.length !== b.length) return { ok: false, reason: 'signature length mismatch' };
  return crypto.timingSafeEqual(a, b) ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}

// ---- webhook handling ----
function handleEvent(event) {
  const obj = event.data?.object || {};
  const userId = obj.metadata?.user_id || obj.client_reference_id || null;
  const periodEnd = obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null;

  switch (event.type) {
    case 'checkout.session.completed':
      if (userId) setPlan(userId, 'pro', { cycle: obj.metadata?.plan === 'annual' ? 'annual' : 'monthly', source: 'stripe', externalId: obj.id, status: 'active' });
      return { handled: true, effect: 'granted pro' };
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      if (userId) {
        const active = ['active', 'trialing'].includes(obj.status);
        setPlan(userId, active ? 'pro' : 'free', { cycle: 'monthly', source: 'stripe', externalId: obj.id, status: obj.status, periodEnd });
        return { handled: true, effect: active ? 'pro maintained' : 'pro suspended (' + obj.status + ')' };
      }
      return { handled: false, reason: 'no user id on subscription' };
    case 'customer.subscription.deleted':
      if (userId) { setPlan(userId, 'free', { source: 'stripe', externalId: obj.id, status: 'canceled' }); return { handled: true, effect: 'downgraded to free' }; }
      return { handled: false, reason: 'no user id on subscription' };
    case 'invoice.payment_failed':
      if (userId) { setPlan(userId, 'free', { source: 'stripe', externalId: obj.id, status: 'past_due' }); return { handled: true, effect: 'downgraded on failed payment' }; }
      return { handled: false, reason: 'no user id on invoice' };
    default:
      return { handled: false, reason: 'ignored event type ' + event.type };
  }
}

module.exports = { PLANS, CONFIG, mode, status, createCheckout, setPlan, planFor, verifySignature, handleEvent };
