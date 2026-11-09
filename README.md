# ThinkZet AI

**AI Intelligence Platform.** An independent product by ZyraFlow GmbH™.

> Think beyond. Build what's next.

ThinkZet reads live job postings, prices your exact profile against them, and tells you the
number your employer never showed you — then scores every opportunity that pays it.

---

## Run it

```bash
cd app
node server.cjs            # http://127.0.0.1:4173
```

No install. No dependencies. Node 22+ (uses the built-in `node:sqlite`).
The database is created and seeded on first boot at `data/careeros.db`.
Live ingestion runs on boot and every 30 minutes.

First visit shows the landing page. **Sign in** with any email — the 6-digit code appears on
screen because no mail provider is configured locally. Or **Load demo persona**.

---

## What is real

| Component | Status |
|---|---|
| Ingestion from Arbeitnow, RemoteOK, Jobicy, HN Who-is-Hiring | real HTTP, live, failure-isolated per source |
| Normalisation, classification, deduplication | real — 1,163 raw → ~474 relevant → canonical records |
| CV parsing and Career Twin | real — deterministic, 58-skill vocabulary |
| Match scoring and calibrated probabilities | real — 7-factor model with outcome-weighted priors |
| Rate intelligence | real — stratified comparables, trimmed percentiles |
| Career Score, skill gaps, tracker, outcomes | real |
| Auth, sessions, per-user data | real — passwordless, HttpOnly cookies |
| Paywall gating | real — Stripe live, entitlement switch |
| Referral routing and click attribution | real — isolated from ranking by module boundary |
| Email delivery | real — Resend, with an outbox fallback |
| Copilot | grounded in your data; deterministic composer, not generative |

**Not real yet:** a model provider for the copilot.

---

## Layout

```
thinkzet/
├── app/                     the product
│   ├── server.cjs           HTTP server, routes, static files
│   ├── db.cjs               schema and migrations (node:sqlite)
│   ├── sources.cjs          live source adapters
│   ├── classify.cjs         role, seniority, location, sponsorship, degree
│   ├── pipeline.cjs         normalise, dedupe, quality gate, persist
│   ├── engine.cjs           twin, matching, career score, rate intelligence
│   ├── billing.cjs          Stripe checkout, webhooks, reconciliation
│   ├── mailer.cjs           Resend, Postmark, outbox, sequences
│   ├── analytics.cjs        event tracking and funnel
│   ├── auth.cjs             passwordless auth, sessions
│   ├── referrals.cjs        partner routing, isolated from ranking
│   ├── trajectory.cjs       career path simulation
│   ├── confidence.cjs       evidence quality per opportunity
│   ├── coverletter.cjs      letters, evidence-traced
│   ├── interview.cjs        gap-driven prep plans
│   ├── taxonomy.cjs         58-skill controlled vocabulary
│   ├── corpus.cjs           seeded corpus for cold start
│   └── public/              the app, single page, no build step
├── deploy/                  provisioning for Hetzner, Railway and Fly
├── docs/
│   ├── planning/            missions, status, brand, naming, launch
│   └── strategy/            19 strategy documents
├── scripts/                 tests, rebrand, build tooling
└── data/                    SQLite database (gitignored)
```

---

## Test it

```bash
node scripts/check.cjs            # 57 API assertions plus invariants
node scripts/browser-check.cjs    # 10 route/width combinations, zero console errors
node scripts/mobile-shot.cjs 390 844 http://127.0.0.1:4173/ /tmp/mobile.png
```

The API suite covers every route the UI depends on, plus invariants that must never break:
scores in range, offer probability never exceeding interview probability, compensation
within plausible bounds, rate percentiles ordered, five trajectory paths.
The browser suite catches client-side throws the API suite cannot see.

---

## Deploy it

| Target | Setup | Notes |
|---|---|---|
| **Hetzner CX22** | `deploy/provision.sh` | systemd, Caddy TLS, ufw, fail2ban, nightly backup |
| **Railway** | `deploy/railway.json` | fastest start, no SSH |
| **Fly.io** | `deploy/Dockerfile` | container plus volume, SSH access |

Full runbooks in `deploy/README.md`, `deploy/RAILWAY.md` and `deploy/FLY.md`.

---

## Principles this codebase follows

1. **Monolith first.** One server, one database, one page. No build step, no bundler.
2. **Every score must be explainable.** A number that cannot show its reasons does not ship.
3. **Neutrality is architectural.** The ranking module cannot read the referral module.
4. **Failures degrade, they never cascade.** A broken source returns zero rows and reports.
5. **The outcome loop is the moat.** `outcomes` is append-only and every model reads from it.
6. **Show your work.** The Engine screen exposes what the pipeline did, including what it dropped.
7. **No page invents a colour.** Every colour is a token, defined twice, once per theme.

---

## Brand

| | |
|---|---|
| Product | ThinkZet |
| Descriptor | AI Intelligence Platform |
| Tagline | Think beyond. Build what's next. |
| Company | ZyraFlow GmbH™ |
| Attribution | An independent product by ZyraFlow GmbH™ |
| Copyright | © 2026 ZyraFlow GmbH™ |

Rename the product everywhere with one command:

```bash
node scripts/rebrand.cjs "New Name"
```

---

## Status

89 commits. 57 API assertions and 10 browser checks passing. Zero dependencies.

Launch gate reads green. Remaining: a model provider key for the copilot, and a permanent
host once the Hetzner account clears.

- Progress board: `docs/planning/PROGRESS.md`
- Task register: `docs/planning/TASKS.md`
- Engineering rules: `docs/ENGINEERING.md`
- Payments runbook: `docs/planning/PAYMENTS.md`
