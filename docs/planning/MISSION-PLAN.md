# ThinkZet – Mission Plan

**One page. The order things happen in. Every row names who acts, what proves it, and where it is written down.**

Last updated: 15 November 2026. Owner: founder. Maintained with `docs/planning/TASKS.md`.

---

## 1. Where the product stands

| | |
|---|---|
| Product | **ThinkZet** – career and salary intelligence. A product of ZyraFlow GmbH™. |
| Live | **https://thinkzet.com** (Railway, container, SQLite on a mounted volume) |
| Repo | `ronospace/ThinkZet`, branch `master`, tag `restore-20261113-52` |
| Consumer surfaces | landing, rate check, 14 signed-in screens, 219 sitemap URLs across 169 market routes |
| Operator surfaces | `/console` – Launch, Engine, Partners, Leads, Email, Funnel. Founder session only, `noindex`, 404 to everyone else |
| Languages | English and German, chosen independently of market and of currency |
| Money | Stripe live. Pro €19.99/month or €149.99/year. Pro+ €49/month. Proven end to end with a real charge and a real refund |
| Tests | 62 API assertions, 17 LLM unit assertions, 10 browser route/width checks |
| Dependencies | zero. `node:sqlite` only. No build step |

---

## 2. The mission, in one paragraph

People do not want listings. They want to know what they are worth, what they are missing, and which move
pays. ThinkZet answers those three questions from live postings and the person's own record, and it never
prints a number it cannot defend: every figure carries its sample, its confidence and the date it was read.
The product wins by being the only career surface a professional trusts more than their own guess.

---

## 3. Mission plan – the order of work

Four phases. A phase starts only when the one above it is green. Each row is verifiable from the repo or
from production, not from memory.

### Phase A – Trust the foundation (closes this sprint)

| # | Mission | Who | Proof it is done | State |
|---|---|---|---|---|
| A-1 | The consumer product carries no operator surface at any layer | me | `/console` and `/internal.js` 404 to a signed-out visitor; public HTML greps zero for Operations, Ingest, Demo Mode, Founder, Admin, Debug, Funnel, Leads; 342 KB response, no internal markup | done `UI-145` |
| A-2 | Internal functionality lives in its own environment | me | `public/internal.js` + `public/console.html`, founder session only, `X-Robots-Tag: noindex`, not referenced by `index.html` | done `UI-145` |
| A-3 | The declared language matches the rendered language | me | `/de` returns `lang="de"` with German copy; `/gb?lang=de` returns German in GBP; `en-<market>` hreflang otherwise | done `UI-145` |
| A-4 | The hero says what the product does, in words a stranger can repeat | me | three-bullet brief under the lede, one promise per instrument | done `UI-145` |
| A-5 | The one guard between a model and a changed fact is tested | me | `node scripts/llm-unit.cjs` → 17/17 | done `UI-145` |
| A-6 | A preview never shows a role from another discipline | me | `/api/public/preview` filters on `role_family`; `Product Lead` classifies as `product` | done `UI-145` |
| A-7 | Rotate the Apple `.p8` that was pasted in chat, update Railway, revoke the old key | **founder** | Apple sign-in completes in one attempt after the rotation | ready – `SEC-01-APPLE-ROTATION.md` |
| A-8 | Create one S3-compatible bucket and set the four `S3_*` variables | **founder** | `node scripts/backup.cjs` writes, restores and verifies | ready – `DATA-02` |
| A-9 | Request indexing for `/`, `/de`, `/gb`, `/us` in Search Console | **founder** | four URLs reported as indexed | ready – `SEO-08` |

### Phase B – First revenue (the only growth that matters now)

