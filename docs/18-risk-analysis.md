# Risk Analysis (SWOT + Risk Register)

## 1. SWOT

### Strengths
- **Structural neutrality** — the only participant with no inventory to sell.
- **Extreme capital efficiency** — €2.7k to first revenue; break-even at ~300 paid users.
- **Solo-buildable tech** in 2026; LLMs collapsed the data-layer cost.
- **Clear wedge** (global AI contractors + relocating professionals) with acute, quantifiable pain.
- **Outcome data flywheel** that compounds and cannot be bought.
- **Premium positioning** at €19/mo — below LinkedIn Premium, above the free tools.

### Weaknesses
- **No distribution.** The single biggest weakness. No audience, no SEO history, no brand.
- **Single founder** — execution, support, sales and marketing all compete for the same hours.
- **No proprietary data on day one** — the moat starts at zero.
- **Scraping-dependent ingestion** — fragile, legally grey, and always breaking.
- **Thin initial model quality** — calibrated probabilities need outcome volume we don't have yet.
- **Churn-prone category** — career products lose users when they succeed.

### Opportunities
- **AI-talent rate transparency** is a genuine information asymmetry no one is monetising.
- **Visa sponsorship** is a high-intent, badly-served niche with natural partner revenue.
- **Programmatic SEO** on decision queries is wide open.
- **Marketplace/referral revenue** is aligned, high-margin, and available from week 6.
- **Institutional expansion** (universities, bootcamps, immigration firms) in Year 2.
- **Non-US-centric positioning** — EU/Gulf/India/LATAM are underserved by US-first tools.

### Threats
- **LinkedIn / Indeed ship a "career assistant"** and bundle it free.
- **A funded startup** (or a talent marketplace) copies the UX with 20 engineers.
- **Scraping restrictions** (anti-bot, ToS enforcement, legal action).
- **LLM cost or provider disruption** (pricing changes, model deprecation, rate limits).
- **Privacy incident** destroys the trust that the entire business rests on.
- **Economic downturn** cutting discretionary subscriptions (though career products often *benefit* from job-market stress).

---

## 2. Risk register

Scoring: Likelihood (1–5) × Impact (1–5) = Risk score. Anything ≥ 12 needs an owner and an active mitigation.

| # | Risk | Category | L | I | Score | Mitigation | Trigger to act |
|---|---|---|---|---|---|---|---|
| R1 | **No distribution — nobody finds the product** | Market | 5 | 5 | **25** | Founder-led LinkedIn + Discord from week 1; programmatic SEO from week 6; referral loops from week 4; newsletter from week 8. Validate channel *before* building more features. | <100 signups in first 30 days after launch |
| R2 | **Churn kills the model** (users leave on getting a job) | Market | 4 | 5 | **20** | Annual-first pricing; post-win value (next-move radar, salary tracking); 6-month reactivation; Pro+ for ongoing career management. Measure D30 from week 3. | D30 < 30% at M4 |
| R3 | **Scraping breaks / blocked** | Platform dependency | 4 | 4 | **16** | Multi-source spread (8+ sources); prioritise official APIs & partner feeds; user-submitted opportunities; never single-source a category. | Any single source >40% of opportunities |
| R4 | **LinkedIn bundles a free copy** | Market | 3 | 5 | **15** | Neutrality + cross-platform + honest odds are the counter; move fast on outcome data; build brand as "the independent one." | LinkedIn announces a career intelligence feature |
| R5 | **Privacy/GDPR incident** | Data / Compliance | 3 | 5 | **15** | Consent-first architecture; k≥25 aggregation; no PII in prompts where avoidable; encryption; 30-day hard delete; incident runbook; DPA with every processor; penetration test before any institutional sale. | Any user data exposure |
| R6 | **LLM cost spikes / provider deprecation** | Technical | 3 | 3 | 9 | Provider-agnostic gateway; per-user budgets; caching + batching; small models for extraction; cost dashboard with alerts. | Inference cost > €0.25/user/mo |
| R7 | **Accuracy/hallucination damages trust** | Data | 4 | 4 | **16** | Factuality guards on resume/cover-letter generation; no fabricated experience; cite data for every salary claim; publish calibration; user reporting on every output. | Any public claim of a fabricated fact |
| R8 | **Referral revenue conflicts with neutrality** | Legal / Brand | 3 | 4 | 12 | Ranking service physically cannot read referral tables; nightly divergence audit; disclose all referral links; publish the integrity policy. | Any audit divergence |
| R9 | **Solo founder burnout / bus factor** | Operational | 4 | 5 | **20** | Ruthless scope; no marketplace/social in Y1; automate ops; document everything; hire a contractor for support at €2k MRR; build in public for accountability. | >55 hrs/week for 3 consecutive weeks |
| R10 | **SEO never compounds** (algorithm changes, AI search) | Market | 3 | 4 | 12 | Diversify to newsletter, referral loops, YouTube, communities; optimise for AI-search citation (structured data, clear answers, named author); don't bet the company on one channel. | Organic traffic flat 3 months post-launch |
| R11 | **AI talent marketplaces cut off referral programs** | Platform dependency | 3 | 3 | 9 | Spread across 6+ partners in 4 categories; build direct partner relationships; keep services and learning revenue independent. | One partner >40% of referral revenue |
| R12 | **Legal challenge over scraping / ToS** | Legal | 3 | 4 | 12 | Prefer APIs and partnerships; store facts + link out (no full-content republication); respond to takedowns promptly; legal review before scaling a scraped source; maintain a source register with terms. | Any cease-and-desist |
| R13 | **Competitor with funding out-executes** | Market | 3 | 4 | 12 | Speed + outcome data + brand. Being first to *calibrated* probabilities is the durable advantage, not being first to launch. | A funded competitor launches with outcome tracking |
| R14 | **Immigration/visa advice liability** | Legal | 3 | 3 | 9 | Never give legal advice; cite official thresholds with sources and dates; route to vetted partners; clear disclaimers; review by an immigration lawyer before launch of visa features. | Any user claims harm from our visa info |
| R15 | **Payment/tax complexity across regions** | Compliance | 3 | 2 | 6 | Stripe + Paddle (MoR for VAT/GST); tax automation (Stripe Tax); local entity only when revenue justifies it. | VAT registrations in >5 jurisdictions |
| R16 | **EU AI Act / employment-AI regulation** | Compliance | 2 | 4 | 8 | We advise individuals, we don't make employment decisions → limited risk. Document this position; transparency notices; no biometric or protected-attribute inference; annual compliance review. | Any expansion into employer decision-making |
| R17 | **Data quality collapse** (duplicates, ghosts, spam) | Data | 4 | 4 | **16** | Deduplication <2% duplicate rate target; ghost-job heuristics; user reporting; weekly human audit of 200 records; source quality scoring. | Duplicate rate >3% |
| R18 | **Support burden outgrows one person** | Operational | 3 | 3 | 9 | Self-serve help centre from M3; AI support deflection; community FAQ; hire a €1.5k/mo contractor at 300 paying users. | >15 support tickets/day |

