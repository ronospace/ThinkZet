# Technical Architecture

## 0. Architectural principles

1. **Monolith first.** One Next.js app + one API service + one Postgres. Kubernetes at 100 users is a career mistake.
2. **Modular monolith, not microservices.** Clear module boundaries (ingestion / matching / ai / billing) inside one deployable, so it can be split later *if* needed.
3. **Postgres for everything.** Relational data, JSONB for flexible payloads, pgvector for embeddings, Postgres full-text + trigram for search. Add Elasticsearch only when Postgres search is genuinely the bottleneck (likely >5M docs).
4. **Queue everything that touches the network.** Aggregation, parsing, scoring, emails — all async via a durable job queue (BullMQ on Redis, or pg-boss to avoid Redis in v1).
5. **Idempotency everywhere.** Every ingestion and job is idempotent by natural key. Scrapers fail; the system must not corrupt.
6. **Provider-agnostic AI.** Abstract LLM calls behind one interface so OpenAI/Claude/Gemini are swappable by cost, latency, or capability.
7. **Compliance is architecture.** Consent, deletion, and export are first-class data flows, not legal afterthoughts.

---

## 1. System context

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENTS                                       │
│   Next.js Web (SSR/ISR)      Flutter Mobile (Yr2)      Email (daily feed)     │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ HTTPS (JSON / tRPC / REST)
┌───────────────────────────────▼──────────────────────────────────────────────┐
│                          EDGE / CDN (Vercel + Cloudflare)                    │
│   WAF · Rate limiting · Bot protection · Cache · Image optimisation          │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────────┐
│                        APPLICATION LAYER (Node/TS)                           │
│                                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Auth &     │ │ Profile &  │ │ Opportunity│ │ Matching & │ │ Billing &  │  │
│  │ Identity   │ │ CareerTwin │ │ Feed       │ │ Scoring    │ │ Referral   │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ AI Copilot │ │ Tracking & │ │ Notif.     │ │ Analytics  │ │ Admin /    │  │
│  │ (chat)     │ │ Outcomes   │ │            │ │ Events     │ │ Ops        │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
└───────┬───────────────────┬───────────────────┬──────────────────┬──────────┘
        │                   │                   │                  │
┌───────▼───────┐ ┌─────────▼──────┐ ┌──────────▼──────┐ ┌─────────▼────────┐
│ PostgreSQL    │ │ Redis / pg-boss│ │ Object Storage  │ │ Vector Store     │
│ (primary +    │ │ (queue, cache, │ │ (S3/R2: CVs,    │ │ (pgvector)       │
│  read replica)│ │  rate limit)   │ │  exports)       │ │                  │
└───────────────┘ └────────────────┘ └─────────────────┘ └──────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        ASYNC WORKERS (separate process)                      │
│  Ingestion Scheduler · Source Adapters · Normaliser · Deduper · Scorer       │
│  Embedder · CV Parser · Outcome Calibrator · Benchmark Builder · Mailer      │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                               │
│  LLM Providers (OpenAI/Claude/Gemini) · Embeddings · Stripe/Paddle          │
│  PostHog · Resend/Postmark · Sentry · S3/R2 · Source APIs & partner feeds    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend architecture

### Stack
- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind + shadcn/ui** — speed over bespoke design
- **TanStack Query** for client cache; **server components** for feed/dashboard
- **PWA** (installable, offline shell) instead of native in Year 1
- **Flutter** app in Year 2, sharing the same API

### Structure (feature-sliced)

