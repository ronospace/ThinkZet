# ThinkZet – Mission Plan

One page. What is done, what is left, and the order to do it in.
Detail: `TASKS.md`. Rules: `ENGINEERING.md`. Payments: `PAYMENTS.md`.

Last updated: 10 November 2026 · `master` at `899def2` · tagged `restore-20261110-35` · tree clean.

## Where we are

Live on thinkzet.com. Sign-in works by email code, Google and Apple. Payments are live and guarded. Salary numbers are labelled sample data. Plan page settled: three equal cards, green, violet and gold, italic subtitles, one CTA baseline. 59 API checks, 10 browser checks, 9 billing checks and 19 payment checks pass.

## 1. Done

| Area | State |
|---|---|
| Hosting | thinkzet.com, www redirect, volume, entrypoint, service renamed, Agent destroyed, spare project deleted |
| Payments | Stripe live, six-event webhook, checkout needs a session, no free-Pro path, cancel reaches Stripe, Pro+ hidden from checkout |
| Sign-in | Email code, Google, Apple, provider names, display-name override, OAuth state in the database, diagnostic endpoint |
| Email | Resend verified, support@ sender, production code delivered |
| Data | CV pay parsing with currency, sample-data labels, measured data-sources endpoint, honest payoff copy |
| Funnel | Seven allow-listed events, money recorded server-side |
| SEO | Sitemap 191 valid https URLs, robots.txt advertising it, Search Console verified |
| Plan page | Three equal cards, 6/6/6 density, one CTA baseline, subtitles below the price in italic, green/violet/gold surrounds, no status badges |
| Footer | Brand row, three equal cards, thin Market Snapshot strip |
| Repository | Rules, register, payments runbook, this plan, 71 tags |

## 2. Left to do, in order

| # | Item | Owner | Why it matters |
|---|---|---|---|
| 1 | PAY-01 real €2 payment, then refund | You | Proves revenue works |
| 2 | PAY-05 live cancellation against that subscription | You, then Us | Proves the cancel path at Stripe |
| 3 | SEC-01 rotate Stripe, webhook, Resend, Google and Apple keys | You | All appeared in chat |
| 4 | DEP-01 sign up, redeploy, confirm the account survives | You | Proves the volume |
| 5 | DATA-08 rebuild the salary corpus on real EUR data (4–6 days) | Us, on your go | Makes the number real |
| 6 | Build the Pro+ features the card now promises: relocation and offer comparison | Us | Otherwise the tier sells nothing |
| 7 | UI-01 radar list in columns by width | Us | Density on wide screens |
| 8 | UI-15 empty states | Us | First-run clarity |
| 9 | UI-16 upgrade page comparison | Us | Conversion |
| 10 | DATA-02 offsite backup | Us, after DEP-01 | Safety |
| 11 | DATA-01 generative copilot | You supply a key | Product depth |
| 12 | GRO-01 first 20 users, then GRO-02 weekly funnel report | You, then Us | Validation |

## 3. Not started, deliberately

- **EML-02** sender `brief@thinkzet.com`: one variable.
- **REPO-01** rename the GitHub repo: cosmetic.
- **UI-03** remaining hardcoded colours: audit.

## 4. Rejected, do not rebuild

Centred hero and story strip · full-screen sign-in without the sidebar · logo sheen, echo and halo · the salary-band opener line · the compressed 660px plan cards · status badges on plan cards.

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
3. Both sign-ins: live, confirmed on your phone.
4. First 20 users: GRO-01, after PAY-01.