| # | Mission | Who | Proof it is done | State |
|---|---|---|---|---|
| B-1 | Run the full rate check on your own profile and read it as a stranger | **founder** | the number, the sample and the confidence you would defend out loud | ready |
| B-2 | Invite five people individually, each to the free check | **founder** | five completed checks, five email addresses | ready – copy in `GRO-01-FIRST-20.md` |
| B-3 | Answer the first feedback row the same day | me | the feedback appears on `/console` → Leads and is answered in the product | ready |
| B-4 | Convert the first paying user | both | a live Stripe subscription, not a test charge | waiting on B-2 |
| B-5 | Reach 20 completed checks | both | 20 rows in the funnel at `/console` → Funnel | waiting on B-2 |

### Phase C – Make the loop self-sustaining

| # | Mission | Who | Proof it is done | State |
|---|---|---|---|---|
| C-1 | Testimonials on the landing page, from real users only | me | at least three attributed quotes, each traceable to a paying user | blocked: needs a cohort |
| C-2 | Outcome loop: users report interviews and offers | both | `outcomes` rows > 0, and Career Calibration leaves Market Baseline | waiting on B-4 |
| C-3 | Widen the live corpus where it is thinnest | both | per-pool depth recorded in the register; no market prints a band it cannot defend | partial – Adzuna live |
| C-4 | A model provider for the copilot, if it earns its cost | founder | `LLM_ENDPOINT` + key + model set, `/api/copilot` reports `mode: model`, and 17/17 still pass | deferred |

### Phase D – Scale, only after C is green

| # | Mission | Who | Proof it is done | State |
|---|---|---|---|---|
| D-1 | Pro+ value review: relocation, contract vs permanent, tax and living cost, offer briefs | both | a written answer in the register, priced against what it costs to run | paused by founder |
| D-2 | Second language beyond German, driven by corpus share | me | one row added to `i18n.cjs`, nothing else changed | not started |
| D-3 | Team accounts and shared pipelines | both | a design, not code, until B-5 is done | not started |

---

## 4. What is deliberately not being built

| Not building | Why |
|---|---|
| A job board or an aggregator | the product answers a decision, it does not list inventory |
| Anything that implies one home market | ThinkZet is global; Germany is one market among many (RULES 17) |
| A second implementation of the rate engine for the landing page | one engine, or the preview and the product drift apart (RULES 19) |
| Admin or operator controls inside the consumer app | RULES 20 |
| Charts from formulas or sample data | RULES 6; an honest empty state instead |
| A build step, a bundler or a framework | zero dependencies is a feature at this size |
| Consulting or done-for-you services | the product is the business |

---

## 5. The rules that govern every change

Twenty-one sections in `docs/planning/RULES.md`. The five that decide most arguments:

1. **Measure, never guess** (1). Computed geometry, real Tab events, actual bytes.
2. **One scale, no exceptions** (2). Every size is a token, in both themes.
3. **Global by default, never one country** (17). Market, language and currency are three settings.
4. **A hidden thing is not a removed thing** (20). Strip it server-side or it is still delivered.
5. **The declared language is the rendered language** (21). The tag can only name what the page speaks.

---

## 6. How progress is recorded

| File | Holds |
|---|---|
| `docs/planning/MISSION-PLAN.md` | this page: the order of work |
| `docs/planning/TASKS.md` | the queue, with who acts on each row |
| `docs/planning/RECOMMENDATIONS.md` | 92 numbered rows, R-01…R-92, none open |
| `docs/planning/RULES.md` | 21 sections of engineering law |
| `docs/planning/PROGRESS.md` | what shipped, with commit and tag per row |
| `docs/planning/AUDIT-2026-11-11.md` | the 20-screen audit and what has closed since |
| `docs/planning/GRO-01-FIRST-20.md` | the invite copy and the first-20 runbook |
| `docs/planning/PAYMENTS.md` | Stripe runbook, product and price ids |
| `docs/planning/SEC-01-APPLE-ROTATION.md` | the key rotation runbook |

A row is closed only when production proves it. A commit is not proof, and neither is a screenshot of a
build that has not been deployed.
