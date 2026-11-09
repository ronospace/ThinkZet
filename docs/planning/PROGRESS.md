# ThinkZet – Progress Board

One screen for what is done, what is moving, what is not started and what comes later.
Detail lives in `TASKS.md`; this file is the summary the founder reads.

Last updated: 9 November 2026 · `master` at `b0687af` · tagged `restore-20261109-10` · working tree clean.

## At a glance

| | Count |
|---|---|
| Done, verified and pushed | 43 |
| In progress | 1 |
| Not started | 9 |
| Blocked, waiting on the founder | 8 |
| Planned, not scheduled | 4 |
| Rejected, do not rebuild | 4 |

## 1. Done

| Area | What works | Proof |
|---|---|---|
| Deployment | thinkzet.com live on Railway, `www` redirects, volume mounted, entrypoint fixes ownership | health 200, launch ready |
| Payments | Stripe live product and prices, six-event webhook, checkout requires a session, no free-Pro path, cancellation reaches Stripe | payment-check 19/19, billing-unit 9/9 |
| Pro+ | Hidden everywhere until the coach session and relocation pack exist | landing page has no Pro+ |
| Auth | Email code sign-in, Google and Apple built and gated on credentials, names never taken from the email | round trip signed in |
| Email | Resend verified, `support@thinkzet.com` sender, production login code delivered | production queue `sent` |
| Data | CV pay parsing with currency and period, sample-data label on every salary figure, measured data-sources endpoint | 15 parse cases, 4 CV profiles |
| Funnel | Seven allow-listed events, money recorded server-side | known 200, unknown 400 |
| Interface | Three pricing cells, live pill beside the title, one-gesture screen change, title case, footer contacts | 10/10 browser |
| Repository | Rules, task register, payments runbook, this board, 10 restore tags | clean tree |

## 2. In progress

| ID | Task | State |
|---|---|---|
| UI-02 | Structure audit of the remaining screens at phone and desktop widths | Started, not finished |

## 3. Not started

| ID | Task | Note |
|---|---|---|
| UI-01 | Radar list in columns, 1 / 2 / 3 by width | Queued |
| UI-07 | Mercor-style structure for app screens | Queued |
| UI-03 | Replace the remaining hardcoded colours with tokens | Queued |
| DATA-02 | Offsite backup of the SQLite volume | Needs DEP-01 |
| EML-02 | Sender `brief@thinkzet.com` | EML-01 cleared, ready |
| DEP-03 | Rename the Railway service to ThinkZet | Railway UI |
| DEP-02 | Delete `feisty-optimism`, switch Agent off | Railway UI |
| REPO-01 | Rename the GitHub repo to ThinkZet | GitHub UI |
| SEC-01 | Rotate Stripe, webhook and Resend keys | All three appeared in chat |

## 4. Blocked on the founder

| ID | Task | What unblocks it |
|---|---|---|
| PAY-01 | Real €19.99 payment, then refund | Your card |
| PAY-05 | Live cancellation against a real subscription | PAY-01 |
| AUTH-01 | Google client id and secret | Google Cloud Console |
| AUTH-02 | Apple services id, team id, key id, private key | Apple developer |
| AUTH-03 | Test both providers live | AUTH-01, AUTH-02 |
| DEP-01 | Volume survives a redeploy | Sign up, redeploy, reload |
| GRO-01 | Send the link to the first 20 people | PAY-01 |
| DATA-01 | Generative copilot and cover letters | An LLM key |

## 5. Planned, not scheduled

| ID | Task |
|---|---|
| UI-15 | Empty states: no opportunities, no salary data, no matches, no saved searches, new account |
| UI-16 | Upgrade page comparison of Free against Pro with expected outcomes |
| DATA-08 | Rebuild the salary corpus on real EUR data (option A, 4–6 days) |
| GRO-02 | Weekly funnel and leads report once GRO-01 runs |

## 6. Rejected, do not rebuild

Centred hero and story strip · full-screen sign-in without the sidebar · logo sheen, echo and halo · the salary-band opener line.

## 7. The four that matter

| Rank | Item | Why |
|---|---|---|
| 1 | Trust in the salary number | Sample label and data sources are live; the rebuild (DATA-08) is what makes the number real |
| 2 | Payment proof | PAY-01 and PAY-05 need your card, the code is ready |
| 3 | Google sign-in | AUTH-01, one client id and secret |
| 4 | First 20 users | GRO-01, after PAY-01 |

## 8. Verification commands

```sh
node scripts/check.cjs           # 59 API assertions
node scripts/browser-check.cjs   # 10 route and width combinations
node scripts/billing-unit.cjs    # 9 billing checks, stubbed Stripe
node scripts/payment-check.cjs   # 19 payment safety checks, two isolated servers
```