```
apps/web/
├── app/
│   ├── (marketing)/            # SEO pages, ISR — no auth
│   │   ├── rates/[platform]/[role]/page.tsx
│   │   ├── visa/[country]/[role]/page.tsx
│   │   ├── compare/[a]-vs-[b]/page.tsx
│   │   └── skills/[skill]/page.tsx
│   ├── (app)/                  # authed shell
│   │   ├── dashboard/
│   │   ├── radar/              # opportunity feed
│   │   ├── opportunity/[id]/   # detail + match breakdown
│   │   ├── twin/               # Career Twin
│   │   ├── scores/             # Career Score
│   │   ├── tracker/            # application pipeline
│   │   └── copilot/
│   └── api/                    # thin BFF routes only
├── features/                   # feature-sliced modules
│   ├── opportunity-feed/
│   ├── match-score/
│   ├── career-twin/
│   ├── cv-upload/
│   └── billing/
├── components/ui/              # design system primitives
└── lib/                        # api client, auth, analytics
```

### Rendering strategy

| Page type | Strategy | Why |
|---|---|---|
| Marketing / SEO pages | **ISR** (revalidate 6–24h) | Fresh data, CDN-cached, cheap |
| Dashboard / Radar | **SSR + streaming** | Personalised, fast first paint |
| Opportunity detail | SSR, cached 15 min per (user, opp) | Personalised score, cacheable |
| Copilot | Client streaming (SSE) | Token-by-token UX |
| Tracker | Client-side (TanStack Query) | Interactive kanban |

### Frontend performance budgets
- LCP < 1.8s (p75, mobile), INP < 200ms, CLS < 0.05
- JS bundle < 180KB gzip on app routes
- Skeleton states for every async surface (perceived speed)

---

## 3. Backend architecture

### Modular monolith

```
services/api/src/
├── modules/
│   ├── auth/           # sessions, OAuth, email magic link
│   ├── profile/        # users, profiles, resumes, skills
│   ├── opportunities/  # CRUD, feed, search
│   ├── matching/       # scoring engines
│   ├── career-twin/    # twin model, embeddings, history
│   ├── tracking/       # applications, interviews, outcomes
│   ├── ai/             # LLM gateway, prompts, copilot
│   ├── referral/       # programs, links, clicks, conversions
│   ├── billing/        # subscriptions, invoices, payments
│   ├── notifications/  # email, in-app, (push later)
│   ├── analytics/      # event ingestion → PostHog
│   └── admin/          # ops, moderation, data quality
├── workers/
│   ├── ingest.worker.ts
│   ├── score.worker.ts
│   ├── parse.worker.ts
│   └── calibrate.worker.ts
├── lib/                # db, logger, errors, llm, queue, auth
└── server.ts
```

**Rules:**
- Modules communicate via typed service interfaces, never by reaching into each other's tables.
- Each module owns its tables (schema-per-module naming convention: `matching_*`, `referral_*`).
- The AI module is the **only** place that calls an LLM provider.

### Deployment topology

| Stage | Topology |
|---|---|
| MVP (0–5k users) | Vercel (web) + one Node service on Fly.io/Railway + managed Postgres (Neon/Supabase) + R2 + one worker process |
| Growth (5k–100k) | Same + 2–4 worker instances + read replica + Redis |
| Scale (100k+) | Containerised on ECS/K8s, autoscaled workers, partitioned hot tables, CDN-heavy |

---

## 4. API design

**Style:** REST (tRPC internally for type safety; REST for public/partner API).
**Versioning:** `/api/v1/…`. Additive changes only; breaking changes = new version.
**Auth:** session cookie (web) or Bearer JWT (mobile/API). Partner API uses API keys + scopes.

### Core endpoints

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/magic-link

GET    /api/v1/me
PATCH  /api/v1/me
DELETE /api/v1/me                          # GDPR erasure (async, 30-day window)
GET    /api/v1/me/export                   # GDPR portability (JSON + PDF)

POST   /api/v1/resumes                     # multipart upload → parse job
GET    /api/v1/resumes/:id
GET    /api/v1/resumes/:id/parsed

GET    /api/v1/profile/skills
POST   /api/v1/profile/skills
DELETE /api/v1/profile/skills/:id
GET    /api/v1/profile/preferences

