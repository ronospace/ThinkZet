# Karyvo — Status & Completion Report

**Last updated:** 7 November 2026
**Tests:** 49 passing, 0 failing (`node scripts/check.cjs`)
**Commits:** 26

---

## Completion against the brief

| Area | Status | Notes |
|---|---|---|
| Landing page (outcome-led) | ✅ 100% | Rate-gap check above the fold, no feature list |
| Free acquisition funnel | ✅ 100% | Check → lead capture → shareable card → account |
| Lead capture + dashboard | ✅ 100% | Gap-qualified leads ranked by intent |
| Viral share loop | ✅ 100% | `/s/<id>` cards, copy one-liner, tracked views |
| Onboarding | ✅ 100% | 3 steps, draft saved per step, live preview |
| Career Twin + CV parsing | ✅ 100% | 58-skill vocabulary, deterministic |
| Match engine | ✅ 95% | Priors, not yet outcome-trained at scale |
| Rate intelligence | ✅ 100% | Stratified, trimmed, confidence-labelled |
| Career Score v2 | ✅ 100% | 8 scores, each with a ranked lever |
| Opportunity Radar | ✅ 100% | Filters, facets, sort, horizon weighting |
| Habit layer | ✅ 100% | Streak, fresh count, weekly commitment |
| Daily brief + scheduler | ✅ 100% | Timezone-aware, idempotent |
| Email delivery | ✅ 100% | Resend / Postmark / outbox |
| Preferences + unsubscribe | ✅ 100% | HMAC-signed links |
| Negotiation brief | ✅ 100% | Floor/target/stretch + scripted ask |
| Trajectory simulator | ✅ 100% | 5 paths, risk-adjusted |
| Market Pulse | ✅ 100% | Live corpus benchmarks |
| Skill gap sequencing | ✅ 100% | Cumulative unblocking |
| Cover letters | ✅ 100% | 3 tones, evidence-traced |
| Interview prep | ✅ 100% | Gap-driven, STAR scaffolds |
| Tracker + outcomes | ✅ 100% | Append-only outcome log |
| Stripe billing | ✅ 100% | Checkout, signed webhooks, lifecycle |
| Referral layer | ✅ 100% | Isolated from ranking, tracked clicks |
| Referral recommendations | ✅ 100% | Attached to engine-found gaps only |
| Funnel analytics | ✅ 100% | 9-step, biggest-leak verdict |
| Programmatic SEO | ✅ 100% | 176 URLs + sitemap from live corpus |
| Public share pages | ✅ 100% | `/s/<id>` |
| Auth + sessions | ✅ 100% | Passwordless, HttpOnly cookies |

---

## What is still external-dependent

| Item | Blocker | Owner |
|---|---|---|
| Live email delivery | `RESEND_API_KEY` or `POSTMARK_API_KEY` | You |
| Real AI copilot | `LLM_ENDPOINT` + `LLM_API_KEY` + `LLM_MODEL` | You |
| Public beta URL | hosting decision | You |
| Live Stripe | swap `sk_test_` → `sk_live_` + `STRIPE_ALLOW_LIVE=true` | You (deliberate) |

---

## What I would do next, if I had another block

1. **Onboarding email sequence** — 4 emails over 7 days after signup. The system supports it; the copy is not written.
2. **Outcome-trained calibration** — once 100+ outcomes exist, replace priors with a fitted model. The data path already exists.
3. **Employer-side data product** — deliberately last, because it threatens neutrality.
4. **Mobile PWA polish** — installable, push notifications.
