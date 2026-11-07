# 3-Year Roadmap

## Roadmap philosophy

Sequenced by **what unlocks the next revenue step**, not by what's technically interesting. Each phase has one job, one metric, and a kill criterion.

```
PHASE 0        PHASE 1        PHASE 2        PHASE 3        PHASE 4        PHASE 5
Validate  →    Ship MVP  →    Monetise  →    Compound  →    Expand    →    Platform
(2 wks)        (6 wks)        (8 wks)        (4 mos)        (8 mos)        (Yr 3)
```

---

## PHASE 0 — Validation (Weeks 1–2) · *Kill-or-continue gate*

**Job:** prove the pain is real and people will pay, before writing code.

| Action | Output | Success bar |
|---|---|---|
| 25 problem interviews (P1/P2) | Pain map, exact language | ≥15 confirm the pain unprompted |
| 5 "concierge" manual reports (delivered by hand in a Google Doc) | Proof of value | ≥3 say "I'd pay €19/mo for this" |
| Waitlist landing page + 2 LinkedIn posts | Demand signal | ≥100 emails |
| 5 partner conversations (Arc, immigration firms, niche boards) | Referral viability | ≥2 interested |

**Kill criterion:** if <8 of 25 interviews confirm the pain, or <2 of 5 concierge users would pay → **stop and re-scope.** Two weeks saved beats twelve months wasted.

---

## PHASE 1 — MVP (Weeks 3–8) · *Solo founder*

**Job:** ship the smallest thing that delivers a scored daily feed.

### Scope (and nothing else)

| # | Feature | Why |
|---|---|---|
| 1 | Auth + user accounts (email/Google) | Table stakes |
| 2 | CV upload + parsing (LLM) | Profile input |
| 3 | Opportunity aggregation (8 sources, 3 types) | Core |
| 4 | Deduplication + entity resolution | Core |
| 5 | Ranking + Match Score + 4 sub-scores | Core differentiator |
| 6 | Saved opportunities | Core |
| 7 | Application tracking (kanban-lite) | Retention + outcome capture |
| 8 | Daily opportunity feed (email + in-app) | Habit loop |
| 9 | Basic AI Career Assistant (chat, grounded in profile) | Wow factor |
| 10 | Referral link tracking | Revenue path |
| 11 | Analytics dashboard (PostHog) | Learning |
| 12 | **Outcome capture prompt** ("did you apply? did you get it?") | **Moat seed — non-negotiable** |

### Explicitly out of scope
Employer/recruiter marketplace · social · messaging · video interviews · community · enterprise · native mobile app (PWA instead) · multi-language.

**Tech:** Next.js + Node/TS + Postgres/Prisma + one LLM provider + Vercel. No Kubernetes. No microservices. Monolith.

**Metrics:** 100 registered users, 40 completed profiles, 10 paying, first 5 outcomes.
**Kill criterion:** if <25% of signups complete a CV upload, the onboarding is broken — fix before adding features.

---

## PHASE 2 — Monetise (Weeks 9–16)

**Job:** convert attention into recurring revenue.

| Workstream | Deliverables |
|---|---|
| Pricing | €19/€24/€29 test; annual plan; regional PPP pricing |
| Paywall design | Free tier gets the "holy shit" insight; Pro unlocks the radar |
| Payment infra | Stripe (global), Paddle/alternate for India; dunning; trials |
| Referral partners | 3 signed (2 AI-talent platforms, 1 immigration/training) |
| SEO | First 200 programmatic pages (rates + visa) |
| Newsletter | Launch, weekly, 500 subs |
| Growth | 10 ambassadors, Product Hunt launch |
| AI | Copilot v2: cover letters, interview prep, salary negotiation |

**Metrics:** €2k MRR (≈105 subs), 2,000 users, D30 ≥ 30%, K ≥ 0.2.
**Kill criterion:** if free→paid conversion <1.5% after 3 pricing experiments → the value prop is wrong, not the price.

---

## PHASE 3 — Compound (Months 5–8)

**Job:** make the data flywheel real and the channels compound.