GET    /api/v1/feed?cursor=&filters=       # paginated, ranked
GET    /api/v1/opportunities/:id
GET    /api/v1/opportunities/:id/match     # full score breakdown
POST   /api/v1/opportunities/:id/save
DELETE /api/v1/opportunities/:id/save
POST   /api/v1/opportunities/:id/dismiss

GET    /api/v1/scores                      # 6 career scores + benchmarks
GET    /api/v1/scores/history?range=

GET    /api/v1/applications
POST   /api/v1/applications
PATCH  /api/v1/applications/:id
POST   /api/v1/applications/:id/outcome    # ← moat endpoint

POST   /api/v1/copilot/chat                # SSE stream
POST   /api/v1/copilot/cover-letter
POST   /api/v1/copilot/interview-prep
POST   /api/v1/copilot/negotiation

GET    /api/v1/salary/benchmark?role=&region=&skills=
GET    /api/v1/skills/:skill/trend

GET    /api/v1/referrals/programs
POST   /api/v1/referrals/click             # records click, returns redirect
GET    /api/v1/referrals/earnings

POST   /api/v1/billing/checkout
POST   /api/v1/billing/portal
POST   /api/v1/webhooks/stripe
```

### API conventions
- Cursor pagination (`?cursor=`), never offset beyond page 5.
- Every response: `{ data, meta: { requestId, cached } }`.
- Errors: RFC 7807 problem+json with a stable `code`.
- Idempotency-Key header on all POSTs that create money or state.
- Rate limits per user + per IP (Redis token bucket); LLM endpoints have a separate, tighter budget.

---

## 5. Database design

See `15-database-design.md` for the full schema. Summary:

- **Core identity:** `users`, `profiles`, `resumes`, `resume_versions`, `skills`, `profile_skills`, `preferences`
- **Opportunity universe:** `opportunities`, `opportunity_sources`, `opportunity_skills`, `employers`, `recruiters`, `opportunity_events`
- **Intelligence:** `matches`, `career_scores`, `recommendations`, `salary_records`, `skill_market_stats`
- **Action & outcome:** `applications`, `interviews`, `outcomes`, `saved_opportunities`, `activity_logs`
- **Commerce:** `referral_programs`, `referral_links`, `referral_clicks`, `referral_earnings`, `subscriptions`, `invoices`, `payments`
- **Content:** `courses`, `certifications`, `providers`, `bookings`
- **Comms:** `messages`, `notifications`, `email_events`

**Key design decisions:**
- `opportunities` has a `canonical_id` + `content_hash` for dedup; sources reference the canonical record.
- Skills are a **controlled vocabulary** with a `skill_aliases` table — this is what makes the skills graph work.
- Every table has `created_at`, `updated_at`; user-facing tables have `deleted_at` (soft delete) with a hard-delete job for GDPR.
- `outcomes` is append-only (immutable event log) — it's the moat, so it must be auditable.

---

## 6. Search engine

**Phase 1 (0–5M opportunities): Postgres.**

```sql
-- Full-text + trigram hybrid
SELECT id, ts_rank_cd(search_vector, query) AS rank
FROM opportunities
WHERE search_vector @@ websearch_to_tsquery('english', $1)
   OR title % $1                      -- pg_trgm similarity
