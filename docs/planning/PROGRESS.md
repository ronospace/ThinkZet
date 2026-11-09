# ThinkZet – Mission Plan

One page. What is done, what is left, and the order to do it in.
Detail: `TASKS.md` (77 numbered items). Rules: `ENGINEERING.md`. Payments: `PAYMENTS.md`.

Last updated: 9 November 2026 · `master` at `e18c239` · tagged `restore-20261109-29` · tree clean.

## Where we are

Live on thinkzet.com. Sign-in works by email code, Google and Apple. Payments are live and guarded. Salary numbers are labelled sample data. 59 API checks, 10 browser checks and 9 billing checks pass.

## 1. Done

| Area | State |
|---|---|
| Hosting | thinkzet.com, www redirect, volume, entrypoint, service renamed to ThinkZet |
| Payments | Stripe live, six-event webhook, checkout needs a session, no free-Pro path, cancel reaches Stripe, Pro+ hidden |
| Sign-in | Email code, Google, Apple, names from the provider, OAuth state in the database, diagnostic endpoint |
| Email | Resend verified, support@ sender, production code delivered |
| Data | CV pay parsing with currency, sample-data labels, measured data-sources endpoint, honest payoff copy |
| Funnel | Seven allow-listed events, money recorded server-side |
| SEO | Sitemap 191 valid https URLs, robots.txt advertising it |
| Interface | Three pricing cells, plan screen in the landing layout, Outcome Log table, centred onboarding actions, one-gesture screen change, title case throughout, menu with Sign Out beside Run Ingest and hidden when signed out, no bottom dead band |
| Repository | Rules, register, payments runbook, this plan, 29 restore tags |

## 2. Left to do, in order

| # | Item | Owner | Why it matters |
|---|---|---|---|
| 1 | PAY-01 real €19.99 payment, then refund | You | Proves revenue works |
| 2 | PAY-05 live cancellation against that subscription | You, then Us | Proves the cancel path at Stripe |
| 3 | SEC-01 rotate Stripe, webhook, Resend, Google and Apple keys | You | All appeared in chat |
| 4 | DEP-01 sign up, redeploy, confirm the account survives | You | Proves the volume |
| 5 | DEP-02 Agent off, delete `feisty-optimism` | You | Stops billing and confusion |
| 6 | DATA-08 rebuild the salary corpus on real EUR data (option A, 4–6 days) | Us, after your go | Makes the number real |
| 7 | UI-01 radar list in columns by width | Us | Density on wide screens |
| 8 | UI-07 Mercor-style structure for app screens | Us | Consistency |
| 9 | UI-03 replace remaining hardcoded colours | Us | Theme correctness |
| 10 | UI-15 empty states | Us | First-run clarity |
| 11 | UI-16 upgrade page comparison | Us | Conversion |
| 12 | DATA-02 offsite backup | Us, after DEP-01 | Safety |
| 13 | DATA-01 generative copilot and cover letters | You supply a key | Product depth |
| 14 | GRO-01 first 20 users, then GRO-02 weekly funnel report | You, then Us | Validation |

## 3. Not started, deliberately

- **EML-02** sender `brief@thinkzet.com`: ready, one variable.
- **REPO-01** rename the GitHub repo: cosmetic.
- **AUTH-03** close once you have signed in with Apple on your phone.

## 4. Rejected, do not rebuild

Centred hero and story strip · full-screen sign-in without the sidebar · logo sheen, echo and halo · the salary-band opener line.

## 5. Verification

```sh
node scripts/check.cjs           # 59 API assertions
node scripts/browser-check.cjs   # 10 route and width combinations
node scripts/billing-unit.cjs    # 9 billing checks, stubbed Stripe
node scripts/payment-check.cjs   # 19 payment safety checks
```

## 6. The four that matter

1. Trust in the salary number: sample label live, rebuild is DATA-08.
2. Payment proof: PAY-01 and PAY-05, code ready, needs your card.
3. Google and Apple sign-in: both live, confirm on your phone.
4. First 20 users: GRO-01, after PAY-01.