| Workstream | Deliverables |
|---|---|
| **Career Twin v1** | Persistent user model; recommendations improve visibly over time |
| **Career Score v1** | 6 scores with explainable breakdowns + benchmarks |
| **Outcome engine** | Structured outcome capture, verification, calibration loop |
| **Calibrated probabilities** | First real interview/offer probability models (logistic → gradient-boosted) |
| **Salary intelligence** | Live benchmarks by skill/role/region/channel |
| **SEO scale** | 800 pages, 25k organic/mo |
| **Services marketplace** | 20 vetted providers, 20% take, booking + payout |
| **Learning marketplace** | 5 partners (DataCamp, Coursera, AWS, MS, Google) |
| **University pilots** | 3 cohorts |

**Metrics:** 10,000 users, 400 paid, €7k MRR, D30 ≥ 38%, 500+ outcomes.
**Kill criterion:** if D30 retention <25%, stop adding features and fix retention (the product is a novelty, not a habit).

---

## PHASE 4 — Expand (Months 9–18)

**Job:** raise ARPU, add institutional revenue, and prepare the raise.

| Workstream | Deliverables |
|---|---|
| **Pro+ tier** (€39/mo) | Coach credits, relocation readiness, multi-profile, priority alerts |
| **Institutional** | Cohort Intelligence product; 10 university contracts; 3 bootcamp deals |
| **Data product** | Comp-data API (alpha) for HR-tech partners |
| **Geographic** | Localisation DE/NL; India/Brazil PPP focus |
| **Mobile** | Flutter app (P1 is mobile-native) |
| **Paid acquisition** | Only now, only on high-intent queries, CAC < €35 |
| **Team** | +1 engineer (infra/aggregation), +1 growth/content |
| **Pre-seed/seed raise** | €750k–€1.5M at €6–10M post (optional) |

**Metrics:** 100,000 users, 4,500 paid, €85k MRR, D30 ≥ 44%, 8,000+ outcomes, NRR > 105%.
**Milestone:** €1M ARR.

---

## PHASE 5 — Platform (Year 3)

**Job:** become infrastructure, not an app.

| Workstream | Deliverables |
|---|---|
| **Talent Graph** | Queryable graph: who can do what, who wants what, what outcomes follow |
| **Employer intelligence** (new product line) | "Candidates most likely to accept and succeed" — sold to employers, *not* to replace the candidate product |
| **Opportunity Rail (alpha)** | Offer advances / income smoothing with a financial partner (regulated, partnered, not built) |
| **Localisation** | 6 languages |
| **API platform** | Public API for skills + comp data |
| **Team** | 8–12 people |
| **Series A** | €6–12M at €40–70M post (only if metrics justify; the business is near break-even without it) |

**Metrics:** 620,000 users, 31,000 paid, €620k MRR, €7.4M ARR, NRR > 115%, gross margin 89%.

---

## The single-page view

| Phase | Timeline | One job | Key metric | Revenue |
|---|---|---|---|---|
| 0 Validate | W1–2 | Prove the pain | 15/25 interviews confirm | €0 |
| 1 MVP | W3–8 | Ship the feed | 100 users, 10 paid | €200 MRR |
| 2 Monetise | W9–16 | Convert | 3.5% free→paid | €2k MRR |
| 3 Compound | M5–8 | Data flywheel | D30 ≥ 38% | €7k MRR |
| 4 Expand | M9–18 | ARPU + institutional | €1M ARR | €85k MRR |
| 5 Platform | Yr 3 | Infrastructure | NRR > 115% | €620k MRR |

## What we deliberately defer (and why)

| Deferred | Why | When |
|---|---|---|
| Native mobile app | PWA is enough for validation | M9 |
| Marketplace | Needs liquidity we haven't earned | M5 |
| Employer/recruiter side | Different buyer, different sales motion, high risk of focus loss | Y2–3 |
| Social/community | Network effects belong to LinkedIn | Never (or Y3+) |
| Video interviews | Regulated, crowded, not our wedge | Never |
| Multi-language | English + EUR covers the wedge | M12 |
| Microservices | Premature scaling kills solo founders | Never in Y1–2 |

## The one thing that must never slip

> **Outcome capture.** If the roadmap ever deprioritises "did you apply / did you get it?", the moat disappears and this becomes a nice feed with a subscription. It is a first-class product surface from week 3.
