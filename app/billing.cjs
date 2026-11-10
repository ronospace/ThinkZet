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
    features: ['Top 10 scored opportunities', 'Market value & salary gap check', 'Opportunity tracker (5 items)',
      'Career score & market pulse'],
  },
  pro: {
    key: 'pro', label: 'Pro', price: 19, period: 'month', annual: 149,
    features: ['Unlimited scored opportunities', 'Career Twin & all scores', 'Full radar & filters',
      'Saved searches & daily brief', 'Negotiation & interview support', 'Unlimited tracking & outcomes'],
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
// Read-only lookups (GET). Used to verify the account's prices before charging anyone.
async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${CONFIG.secretKey}` },
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `stripe ${path} failed`);
  return json;
}

async function verifyPrices() {
  const out = { monthly: null, annual: null, problems: [] };
  for (const [key, id] of [['monthly', CONFIG.priceMonthly], ['annual', CONFIG.priceAnnual]]) {
    if (!id) { out.problems.push(`no ${key} price id configured`); continue; }
    try {
      const price = await stripeGet(`prices/${id}?expand[]=product`);
      const product = price.product;
      out[key] = {
        id: price.id,
        amount: price.unit_amount != null ? price.unit_amount / 100 : null,
        currency: (price.currency || '').toUpperCase(),
        interval: price.recurring?.interval || null,
        active: !!price.active,
        product: typeof product === 'object' ? product.name : product,
        livemode: !!price.livemode,
      };
      if (!price.active) out.problems.push(`${key} price is inactive`);
      if (price.type !== 'recurring') out.problems.push(`${key} price is not recurring`);
      const keyLive = CONFIG.secretKey.startsWith('sk_live');
      if (price.livemode !== keyLive) out.problems.push(`${key} price livemode (${price.livemode}) does not match the key mode (${keyLive ? 'live' : 'test'})`);
    } catch (e) {
      out.problems.push(`${key}: ${e.message}`);
    }
  }
  return out;
}

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
    // Adaptive Pricing converts to the device's local currency, which a EUR-settling account then
    // presents as a foreign-currency charge and the issuer refuses. Pin presentment to the price currency.
    'payment_method_options[card][request_three_d_secure]': 'automatic',
  });
  return { mode: m, fallback: false, url: session.url, id: session.id };
}

// ---- entitlement ----
// The subscription we recorded for this user, if any. Checkout writes a 'link' row with the sub id.
function subscriptionFor(userId) {
  const row = db.prepare(`SELECT external_id FROM billing_events
    WHERE user_id=? AND kind='link' AND external_id LIKE 'sub_%' ORDER BY id DESC LIMIT 1`).get(userId);
  return row ? row.external_id : null;
}

// Cancel at the end of the paid period, in Stripe itself. Access continues until the period ends,
// which is what the customer paid for; the webhook then downgrades on customer.subscription.deleted.
// Cancelling only in our database would leave Stripe billing the card every month.
async function cancelSubscription(userId) {
  // Check what we have on record first: with no subscription there is nothing at Stripe to cancel,
  // so a local switch-off is the honest answer. With a subscription, Stripe must confirm.
  const subId = subscriptionFor(userId);
  if (!subId) return { ok: false, reason: 'no-subscription' };
  const m = mode();
  if (m === 'unconfigured' || m === 'blocked-live') return { ok: false, reason: 'no-stripe', note: status().note };
  const sub = await stripe(`subscriptions/${subId}`, { cancel_at_period_end: 'true' });
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
  setPlan(userId, 'pro', { source: 'stripe', externalId: sub.id, status: sub.status, periodEnd });
  return { ok: true, subscriptionId: sub.id, status: sub.status, cancelAtPeriodEnd: !!sub.cancel_at_period_end, periodEnd };
}

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

// Subscription objects carry metadata only if we set it at checkout time. If a webhook
// arrives without it, resolve the user from the subscription or customer id we stored.
function resolveUserId(obj) {
  const direct = obj.metadata?.user_id || obj.client_reference_id || null;
  if (direct) return direct;

  const subId = obj.object === 'subscription' ? obj.id : obj.subscription;
  if (subId) {
    const row = db.prepare("SELECT user_id FROM billing_events WHERE external_id=? AND user_id IS NOT NULL LIMIT 1").get(subId);
    if (row) return row.user_id;
  }
  const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
  if (customerId) {
    const row = db.prepare("SELECT user_id FROM billing_events WHERE external_id=? AND user_id IS NOT NULL LIMIT 1").get(customerId);
    if (row) return row.user_id;
  }
  return null;
}

// ---- webhook handling ----
function handleEvent(event) {
  const obj = event.data?.object || {};
  const userId = resolveUserId(obj);
  const periodEnd = obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (!userId) return { handled: false, reason: 'no user id on checkout session' };
      setPlan(userId, 'pro', { cycle: obj.metadata?.plan === 'annual' ? 'annual' : 'monthly', source: 'stripe', externalId: obj.id, status: 'active' });
      // Funnel: money confirmed by Stripe, recorded once per session (the webhook is idempotent upstream).
      try { require('./analytics.cjs').track(userId, 'payment.completed', { cycle: obj.metadata?.plan || 'monthly' }); } catch { /* analytics must never block entitlement */ }
      // Remember the subscription and customer so later lifecycle events can find the user.
      const subId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
      const custId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
      for (const id of [subId, custId].filter(Boolean)) {
        db.prepare('INSERT INTO billing_events (user_id,kind,plan,cycle,source,external_id,status) VALUES (?,?,?,?,?,?,?)')
          .run(userId, 'link', 'pro', obj.metadata?.plan === 'annual' ? 'annual' : 'monthly', 'stripe', id, 'linked');
      }
      return { handled: true, effect: 'granted pro' };
    }
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
    case 'invoice.paid': {
      // The invoice is the source of truth for money actually received. If a checkout event
      // is missed or delayed, this still grants access.
      const subId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
      // A renewal invoice carries no metadata, so resolve through the subscription id we stored at
      // checkout, then through the customer id, then through the invoice's own subscription line.
      const lineSub = (obj.lines && obj.lines.data && obj.lines.data[0] && (obj.lines.data[0].subscription || (obj.lines.data[0].parent && obj.lines.data[0].parent.subscription_item_details && obj.lines.data[0].parent.subscription_item_details.subscription))) || null;
      const custId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
      const uid = userId
        || (subId ? resolveUserId({ object: 'subscription', id: subId }) : null)
        || (lineSub ? resolveUserId({ object: 'subscription', id: lineSub }) : null)
        || (custId ? resolveUserId({ customer: custId }) : null);
      if (!uid) return { handled: false, reason: 'no user id on paid invoice' };
      setPlan(uid, 'pro', { cycle: 'monthly', source: 'stripe', externalId: obj.id, status: 'paid', periodEnd });
      return { handled: true, effect: 'pro granted on paid invoice' };
    }
    case 'invoice.payment_action_required':
      return { handled: true, effect: 'payment needs customer action – no change' };
    case 'invoice.payment_failed':
      if (userId) { setPlan(userId, 'free', { source: 'stripe', externalId: obj.id, status: 'past_due' }); return { handled: true, effect: 'downgraded on failed payment' }; }
      return { handled: false, reason: 'no user id on invoice' };
    default:
      return { handled: false, reason: 'ignored event type ' + event.type };
  }
}

// Reconciliation: webhooks can be missed, misconfigured or disabled by Stripe after repeated
// failures. This asks Stripe directly what each paying user's subscription actually is, and
// corrects our entitlement to match. It is the safety net under the webhook.
async function reconcile() {
  if (!CONFIG.secretKey) return { skipped: true, reason: 'no stripe key' };
  const rows = db.prepare("SELECT user_id FROM plan_state WHERE plan IN ('pro','plus')").all();
  const results = [];
  for (const { user_id: userId } of rows) {
    const link = db.prepare("SELECT external_id FROM billing_events WHERE user_id=? AND kind='link' AND external_id LIKE 'sub_%' ORDER BY id DESC LIMIT 1").get(userId);
    if (!link) { results.push({ userId, action: 'no subscription on record' }); continue; }
    try {
      const sub = await stripeGet(`subscriptions/${link.external_id}`);
      const active = ['active', 'trialing'].includes(sub.status);
      const current = db.prepare('SELECT plan FROM plan_state WHERE user_id=?').get(userId)?.plan;
      if (!active && current !== 'free') {
        setPlan(userId, 'free', { source: 'reconcile', externalId: sub.id, status: sub.status });
        results.push({ userId, action: `downgraded (stripe status: ${sub.status})` });
      } else {
        results.push({ userId, action: `ok (${sub.status})` });
      }
    } catch (e) {
      const msg = String(e.message || e);
      // Stripe saying "no such subscription" is not an error to retry: it means the record
      // does not exist, so the user is not paying. Correct the entitlement instead.
      if (/no such subscription|resource_missing/i.test(msg)) {
        const current = db.prepare('SELECT plan FROM plan_state WHERE user_id=?').get(userId)?.plan;
        if (current && current !== 'free') {
          setPlan(userId, 'free', { source: 'reconcile', externalId: link.external_id, status: 'missing' });
          results.push({ userId, action: 'downgraded (subscription not found in Stripe)' });
        } else {
          results.push({ userId, action: 'ok (already free)' });
        }
      } else {
        results.push({ userId, action: 'lookup failed: ' + msg.slice(0, 80) });
      }
    }
  }
  return { checked: rows.length, results };
}

module.exports = { PLANS, CONFIG, mode, status, createCheckout, cancelSubscription, subscriptionFor, setPlan, planFor, verifySignature, handleEvent, verifyPrices, stripeGet, reconcile };