---

## 3. Top five risks in detail

### R1 — No distribution (score 25)
**Why it's the top risk:** the product can be excellent and still die. CareerOS is entering a category with zero brand awareness, against incumbents with billions of monthly impressions.

**Mitigation plan (specific, dated):**
- Weeks 1–2: 25 interviews + waitlist page + 2 LinkedIn posts → target 100 emails.
- Weeks 3–8: build in public (weekly metrics post), 5 Discords, 20 DMs/day.
- Weeks 9–16: first 200 SEO pages, newsletter launch, 10 ambassadors.
- Month 5+: scale SEO to 800 pages; Product Hunt; YouTube.
- **Kill criterion:** if by end of Month 2 there are <300 registered users with no paid channel, the product or the message is wrong — stop and re-scope rather than build more features.

### R2 — Churn (score 20)
**Why:** a career product's natural lifecycle ends when the user gets a job. In a category with 8–10% monthly churn, the model never compounds.

**Mitigation:**
1. **Annual-first** (35% discount, positioned as "the whole search").
2. **Post-win continuation:** Career Twin keeps working — salary tracking, next-move radar, skill maintenance. The product is a *career* system, not a *job-search* system.
3. **Reactivation engine:** on cancel, capture the outcome (moat data) and set a 6-month reminder.
4. **Pro+ tier** for continuous career management (higher LTV, lower churn).
5. **Measure D30 from week 3**, not month 6. Retention problems found late are fatal.

### R9 — Founder burnout / bus factor (score 20)
**Why:** a solo founder building a 12-module AI platform, doing SEO, sales, support and partnerships, is a single point of failure for the whole company.

**Mitigation:** the entire roadmap is deliberately scoped so one person *can* do it. No marketplace, no social, no native app, no enterprise in Y1. Everything is documented. Contractor support at €2k MRR. Build in public creates external accountability. **And a hard rule: ship the MVP in 6 weeks, not 6 months.** Long solo builds are where solo founders break.

### R3 — Scraping dependency (score 16)
**Mitigation:** source priority order (APIs > partnerships > user submissions > HTML), 8+ sources minimum, source-health monitoring with automatic failover, and a legal source register documenting ToS position for each. The end-state is that partnerships replace scraping entirely.

### R7/R17 — Trust and data quality (score 16 each)
**Mitigation:** these are the two ways a data product dies quietly. Weekly human audit of 200 random records; duplicate rate as a tracked SLA; factuality guards on all generative output; user reporting on every surface; a public "how we score" methodology page. **Never ship a number we can't defend.**

---

## 4. What would actually kill the company

In order of lethality:

1. **Building for 9 months without a single paying user.** (Most likely death. Not competition.)
2. **Retention under 25% at D30** — proves it's a novelty, not a need.
3. **A privacy incident** — trust is the entire product.
4. **Legal action over scraping** — an existential distraction for a solo founder.
5. **Founder burnout at month 7 with no revenue.**
6. **A funded competitor giving it away free** — only lethal if we haven't accumulated outcome data.

Notice what's *not* on the list: infrastructure costs, LLM pricing, competition from LinkedIn. Those are manageable. The death causes are self-inflicted.

---

## 5. Risk posture verdict

| Question | Answer |
|---|---|
| What is the single most important mitigation? | **Validate distribution in the first 30 days, before building.** |
| What risk is most under-appreciated? | Churn (R2). Everyone worries about CAC; the model dies on retention. |
| What risk is most over-appreciated? | LinkedIn copying us (R4). It can't be neutral; it will be a feature, not a product. |
| What's the cheapest insurance? | Instrument everything from week 1: outcome capture, D30 retention, duplicate rate, LLM cost, source health. You cannot mitigate what you don't measure. |