ORDER BY rank DESC, published_at DESC
LIMIT 50;
```

Plus structured filters (region, remote, sponsorship, comp band, type) via B-tree/GIN indexes.

**Phase 2 (>5M docs or sub-100ms p99 requirement): OpenSearch/Meilisearch**, synced from Postgres via the event log. Hybrid BM25 + vector (kNN) with reciprocal rank fusion.

**Why defer:** Postgres search is genuinely good to ~5M rows with proper indexes, and every extra system is a system a solo founder must operate.

---

## 7. Recommendation engine

### Architecture: two-stage retrieve-then-rank

```
                    ┌──────────────────────────────┐
   User context ───►│ STAGE 1: CANDIDATE RETRIEVAL │
   (twin vector,    │  • Filter: eligibility, geo, │──► 300–800 candidates
    filters, goals) │    type, comp floor, visa    │
                    │  • Vector ANN (pgvector):    │
                    │    cosine(twin_embed, opp)   │
                    │  • Keyword/skill overlap     │
                    │  • Recency boost             │
                    └──────────────────────────────┘
                                  │
                    ┌─────────────▼────────────────┐
                    │ STAGE 2: LEARNING-TO-RANK    │
                    │  Features (40–60):           │
                    │   · skill overlap (weighted) │
                    │   · seniority gap            │
                    │   · comp vs user floor       │
                    │   · location/remote fit      │
                    │   · visa eligibility         │
                    │   · source quality score     │
                    │   · freshness, competition   │
                    │   · historical CTR/apply rate│
                    │   · predicted interview prob │
                    │   · predicted offer prob     │
                    │   · predicted salary delta   │
                    │  Model: LambdaMART (LightGBM)│──► top 30, explained
                    └──────────────────────────────┘
                                  │
                    ┌─────────────▼────────────────┐
                    │ STAGE 3: EXPLANATION         │
                    │  LLM generates a 1–2 sentence│
                    │  "why this, why now" from the│
                    │  SHAP top-5 features         │
                    └──────────────────────────────┘
```

**Cold start:** rules-based scoring (weighted skill overlap + constraints), progressively replaced by learned ranker as outcome data accumulates. **Never** ship a black box on day one — the rules-based version is more explainable and nearly as good for the first 5,000 users.

---

## 8. Job/opportunity aggregation engine

```
   ┌─────────────────────────────────────────────────────────────┐
   │ SCHEDULER (per-source cron, jittered, budgeted)             │
   └───────────┬─────────────────────────────────────────────────┘
               ▼
   ┌───────────────────────┐   Each source = an ADAPTER implementing:
   │ SOURCE ADAPTERS       │   fetch(cursor) → RawOpportunity[]
   │ • API (official)      │   • rate limits, backoff, circuit breaker
   │ • RSS/feeds           │   • politeness (robots.txt, UA, delays)
   │ • Partner CSV/JSON    │   • per-source health metrics
   │ • HTML (last resort)  │   • failure isolation (one bad source ≠ outage)
   │ • User submissions    │
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │ RAW STORE (JSONB)     │  immutable, replayable
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │ NORMALISER            │  → canonical schema
   │ • title → role taxonomy│
   │ • comp → {min,max,cur,period,is_estimate}
   │ • location → {city,region,country,remote}
   │ • type → job|contract|gig|fellowship|grant|...
   │ • skills → controlled vocabulary
   │ • sponsorship → detected|likely|unknown|none
   │ • dates, seniority, company resolution
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │ DEDUPLICATOR          │  see §9
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │ QUALITY GATE          │  • spam/scam detection
   │                       │  • ghost-job heuristics (age, repost count,
   │                       │    apply-again signal, employer history)
   │                       │  • completeness score
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │ UPSERT + EVENT        │  → opportunities, opportunity_events
   │                       │  → emits "opportunity.created/updated"
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │ EMBED + SCORE         │  async, per new/changed opportunity
   └───────────────────────┘
