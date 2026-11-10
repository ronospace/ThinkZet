# ThinkZet – Mission Plan

One page. What is done, what is left, and the order to do it in.
Detail: `TASKS.md`. Rules: `ENGINEERING.md`. Payments: `PAYMENTS.md`.

Last updated: 10 November 2026 · `master` at `d1c3495` · tagged `restore-20261110-41` · tree clean.

## Where we are

Live on thinkzet.com. A real payment has been taken and Pro granted by webhook. Sign-in works by email code, Google and Apple. Salary numbers are labelled sample data. The plan page is settled. SEO plumbing is in place but Google has not indexed the site yet.

## 1. Done

| Area | State |
|---|---|
| Hosting | thinkzet.com, www redirect, volume, entrypoint, service renamed, Agent destroyed, spare project deleted |
| Payments | Stripe live, real €2 charge succeeded and refunded pending, webhook grants Pro, checkout needs a session, cancel reaches Stripe, test prices archived, production back on €19.99 |
| Sign-in | Email code, Google, Apple, provider names, display-name override, OAuth state in the database, diagnostic endpoint |
| Email | Resend verified, support@ sender, production code delivered |
| Data | CV pay parsing with currency, sample-data labels, measured data-sources endpoint |
| Funnel | Seven allow-listed events, money recorded server-side |
| SEO | Sitemap 191 https URLs, robots.txt advertising it, canonical and Organization JSON-LD server-side, Search Console verified |
| Plan page | Three equal cards, green, violet and gold, italic subtitles, one CTA baseline, active plan stated not re-offered |
| Footer | Brand row, three equal cards, thin Market Snapshot strip |
| Repository | Rules, register, payments runbook, this plan, 41 tags |

## 2. Left to do, in order

| # | Item | Owner | Why it matters |
|---|---|---|---|
| 1 | PAY-01 refund the €2 charge `ch_3UaEyc41m9e00I4D15gSQ2kV` | You | Closes the payment proof |
| 2 | PAY-05 cancel the live subscription, confirm `cancel_at_period_end` | You, then Us | Proves the cancel path |
| 3 | SEO-04 get indexed: submit the sitemap, request indexing, publish 2–3 pages that earn links | You, then Us | The site is invisible in Google today |
| 4 | PAY-06 renewal invoices carry no user id | Us | A renewal would not be attributed |
| 5 | SEC-01 rotate Stripe, webhook, Resend, Google and Apple keys | You | All appeared in chat |
| 6 | DEP-01 sign up, redeploy, confirm the account survives | You | Proves the volume |
| 7 | DATA-08 rebuild the salary corpus on real EUR data (4–6 days) | Us, on your go | Makes the number real |
| 8 | Build the Pro+ comparison features the card promises | Us | Otherwise the tier sells nothing |
| 9 | UI-01 radar columns, UI-15 empty states, UI-16 upgrade comparison | Us | Polish with measurable value |
| 10 | DATA-02 offsite backup | Us, after DEP-01 | Safety |
| 11 | GRO-01 first 20 users, then GRO-02 weekly funnel report | You, then Us | Validation |

## 3. Why the site is not in Google yet

Everything a crawler needs is now served: sitemap 200, robots advertising it, canonical on every page, JSON-LD identity, no noindex, Googlebot and Bingbot both get 200. What is missing is not plumbing:

- A new domain takes days to weeks to be indexed, even when submitted.
- The sitemap was only fixed today; before that every URL pointed at `127.0.0.1`.
- Nothing links to thinkzet.com, and Google needs a reason to crawl a site nobody references.

## 4. Rejected, do not rebuild

Centred hero and story strip · full-screen sign-in without the sidebar · logo sheen, echo and halo · the salary-band opener line · the compressed 660px plan cards · status badges on plan cards.

## 5. Verification

```sh
node scripts/check.cjs           # 59 API assertions
node scripts/browser-check.cjs   # 10 route and width combinations
node scripts/billing-unit.cjs    # 9 billing checks, stubbed Stripe
node scripts/payment-check.cjs   # 20 payment safety checks
```

## 6. The four that matter

1. Trust in the salary number: sample label live, rebuild is DATA-08.
2. Payment proof: charge succeeded, refund outstanding.
3. Both sign-ins: live and confirmed.
4. First 20 users: GRO-01, after the refund.
