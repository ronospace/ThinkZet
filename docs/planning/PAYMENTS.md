# Payments – how money moves, and how to prove it

Last updated: 9 November 2026. Owner: engineering. Related tasks: PAY-01, PAY-02, PAY-03, PAY-04.

## Rules

1. A payment attaches to a signed-in account. There is no anonymous checkout and no charge against the shared demo account.
2. A missing or blocked Stripe key never grants paid access in production. Checkout answers 503 and says the customer was not charged.
3. Cancellation is executed at Stripe. Access continues to the end of the paid period, then the webhook downgrades the account.
4. Nothing is sold before it exists. Pro+ is hidden until the coach session, relocation pack and multi-profile twins are built.

## Where each rule lives

| Rule | Code | Test |
|---|---|---|
| Sign-in required for checkout | `app/server.cjs`, `POST /api/billing/checkout` | `scripts/payment-check.cjs` |
| No demo-account charge | same route, resolves the session user only | `scripts/payment-check.cjs` |
| No free Pro in production | same route, `NODE_ENV === 'production'` guard | `scripts/payment-check.cjs` |
| Cancellation reaches Stripe | `app/billing.cjs`, `cancelSubscription()` | `scripts/billing-unit.cjs` |
| Pro+ not sold | `app/server.cjs` catalogue, `app/public/index.html` | `scripts/payment-check.cjs` |

## Running the tests

```sh
# 1. two isolated servers, each with its own database
rm -rf /tmp/pay-safe /tmp/pay-dev
for d in pay-safe pay-dev; do mkdir -p /tmp/$d/app /tmp/$d/data; cp app/*.cjs /tmp/$d/app/; cp -R app/public /tmp/$d/app/public; done
(cd /tmp/pay-safe/app && NODE_ENV=production PORT=4181 node server.cjs &)
(cd /tmp/pay-dev/app  && PORT=4182 node server.cjs &)

# 2. the suites
node scripts/payment-check.cjs     # 19 checks: auth, demo, no-free-pro, cancel, Pro+
node scripts/billing-unit.cjs      # 9 checks: the exact Stripe request, stubbed
```

`billing-unit.cjs` sets `DATA_DIR` to a temporary folder, so it never writes to the working database.

## Cancelling a real subscription (PAY-04, live proof)

The automated suites never touch a real card. The live proof is one manual run, once, on the founder's own subscription:

1. Subscribe on thinkzet.com with a real card (this is PAY-01).
2. Confirm Stripe shows an active subscription and the app shows Pro.
3. In the app: Plan → **Switch to Free**.
4. In Stripe → Subscriptions, the same subscription must show **Cancels at period end** with the same date the app printed.
5. The app must still show Pro, with the end date, until that date passes.
6. In Stripe, cancel immediately (or let the period end) and confirm the webhook `customer.subscription.deleted` arrives and the app drops to Free.
7. Refund the test payment.

Record the result against PAY-04 in `docs/planning/TASKS.md`.

## Known limits

- `POST /api/billing/cancel` cancels at period end, not immediately. Immediate cancellation would remove access the customer already paid for.
- If Stripe is unreachable the cancellation is refused and nothing changes; the customer is told to try again.
- A subscription started outside the app (for example created by hand in the Stripe dashboard) has no `link` row, so the app cannot cancel it. `reconcile()` still downgrades it correctly from Stripe's own state.