```

**Source priority (v1, 8 sources):**
1. Official/partner APIs & affiliate feeds (highest quality, lowest legal risk)
2. Remote-first boards with public APIs (RemoteOK, WeWorkRemotely, Arbeitnow, Adzuna, JSearch)
3. AI-talent platforms via partnership (Mercor, micro1, Turing, Arc) — referral-integrated
4. User-submitted opportunities (crowdsourced, moderated) — cheapest and stickiest

**Legal/ethical rules:**
- Respect `robots.txt`, ToS, and rate limits.
- Never republish full third-party content; store structured facts + link out (this is also better UX and better law).
- Prefer partnerships over scraping, always. Scraping is a fallback, not a strategy.

---

## 9. Deduplication engine

The hardest and most valuable piece of plumbing. Same role appears on 5 boards with different titles, currencies and formats.

### Three-stage pipeline

**Stage 1 — Exact/near-exact blocking**
- Normalised `content_hash` = hash(company_id, normalised_title, location_key, comp_bucket)
- Fuzzy: `pg_trgm` similarity on title > 0.85 **and** company match **and** location match → candidate pair.

**Stage 2 — Semantic merge**
- Embedding cosine similarity on `title + company + description head` > 0.92
- LLM adjudication only for the ambiguous band (0.85–0.95) — a cheap model, batched, with a strict JSON contract.
- Rules: same company + same city + comp ranges overlapping + posted within 45 days → merge.

**Stage 3 — Canonical record**
- Keep the richest description, the widest comp range, the earliest `first_seen`, and all source links.
- `canonical_id` points to the survivor; sources are linked as `opportunity_sources`.
- When a source disappears → mark source inactive; only close the opportunity when **all** sources are gone for 14 days.

### Quality metric
**Duplicate rate** (share of user-visible opportunities that are duplicates) must stay **< 2%**. Measured by weekly human audit of 200 random records + user "report duplicate" signals.

---

## 10. AI layer

### The LLM gateway

```
┌──────────────────────────────────────────────────────────────┐
│                     LLM GATEWAY (module: ai)                 │
│  • Provider abstraction: OpenAI | Anthropic | Google         │
│  • Task→model routing table (cost/latency/quality)           │
│  • Prompt registry (versioned, evaluated, never inline)      │
│  • Structured output contracts (Zod → JSON schema)           │
│  • Response cache (hash of prompt+context)                   │
│  • Budget guard per user/day; graceful degradation           │
│  • Full tracing (prompt, tokens, cost, latency)              │
│  • PII redaction before external calls where feasible        │
└──────────────────────────────────────────────────────────────┘
```

### Routing table (illustrative)

| Task | Model class | Why |
|---|---|---|
| CV parsing | Small/fast (cheap) | Structured extraction, high volume |
| Opportunity normalisation | Small/fast, batched | Deterministic-ish extraction |
| Dedup adjudication | Small, batched | Binary-ish decision |
| Match explanation | Mid | Quality matters, volume moderate |
| Cover letter | Frontier | User-facing quality |
| Interview coaching | Frontier | Quality + nuance |
| Career advice chat | Frontier + RAG | Trust-critical |
| Salary narrative | Mid | Data-driven, explanation only |

### Cost control
- Target **< €0.12 per active user per month** in inference cost (achieved via batching, caching, small models for extraction, and only calling frontier models on explicit user action).
- Every AI feature has a **hard per-user budget**; exceeding it degrades gracefully (e.g. shorter explanations), never errors.

---

## 11. Analytics layer

**Event pipeline:** client + server → `analytics_events` (Postgres, partitioned by month) → PostHog (product) + a nightly rollup table (business).

| Layer | Tool | Purpose |
|---|---|---|
| Product analytics | PostHog | Funnels, retention, session replay, experiments |
| Business metrics | Postgres rollups + Metabase | MRR, churn, LTV, cohort retention |
| Data quality | Custom dashboards | Duplicate rate, source health, score calibration |
| Errors | Sentry | Uptime + errors |
| Cost | Provider dashboards + internal table | LLM spend per feature |

### The event taxonomy (critical — define once, never change)
`user.signed_up`, `resume.uploaded`, `resume.parsed`, `profile.completed`, `feed.viewed`, `opportunity.viewed`, `opportunity.saved`, `opportunity.dismissed`, `match.score_viewed`, `application.created`, `application.outcome_reported`, `copilot.message_sent`, `paywall.shown`, `subscription.started`, `subscription.cancelled`, `referral.clicked`, `referral.converted`.

**The north-star event is `application.outcome_reported`.** It must be tracked from week 3.

---

## 12. Referral tracking layer

```
Referral link:  careeros.ai/go/{code}?src={surface}&opp={id}
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ /go/:code  (edge function, <50ms)                   │
│  • resolve code → program_id, user_id               │
│  • record click (hashed IP, UA, timestamp, surface) │
│  • set first-party cookie (90d, subid)              │
│  • 302 → partner URL with subid appended            │
└─────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ CONVERSION INGESTION                                │
│  • partner postback webhook (S2S, signed)           │
│  • partner CSV import (for networks without webhook)│
│  • dedupe by (partner, external_id)                 │
│  • state machine: clicked → registered → qualified  │
│    → converted → approved → paid                    │
└─────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ EARNINGS + ATTRIBUTION                              │
│  • referral_earnings rows (immutable)               │
│  • payout ledger, monthly reconciliation            │
│  • attribution windows per program (30–90d)         │
│  • anti-fraud: same-device, velocity, geo mismatch  │
└─────────────────────────────────────────────────────┘
```

**Integrity guardrails (must be architectural, not policy):**
- Ranking service **cannot** read `referral_programs`. Physically separate modules.
- A nightly audit compares "would rank differ if referral status were unknown?" and alerts on divergence.

---

## 13. Security architecture

| Layer | Controls |
|---|---|
| **Transport** | TLS 1.3 everywhere, HSTS, no mixed content |
| **AuthN** | Magic link + OAuth (Google); Argon2id for any passwords; session cookies `HttpOnly; Secure; SameSite=Lax`; short-lived JWTs for mobile |
| **AuthZ** | Row-level ownership checks in every query (user_id scoping enforced at the repository layer, not the route); admin role separation |
| **Secrets** | Env vars in provider vaults; never in repo; rotated quarterly; per-environment isolation |
| **Data at rest** | Postgres encryption at rest; CVs in private S3/R2 buckets with signed URLs (5-min TTL) |
| **PII minimisation** | Store only what the product uses; redact PII from LLM prompts where the task allows; never log CV contents |
| **Input safety** | Zod validation on every boundary; parameterised SQL only; file type/size validation; virus scan on uploads (ClamAV or provider scanning) |
| **Prompt injection** | Treat CV text and scraped content as untrusted; strict system prompts; no tool access from untrusted content; output schema validation |
| **Abuse** | Rate limits, bot detection (Cloudflare Turnstile), LLM budget caps, signup velocity limits |
| **Monitoring** | Sentry, uptime checks, anomaly alerts on auth failures and LLM spend |
| **Backups** | Postgres PITR (7 days), daily logical dump to separate bucket (30 days), quarterly restore drill |
| **Vendor risk** | DPAs with every processor; sub-processor list published |

**SOC 2:** not in Year 1. Prepare controls from day one (they're cheap when designed in) and pursue at institutional sales (Year 2).

---

## 14. GDPR compliance

Karyvo processes CVs, employment history, salary, and sometimes special-category-adjacent data. Compliance is a **product feature and a marketing asset** ("your career data is yours").

| Requirement | Implementation |
|---|---|
| **Lawful basis** | Contract (service delivery) for core processing; **explicit consent** for outcome data aggregation and any benchmarking; legitimate interest (documented LIA) for security/analytics |
| **Transparency** | Plain-language privacy policy; a "what we know about you" page showing every data point we hold |
| **Right to access / portability** | `GET /me/export` → machine-readable JSON + human-readable PDF, delivered in minutes |
| **Right to erasure** | `DELETE /me` → soft delete immediately, hard delete within 30 days across all stores (DB, S3, vector, backups via lifecycle), confirmation email |
| **Data minimisation** | No national ID, no health data, no ethnicity; salary is optional and user-controlled |
| **Retention** | Raw CVs: deleted after parsing unless the user keeps them; analytics events: 24 months; logs: 30 days |
| **Aggregation thresholds** | **k-anonymity ≥ 25** for any published benchmark (rate pages, salary pages); no re-identification via cross-referencing |
| **Consent for AI processing** | Clear disclosure that CV/profile content is sent to LLM providers; option to disable AI features; provider DPAs with no-training-on-data terms |
| **International transfers** | EU-hosted primary (Frankfurt) preferred; SCCs + DPAs for US processors |
| **Sub-processor list** | Published, updated, with change notification |
| **DPO / records** | Designated contact; ROPA maintained from day one |
| **Breach response** | 72-hour notification runbook; incident log |
| **EU AI Act** | Our systems are **limited-risk** (no biometric, no employment decision-making on behalf of employers). We do not make hiring decisions; we advise individuals. Documented accordingly, with transparency obligations met (users know AI generates recommendations). |
| **Cookies** | Consent-mode analytics; no non-essential cookies without consent (EU) |

**The strategic point:** most career products treat privacy as a cost. We treat it as a differentiator, because the moat (outcome data) only exists if users *trust* us with their career history. Trust is the product.

---

## 15. Scalability plan

| Scale | Users | Architecture | Key changes |
|---|---|---|---|
| **S1** | 0–5k | Single Node service, 1 worker, Neon/Supabase Postgres | Ship fast, monolith |
| **S2** | 5k–50k | 2–4 workers, read replica, Redis, PgBouncer | Move scoring to queue; cache feed per user/day |
| **S3** | 50k–250k | Horizontal workers on Fly/ECS; partition `analytics_events` and `matches` by month; CDN for SEO pages | Dedicated search (OpenSearch) if p99 > 300ms; incremental scoring only on profile change |
| **S4** | 250k–1M | ECS/K8s autoscaling; Postgres → primary + 2 replicas; pgvector moved to dedicated store; feed precomputation (nightly batch) | Batch precompute top-100 per active user; event-driven invalidation |
| **S5** | 1M+ | Multi-region read, sharded hot paths, dedicated ML service for ranking | Separate ranking service with model server; feature store |

### The five scaling decisions that matter

1. **Precompute the feed, don't compute on request.** Nightly + on-profile-change. Serve from cache. This is the single biggest cost/latency lever.
2. **Score incrementally.** Only score new opportunities against the user's twin, not all opportunities.
3. **Batch all LLM work.** 90% of AI cost is extraction/normalisation, which is batchable and cacheable.
4. **Partition the append-only tables** (`analytics_events`, `matches`, `opportunity_events`) from day one by month — it costs nothing early and saves a painful migration later.
5. **Keep ingestion idempotent and replayable.** When a source breaks (it will), you must be able to re-run without duplicates.

### Cost model at scale (monthly, infrastructure only)

| Scale | Infra cost | LLM cost | Total | Cost/user |
|---|---|---|---|---|
| 5k users | €120 | €400 | €520 | €0.10 |
| 50k users | €900 | €3,200 | €4,100 | €0.08 |
| 250k users | €4,200 | €14,000 | €18,200 | €0.07 |
| 1M users | €16,000 | €52,000 | €68,000 | €0.07 |

At 1M users with 5% paid × €17 ARPU → €850k MRR vs €68k cost. **Gross margin ~92%.** Infrastructure is never the constraint; distribution is.

---

## 16. Architecture verdict

| Question | Answer |
|---|---|
| Can this be built by a solo founder in 30–60 days? | Yes — the MVP subset (8 sources, rules-based scoring, monolith, PWA) is ~6 weeks of focused work. |
| Is this over-engineered? | The MVP section is not. Everything from §7 onward is the *destination*, not the first commit. Build the monolith, keep the module boundaries clean. |
| What's the riskiest technical component? | **Deduplication + source reliability.** It's unglamorous and it's where every aggregator dies. Budget 30% of MVP time here. |
| What should be built first, technically? | The ingestion→normalise→dedupe→score pipeline. Everything else is UI on top. |
| What should never be built? | Microservices, Kubernetes, custom ML infra, a social graph, real-time messaging. |
