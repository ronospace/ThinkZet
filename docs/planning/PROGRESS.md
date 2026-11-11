# ThinkZet – Mission Plan

One page. What is done, what is left, and the order to do it in.
Detail: `TASKS.md`. Rules: `ENGINEERING.md`. Payments: `PAYMENTS.md`. Snapshot: `STATUS-2026-11-11.md`.

Last updated: 11 November 2026 · `master` at `dd644a8` · tagged `restore-20261111-29` · tree clean, nothing unpushed.

## Where we are

Live on thinkzet.com. Real money has been taken and Pro granted by webhook. Sign-in works by email code, Google and Apple.
Benchmarks are built only from live postings that state pay. Ads are wired but stay invisible until AdSense fills a unit.
Sitemap submitted, homepage indexed. First paying cohort not started: GRO-01 is paused at the founder's instruction.

## The one question every task must answer

> Will this get us closer to the first 100 paying users?

If the answer is no, it is not next.

## 1. Done and verified

| Area | State |
|---|---|
| Hosting | thinkzet.com, www redirect, persistent volume, entrypoint drops privileges, service renamed |
| Persistence | DEP-01 closed: display name and tracker state survived a redeploy |
| Payments | Stripe live, real charge taken, webhook grants and revokes, checkout needs a session, cancel reaches Stripe |
| Sign-in | Email code, Google, Apple, provider names, display-name override, OAuth state stored, diagnostic endpoint |
| Email | Resend verified, dark-only colour scheme, brief and alert templates |
| Benchmarks | Live-only corpus, market-aware pooling (country, then currency, then global, remote separate), depth gate |
| Data quality | De-duplicated salary corpus, single sample size and confidence, thin samples report a range |
| Product | Radar, brief, rate check, tracker, negotiation, trajectory, gaps, cover letters, interview prep, copilot |
| Feedback | Rating with stored distribution, one per surface, collapses to one line, read on the Leads screen |
| SEO | 206 URLs, robots, canonical, JSON-LD, Search Console verified |
| Ads | Free plans only, consent first, slot collapsed until a creative renders |
| Security | Security headers, rate limiting, 404 for unknown paths, GDPR export and delete |

## 2. Open – founder

| ID | Task | Why it blocks |
|---|---|---|
| SEC-01 | Apple `.p8` rotation | Last exposed key. Runbook: `SEC-01-APPLE-ROTATION.md` |
| GRO-01 | First 20 users | Paused by you; the runbook is ready in `GRO-01-FIRST-20.md` |
| DATA-13 | Adzuna app id and key | One credential opens DE, GB, CH and US salary pools |
| MON-01 | AdSense site review | Cannot be requested until Google asks |

## 3. Open – engineering

| ID | Task | Note |
|---|---|---|
| DATA-10, DATA-13 | Pool depth | Live corpus is 262 records; every pool needs 30 to diverge |
| DATA-06 | EUR source expansion | Needs the credentials above, not code |
| FB-03 | Testimonials | Needs a paying cohort first |
| Pro+ | Comparison screen | `/api/markets` is built; the screen comes with the rest of Pro+ |
| COPY-14 | Demo label | Cosmetic, not on the launch path |

## 4. Order of work

1. Rotate the Apple key, then confirm both providers still report true.
2. Get the Adzuna credential and wire DE, GB, CH and US behind the existing gate.
3. Run the first cohort from the runbook and record the four facts per person.
4. Only then: Pro+ comparison screen, testimonials, and the demo label.

## 5. What we deliberately do not build

| Not building | Why |
|---|---|
| In-app application submission | Needs per-employer integrations and would let us claim applications that were never sent |
| Employer-side data product | It would compromise the neutrality the whole product rests on |
| Multi-column radar | Rejected in review; one ranked column reads better at every width |
| EUR-only benchmarking | Contradicts a worldwide product; pooling is market-aware instead |
