# Handover

**State:** 43 commits · 57/57 tests passing · 0 dependencies · running locally

---

## Run it

```bash
cd app
./start.sh          # app + Stripe webhook forwarder
# or
node server.cjs     # just the app, on http://127.0.0.1:4173
```

First visit shows the landing page. Click **Sign in** → any email → the 6-digit code appears
on screen (no mail provider wired yet). Or **Load demo persona**.

---

## What is built and verified

| Area | Evidence |
|---|---|
| Live ingestion, 4 real APIs | 1,166 fetched → 477 kept → 477 merged in 1.8s |
| Classification + dedup | 686 non-tech dropped, ghost/stale filtered, 95% feed health |
| Career Twin + CV parsing | 58-skill vocabulary, 19 skills extracted from demo CV |
| Match engine | 7-factor score + calibrated interview/offer probability |
| Rate intelligence | 100,033-comparable sample, trimmed, confidence-labelled |
| Career Score v2 | 8 scores, each with a ranked lever |
| Negotiation, Trajectory, Market Pulse | all live |
| Onboarding | 3 steps, draft saved per step, live rate preview |
| Landing funnel | free check → lead → shareable card at `/s/<id>` → account |
| Email | Resend / Postmark / outbox + 4-step signup sequence + daily brief scheduler |
| Auth, sessions, paywall | passwordless, HttpOnly, entitlement gating |
| Stripe | **test mode live**, real Checkout sessions, signed webhooks verified end-to-end |
| Referral layer | 11 partners, tracking, isolated from ranking by module boundary |
| GDPR | export returns a real JSON file; delete wipes 14 tables and invalidates sessions |
| Analytics | 9-step funnel with a biggest-leak verdict |
| SEO | 176 URLs + sitemap generated from the live corpus |
| Legal | privacy + terms published |
| Security | rate limiting on public + auth routes, security headers |
| Mobile | bottom-nav, responsive, PWA manifest |

**Verified, not assumed:** every claim above was exercised through the API or the browser.

---

## What is left — all of it needs a decision or a key

| # | Blocker | Action | Effect |
|---|---|---|---|
| 1 | **Email delivery** | add `RESEND_API_KEY` to `app/.env` | briefs and the signup sequence reach inboxes instead of the outbox |
| 2 | **Public URL** | deploy per `app/DEPLOY.md`, set `APP_URL` | strangers can reach it; email links stop pointing at localhost |
| 3 | **AI copilot** | add `LLM_ENDPOINT` + `LLM_API_KEY` + `LLM_MODEL` | deterministic composer → generative |
| 4 | **Live Stripe** | swap `sk_test_` → `sk_live_`, set `STRIPE_ALLOW_LIVE=true` | real money (deliberately gated) |
| 5 | **Rotate the Stripe key** | Developers → API keys → Roll | hygiene — the test key appeared in a chat log |
| 6 | **Brand Phase 2** | decide tagline placement (audit §7) | ~40 text edits across 8 files |

The **Launch** screen in the app lists 1–2 live with a green/red status.

---

## Where the truth lives

| Question | File |
|---|---|
| What are we optimising for? | `docs/planning/MISSIONS.md` |
| What is built vs left? | `docs/planning/STATUS-2026-11-11.md` |
| Why this brand structure? | `docs/planning/BRAND.md` |
| What does the rebrand audit say? | `docs/planning/REBRAND-AUDIT.md` |
| What do I do on launch day? | `docs/planning/LAUNCH-CHECKLIST.md` |
| How do I deploy? | `app/DEPLOY.md` |
| How do I rename the brand? | `node scripts/rebrand.cjs "New Name"` |
| Does it still work? | `node scripts/check.cjs` |

---

## The one thing that matters next

Not a feature. **Get the rate check in front of twenty people.**

Everything built here exists to make one moment happen: someone sees a number about their
own pay that they did not know, and believes it. Every remaining engineering task is
refinement of a product that has not yet met a stranger.
