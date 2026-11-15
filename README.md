# ThinkZet

**Career and salary intelligence.** An independent product by ZyraFlow GmbH™.

> Think beyond. Build what's next.

ThinkZet reads live job postings, prices your exact profile against them, and tells you the number your
employer never showed you - then scores every opportunity that pays it.

Live at **https://thinkzet.com**.

---

## Contents

1. [Run it](#1-run-it)
2. [What the product is](#2-what-the-product-is)
3. [Architecture](#3-architecture)
4. [The consumer and operator split](#4-the-consumer-and-operator-split)
5. [Language, market and currency](#5-language-market-and-currency)
6. [What is real](#6-what-is-real)
7. [Repository layout](#7-repository-layout)
8. [Tests](#8-tests)
9. [Deploy](#9-deploy)
10. [Documentation](#10-documentation)
11. [Brand](#11-brand)

---

## 1. Run it

```bash
cd app
node server.cjs            # http://127.0.0.1:4173
```

No install. No dependencies. Node 22 or newer, for the built-in `node:sqlite`. The database is created and
seeded on first boot at `data/careeros.db`; live ingestion runs on boot and every 30 minutes.

First visit shows the landing page. Sign in with any email - the six-digit code is printed to the server log
when no mail provider is configured. The operator console is at `/console` and only opens for an address
listed in `FOUNDER_EMAILS`.

---

## 2. What the product is

| | |
|---|---|
| **Answers** | What am I worth, what am I missing, which move pays |
| **Not** | a job board, an agency, a CV builder, a LinkedIn clone |
| **Unit** | one opportunity, scored against one person's Career Twin |
| **Proof** | every figure carries its sample size, its confidence and the date it was read |
| **Free** | the rate gap check, ten scored opportunities, a five-item tracker |
| **Paid** | Pro EUR 19.99/month or 149.99/year. Pro+ EUR 49/month |

---

## 3. Architecture

```
browser ──▶ server.cjs ──▶ engine.cjs ──▶ SQLite (node:sqlite)
                │              │
                │              ├─ rate intelligence   stratified comparables, trimmed percentiles
                │              ├─ matching            seven factors, outcome-weighted priors
                │              └─ career twin         the profile everything is scored against
                │
                ├─ sources.cjs      live adapters, failure-isolated per source
                ├─ pipeline.cjs     normalise, dedupe, quality gate, persist
                ├─ markets.cjs      one registry: country, currency, region, language
                ├─ i18n.cjs         one string table: English, German
                └─ fx.cjs           display-only conversion, declares its rate date
```

No build step, no bundler, no framework. One process, one database, one page.

---

## 4. The consumer and operator split

The consumer application carries the product and nothing else.

| Layer | Consumer | Operator |
|---|---|---|
| Page | `/` and every market route | `/console` |
| Code | `public/index.html` | `public/internal.js` |
| Session | any visitor | `FOUNDER_EMAILS` allowlist |
| Indexing | canonical, hreflang, sitemap | `X-Robots-Tag: noindex, nofollow, noarchive` |
| Response | internal blocks stripped server-side | served whole |

Three mechanisms enforce it, and none of them is a hidden attribute:

1. **Markers and stripping.** Operator markup sits between `@internal:start` and `@internal:end`, and
   `stripInternal()` removes it before the response leaves for a non-founder. The bytes are never sent.
2. **A separate file.** The six operator screens live in `public/internal.js`, which `index.html` does not
   reference. The consumer bundle defines none of those functions.
3. **A closed view map.** A view that is not in the consumer map renders "This Screen Is Not Part of the
   Product" for everyone, founder included.

Verified by fetching `/` signed out and as Googlebot, then grepping the response for every operator word. The
count is zero, not hidden.

---

## 5. Language, market and currency

Three settings, three answers, never inferred from each other.

| Setting | Chosen by | Example |
|---|---|---|
| Market | the route, a `?market=` parameter, or `Accept-Language` | `/de`, `/gb`, `/us`, 60 countries in the registry |
| Interface language | `?lang=`, then `Accept-Language`, then the market's own language | `/gb?lang=de` is German copy in GBP |
| Currency | the market's currency, converted for display only | a GBP page prints GBP with the rate date |

`/uk` is a permanent redirect to `/gb`, never a second page. A country code in the registry is a real page
that answers 200 to a browser and to Googlebot; a code that is not in the registry answers 404. The sitemap is
generated from the same registry, so a listed route can never 404 and a 404 route can never be listed.

---

## 6. What is real

| Component | Status |
|---|---|
| Ingestion | real HTTP from Arbeitnow, RemoteOK, Jobicy, HN Who-is-Hiring, Remotive, We Work Remotely, Adzuna. Failure-isolated per source |
| Normalisation, classification, deduplication | real - Jaccard title similarity plus company, city and compensation bucket, merged above 0.72 |
| Career Twin and match scoring | real - deterministic, seven factors, 58-skill vocabulary |
| Rate intelligence | real - stratified comparables, trimmed percentiles, country then currency area then global |
| Career Score, skill gaps, tracker, outcomes, calibration | real |
| Auth | real - passwordless email code, Google, Apple; rolling 180-day sessions |
| Billing | real - Stripe live, proven with a charge, a refund and a downgrade |
| Email | real - Resend, with an outbox fallback and signed unsubscribe links |
| Copilot | grounded in your own data; deterministic composer, optionally rephrased by a model behind three variables |
| Currency conversion | real rates from the Frankfurter API, cached 12 hours, display only |

**Not real yet:** a model provider key for the copilot, so it ships as rules mode.

---

## 7. Repository layout

```
thinkzet/
├── README.md                this file
├── railway.json             Railway build and volume config
├── env.example              every variable the app reads, documented
├── app/
│   ├── server.cjs           HTTP server, routes, static, SEO, i18n injection
│   ├── db.cjs               schema and migrations
│   ├── sources.cjs          live source adapters
│   ├── classify.cjs         role family, seniority, location, sponsorship
│   ├── pipeline.cjs         normalise, dedupe, quality gate, persist
│   ├── engine.cjs           twin, matching, career score, rate intelligence
│   ├── markets.cjs          market registry: country, currency, region, language
│   ├── i18n.cjs             interface strings, English and German
│   ├── fx.cjs               display-only currency conversion
│   ├── billing.cjs          Stripe checkout, webhooks, reconciliation
│   ├── mailer.cjs           Resend, Postmark, outbox, sequences
│   ├── auth.cjs             passwordless auth, OAuth, sessions
│   ├── analytics.cjs        event tracking and funnel
│   ├── referrals.cjs        partner routing, isolated from ranking
│   ├── trajectory.cjs       career path simulation
│   ├── confidence.cjs       evidence quality per opportunity
│   ├── coverletter.cjs      letters, evidence-traced
│   ├── interview.cjs        gap-driven prep plans
│   ├── taxonomy.cjs         58-skill controlled vocabulary
│   ├── llm.cjs              optional model phrasing, never in front of the facts
│   ├── corpus.cjs           seeded corpus for cold start
│   └── public/
│       ├── index.html       the consumer product, one page
│       ├── console.html     the operator console, founder only
│       ├── internal.js      operator screens, never loaded by index.html
│       ├── style.css        design tokens, both themes
│       ├── icon.svg         the Z mark
│       └── legal/           privacy and terms
├── deploy/                  Railway, Hetzner and Fly runbooks and config
├── docs/
│   ├── ENGINEERING.md       how the code is written
│   ├── planning/            mission plan, tasks, rules, register, progress, runbooks
│   └── strategy/            19 strategy documents
├── scripts/                 tests, backup, rebrand, screenshot tooling
└── data/                    SQLite database, gitignored
```

---

## 8. Tests

```bash
node scripts/check.cjs        # 62 API assertions and invariants
node scripts/llm-unit.cjs     # 17 assertions on the model guard
node scripts/browser-check.cjs  # 10 route and width combinations, zero console errors
node scripts/billing-unit.cjs   # 9 pricing and entitlement assertions
```

The API suite covers every route the UI depends on, plus invariants that must never break: scores in range,
offer probability never exceeding interview probability, compensation within plausible bounds, rate
percentiles ordered, five trajectory paths. The browser suite catches client-side throws the API suite cannot
see. The LLM suite pins the one guard that stops a model from changing a number.

---

## 9. Deploy

| Target | Setup | Notes |
|---|---|---|
| **Railway** | `railway.json` + `deploy/Dockerfile` | live today at thinkzet.com. Volume at `/app/data` |
| **Hetzner CX22** | `deploy/provision.sh` | systemd, Caddy TLS, ufw, fail2ban, nightly backup |
| **Fly.io** | `deploy/Dockerfile` | container plus volume, SSH access |

Runbooks in `deploy/README.md`, `deploy/RAILWAY.md` and `deploy/FLY.md`. The persistence procedure is written
out step by step in `docs/planning/PROGRESS.md` (DEP-04).

---

## 10. Documentation

| File | Holds |
|---|---|
| `docs/planning/MISSION-PLAN.md` | the order of work, phase by phase |
| `docs/planning/TASKS.md` | the queue, with who acts on each row |
| `docs/planning/RULES.md` | 21 sections of engineering law |
| `docs/planning/RECOMMENDATIONS.md` | 92 numbered rows, R-01 to R-92 |
| `docs/planning/PROGRESS.md` | what shipped, with a commit and a tag per row |
| `docs/planning/AUDIT-2026-11-11.md` | the 20-screen audit and what has closed |
| `docs/planning/GRO-01-FIRST-20.md` | the first-20 invite runbook |
| `docs/planning/PAYMENTS.md` | Stripe product, prices, webhook |
| `docs/planning/SEC-01-APPLE-ROTATION.md` | the Apple key rotation runbook |
| `docs/ENGINEERING.md` | how the code is written |
| `docs/strategy/` | 19 strategy documents: market, moat, GTM, financial model |

---

## 11. Brand

| | |
|---|---|
| Product | ThinkZet |
| Descriptor | Career and salary intelligence |
| Tagline | Think beyond. Build what's next. |
| Company | ZyraFlow GmbH™ |
| Attribution | ThinkZet is a product of ZyraFlow GmbH™. |
| Copyright | © 2026 ZyraFlow GmbH™. All rights reserved. |

The company name appears only in the legal footer. A customer buys the product, not the holding company.

---

## Principles this codebase follows

1. **Monolith first.** One server, one database, one page. No build step, no bundler.
2. **Every score must be explainable.** A number that cannot show its reasons does not ship.
3. **Neutrality is architectural.** The ranking module cannot read the referral module.
4. **Failures degrade, they never cascade.** A broken source returns zero rows and reports.
5. **The outcome loop is the moat.** `outcomes` is append-only and every model reads from it.
6. **A hidden thing is not a removed thing.** Operator surfaces are stripped server-side, not styled away.
7. **The declared language is the rendered language.** `lang`, hreflang and the copy are one statement.
8. **No page invents a colour.** Every colour is a token, defined twice, once per theme.
