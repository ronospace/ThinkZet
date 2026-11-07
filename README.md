# CareerOS AI

**The Operating System for Career Growth.** One profile. Every opportunity.

A working Opportunity OS: it ingests live listings from real sources, builds a persistent
Career Twin from a CV, scores every opportunity with calibrated probabilities, tells you
what your profile is actually worth, and remembers what happened.

---

## Run it

```bash
cd app
node server.cjs          # http://127.0.0.1:4173
```

No install step. No dependencies. Node 22+ (uses the built-in `node:sqlite`).
The database is created and seeded on first boot at `data/careeros.db`.
Live ingestion runs on boot and every 30 minutes.

**First run:** click *Load demo persona* on the sign-in screen, or sign in with any email
(the code is shown on screen — no mail provider is wired in this environment).

---

## What is actually real

| Component | Status |
|---|---|
| Ingestion from Arbeitnow / RemoteOK / Jobicy / HN Who-is-Hiring | **Real HTTP**, live, failure-isolated per source |
| Normalisation, classification, deduplication | **Real** — 1,163 raw → ~403 relevant → canonical records |
| CV parsing and Career Twin | **Real** — deterministic, against a 58-skill vocabulary |
| Match scoring and calibrated probabilities | **Real** — 7-factor model with outcome-weighted priors |
| Rate intelligence | **Real** — stratified comparables, weighted percentiles |
| Career Score, skill gaps, tracker, outcomes | **Real** |
| Auth, sessions, per-user data | **Real** — passwordless, server-side sessions |
| Paywall gating | **Real** — entitlement switch; Stripe not connected |
| Referral routing and click attribution | **Real** — isolated from ranking by design |
| Copilot | **Grounded** in your data; template-reasoned, not an external LLM call |

**Not real yet:** Stripe checkout, email delivery, a hosted production database,
and the seeded opportunity corpus (clearly flagged in the Engine screen).

---

## Layout

```
careeros/
├── app/                    the product
│   ├── server.cjs          HTTP server, routes, static files
│   ├── db.cjs              schema (node:sqlite), single source of truth
│   ├── sources.cjs         live source adapters
│   ├── classify.cjs        role/seniority/location/sponsorship classification
│   ├── pipeline.cjs        normalise > dedupe > quality gate > persist
│   ├── engine.cjs          twin, matching, career score, rate intelligence
│   ├── auth.cjs            passwordless auth, sessions
│   ├── referrals.cjs       partner routing (isolated from ranking)
│   ├── taxonomy.cjs        58-skill controlled vocabulary
│   ├── corpus.cjs          seeded corpus for cold start
│   └── public/             the app (single page, no build step)
├── docs/                   19 strategy documents (source of truth for decisions)
├── scripts/                build tooling for the strategy site
└── data/                   SQLite database (gitignored)
```

---

## Principles this codebase follows

1. **Monolith first.** One server, one database, one page. No build step, no bundler.
2. **Every score must be explainable.** If a number cannot show its reasons, it does not ship.
3. **Neutrality is architectural.** The ranking module physically cannot read the referral
   module. That is enforced by module boundaries, not by policy.
4. **Failures degrade, they never cascade.** A broken source returns zero rows and reports.
5. **The outcome loop is the moat.** `outcomes` is append-only and every model reads from it.
6. **Show your work.** The Engine screen exposes what the pipeline actually did, including
   what it dropped and why.

---

## Status

Working: ingestion, twin, matching, rate intelligence, scores, gaps, tracker, brief,
saved searches, auth, paywall, referrals, copilot.

Next: real signup funnel measurement, a genuinely external LLM for the copilot,
email delivery for the brief, and Stripe.
