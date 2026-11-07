# Go-To-Market Strategy

## 0. The GTM thesis

We have no budget and no audience. Therefore GTM must be **product-led, content-compounding, and partner-leveraged**. Three rules:

1. **Every user action must produce an artifact the internet wants.** A scored opportunity, a rate-gap insight, a relocation readiness check. These become shareable, indexable assets.
2. **Own the long tail of decision queries.** "Is €85k enough to relocate to Berlin as a senior data scientist" is a query nobody answers well and everyone searches. That's where we win SEO.
3. **Never pay for a user until the free loop is proven.** Paid acquisition on an unproven retention curve is the fastest way to burn a pre-seed.

---

## 1. SEO strategy (foundation, months 1–12)

### 1.1 The keyword universe

| Cluster | Example queries | Volume | Difficulty | Intent | Our answer |
|---|---|---|---|---|---|
| **Rate/salary by profile** | "Mercor rates for data scientists", "micro1 pay rates", "AI contractor hourly rate 2026" | High | Low | 🔥 Commercial | Live benchmark pages from aggregated data |
| **Visa + role** | "visa sponsorship jobs Germany data scientist", "EU Blue Card salary threshold 2026" | Medium-High | Medium | 🔥 Transactional | Opportunity pages + eligibility checker |
| **Cross-platform comparison** | "Mercor vs micro1 vs Turing pay", "Upwork vs Toptal for AI engineers" | Medium | Low | 🔥 Commercial | Comparison pages with real rate data |
| **Skill → salary** | "highest paying AI skills 2026", "MLOps vs LLMOps salary" | Medium | Low | Warm | Skill graph pages |
| **Decision queries** | "is it worth relocating to Berlin as a developer", "contract vs full-time AI engineer" | Medium | Very low | 🔥 High-value | Decision guides with calculator |
| **Programmatic role×city×visa** | "senior data scientist jobs Berlin visa sponsorship" | Long tail ×1000s | Low | Transactional | Opportunity feed pages |

### 1.2 The 5 SEO plays

**Play 1 — Rate Benchmark Pages (the wedge).**
`careeros.ai/rates/[platform]/[role]` — e.g. `/rates/mercor/data-scientist-eu`.
Content: median/p25/p75 rate from aggregated postings + user-reported outcomes, updated weekly, with a "compare your rate" CTA.
**Why it works:** high commercial intent, low competition, and the data is ours. Each page is a moat artifact.

**Play 2 — Visa-Sponsored Opportunity Pages.**
`careeros.ai/visa/[country]/[role]` — curated, verified sponsoring opportunities + eligibility rules + salary thresholds.
**Why it works:** extremely high intent, near-zero good competition, natural partner surface for immigration firms.

**Play 3 — Comparison Pages.**
`careeros.ai/compare/[platform-a]-vs-[platform-b]` for every meaningful pair (Mercor, micro1, Turing, Upwork, Toptal, Arc, Contra, Braintrust, Fiverr, Wellfound). Honest, data-backed, with "which suits your profile" logic.
**Why it works:** nobody does this well; incumbents can't (conflict); it converts.

**Play 4 — Skill Graph Pages.**
`careeros.ai/skills/[skill]` — demand trend, salary premium, adjacent skills, 8-week learning path, matching opportunities.
**Why it works:** thousands of pages, evergreen, each one a funnel into the product.

**Play 5 — Decision Guides (E-E-A-T).**
Long-form, opinionated: "The real cost of relocating to the Netherlands as a senior engineer in 2026." Original data, named author, first-hand experience.
**Why it works:** builds domain authority and trust; feeds the newsletter and LinkedIn.

### 1.3 SEO targets

| Milestone | Month | Organic sessions/mo | Signups/mo from SEO |
|---|---|---|---|
| 50 indexable pages | M3 | 3,000 | 120 |
| 500 pages | M6 | 25,000 | 900 |
| 2,000 pages | M12 | 120,000 | 3,800 |
| 6,000 pages | M24 | 450,000 | 12,000 |

---

## 2. Programmatic SEO strategy

**The engine:** one database → many high-quality pages, generated from structured data, not LLM spam.

### Page template families

| Template | Pattern | Est. pages | Unique data per page |
|---|---|---|---|
| Rate benchmark | `/rates/{platform}/{role}/{region}` | 2,400 | median rate, sample size, trend, top skills |
| Visa route | `/visa/{country}/{role}` | 1,100 | salary threshold, eligibility, live sponsored roles |
| Role × city | `/opportunities/{role}/{city}` | 4,800 | live opportunity count, comp band, hiring trend |
| Skill page | `/skills/{skill}` | 900 | demand index, salary premium, adjacency, learning path |
| Comparison | `/compare/{a}-vs-{b}` | 180 | rate tables, placement speed, fee structure |
| Career Score explainer | `/career-score/{score}/{role}` | 600 | benchmark distribution for that role |

**Total: ~10,000 pages** within 18 months.

### Quality guardrails (this is what separates programmatic SEO from spam)

1. **Every page must have ≥1 piece of data that exists nowhere else** (our aggregated rates, our outcome stats, our visa verification).
2. **Minimum data thresholds** — no page ships until it has ≥20 underlying records (k-anonymity + substance).
3. **Unique editorial layer** — 150–300 words of genuinely specific commentary per page, human-reviewed.
4. **Internal linking graph** — role → skills → visa → opportunities → rates.
5. **Freshness** — auto-updated weekly; "last updated" visible.
6. **No thin pages** — if a combination has no data, it 404s (and we say why).

---

## 3. LinkedIn strategy

LinkedIn is where the ICP lives and where our *category* can be created. We do not post "job tips." We post **data**.

### Content pillars (weekly cadence)

| Day | Pillar | Format | Example |
|---|---|---|---|
| Mon | **Rate teardown** | Carousel + number | "Mercor paid a senior DS €95/hr last month. Here's the range for 40 similar profiles." |
| Wed | **Decision framework** | Text + poll | "Contract at €90/hr vs full-time at €85k in Berlin: the 5-year math nobody does." |
| Fri | **Build in public** | Text + screenshot | "Week 6: 340 users, 3 paid, €57 MRR. What broke and what I learned." |

### The mechanics

- **Target 5,000 followers in 6 months** from ~40 posts, driven by data posts that get resurfaced.
- **Comment strategy:** 10 substantive comments/day on posts by AI-talent leaders, recruiters, and relocation voices. Cheaper than ads, builds authority.
- **DM strategy:** personal invites to design partners from commenters who engage with rate posts. Target 20 DMs/day → 2–3 signups.
- **Never** run engagement pods or buy followers — trust is the product.

---

## 4. Newsletter strategy

**"The Opportunity Brief"** — weekly, 900 words, one core insight.

| Section | Content |
|---|---|
| **The number** | One data point from our own data (e.g. "the median rate for EU LLM engineers moved +12% this month") |
| **The opportunity** | One high-scoring opportunity type, explained |
| **The decision** | One framework (contract vs full-time, country A vs B, pivot path) |
| **The gap** | One skill that's rising/falling with salary impact |
| **The ask** | One CTA (usually: run your free Career Score) |

**Why it's the highest-ROI channel:** it's a direct line to the ICP, it compounds (a 3,000-subscriber list is an asset forever), and it's free.

**Targets:** 500 subs by M2 (from launch), 3,000 by M6, 12,000 by M12. Open rate 42%+ (niche, high-value).

---

## 5. YouTube strategy

**Format:** 8–12 minute "decision teardowns" — screen-recorded, data-driven, no fluff.

| Video type | Example | Why it works |
|---|---|---|
| Rate teardown | "What Mercor, micro1 and Turing actually pay in 2026" | Search-driven, evergreen, high intent |
| Relocation math | "The real cost of moving to Berlin on €85k" | Huge long-tail demand |
| MirrorSpread demo | "How I'd find my next opportunity in 4 minutes" | Product demo with context |
| Build in public | "Month 3 of building a startup with no funding" | Audience building, founder brand |

**Cadence:** 1/week from M2. Target: 1,000 subs by M6, 8,000 by M12. Each video repurposed into 3 LinkedIn posts, 1 newsletter section, 1 SEO page embed.

---

## 6. Referral marketing strategy (product-led)

Three referral loops, each built into the product:

**Loop A — The Insight Share (viral, free-tier).**
When a user gets a rate-gap insight, they can share a *beautifully designed card*: "My market rate is €95–120/hr. MirrorSpread found me €38k/yr." (No personal data leaked; they choose what's shown.)
→ Every share is an acquisition ad with social proof.

**Loop B — The Outcome Proof.**
When a user reports a win ("signed a contract at +32% rate"), we prompt a shareable outcome card and offer 1 month free for a verified referral.
→ Builds the outcome dataset *and* acquires users.

**Loop C — The Cohort Invite.**
Two-sided: invite 3 peers → 1 month free for both. Target communities (Discord servers, bootcamp cohorts, relocation groups).
→ Best for early density in a single niche.

**Referral targets:** K-factor 0.35 by M6, 0.55 by M12. (Below 1.0 is fine; it just reduces CAC.)

---

## 7. Ambassador programme

**What:** 30–50 ambassadors — community leaders in AI-talent Discords, bootcamp TAs, relocation group admins, university society leads.

**Offer:** free Pro + 30% recurring commission on their referrals for 12 months + early access + a public "founding ambassador" badge.

**Why it works:** they already own distribution in exactly the communities where P1/P2 live. Cost is variable and only paid on success.

**Launch at M4** (after the product is credible). Target 20 ambassadors by M6.

---

## 8. University outreach strategy

**Why:** P4 (early career) is cheap volume, universities have budget, and cohorts give us density + a data goldmine (cohort outcomes).

**Offer:** free MirrorSpread for final-year students; a cohort dashboard for the careers service (aggregate employability, skill gaps, where graduates land); a paid "Cohort Intelligence" tier for the university.

**Sequence:**
1. Start with 3–5 universities where the founder has a connection (M5).
2. Publish a "Graduate Outcome Benchmark" report from cohort data — free PR (M8).
3. Scale to 30 universities via the careers-services conference circuit (M12+).

**Revenue note:** this is Year-2 revenue, not Year-1. In Year 1 it's a free acquisition channel and a data source.

---

## 9. Community growth strategy

**Principle: don't build a community. Go where communities already are.**

| Community | Tactic | Target |
|---|---|---|
| Mercor / micro1 / Turing Discords | Rate teardowns, weekly "opportunity of the week," answer rate questions | 15% of M6 users |
| r/cscareerquestionsEU, r/datascience | Data-driven posts (never link-dropping), AMAs | 10% |
| Relocation groups (Germany/Netherlands/Canada) | Visa-sponsorship guides + eligibility checker | 15% |
| Indie Hackers / X build-in-public | Weekly metrics thread | Founder brand |
| Bootcamp alumni Slack/Discords | Cohort deals | 10% |

**Rule:** contribute 10x before asking once. Every community post must contain a real insight from our data.

---

## 10. Recruiter / platform partnership strategy

**Goal:** be a *supply channel* for them, not a competitor.

| Partner type | What they get | What we get |
|---|---|---|
| AI-talent marketplaces (Mercor, micro1, Turing, Arc) | Pre-qualified, well-matched candidates with a complete Career Twin profile (better signal than a raw CV) | Referral bounty €50–€400 |
| Niche job boards (Otta, Wellfound, RemoteOK) | Qualified traffic | Affiliate/referral fees, or data partnership |
| Immigration & relocation firms | High-intent qualified leads with pre-assessed eligibility | €50–€500 per consultation |
| Training/cert providers | Skill-gap-targeted students (the highest-intent learner possible) | 15–30% rev share |

**The pitch to a marketplace:** *"We don't compete for the candidate. We tell them which platform is best for them — and when it's you, you get a candidate whose skills, rate expectations and constraints are already structured. Your conversion rate goes up, your screening cost goes down."*

**Partnership sequence:** start with the smallest, most flexible partners (Arc, niche boards, immigration firms) to prove the loop, then approach Mercor/micro1/Turing with numbers.

---

## 11. Growth loops by stage

### 100 users (Month 1) — **founder-led, manual**

| Channel | Tactic |
|---|---|
| Personal network | 30 hand-written invitations; 1:1 onboarding calls |
| AI-talent Discords | 5 communities, daily genuine participation |
| LinkedIn | 15 posts, 10 comments/day, 20 DMs/day |
| Design partners | 12 users who commit to weekly feedback |

**Goal:** 100 users, 10 paying, 20 completed CV uploads, first 5 outcomes. **Nothing automated.** The founder personally reads every support message.

---

### 1,000 users (Month 2–4) — **content + referral**

| Channel | Tactic |
|---|---|
| Programmatic SEO | First 150 rate + visa pages live |
| Newsletter | 800 subscribers |
| Referral Loop A | Insight share cards |
| Ambassador programme | First 10 ambassadors |
| Product Hunt | Launch at M3 (after 2 iterations) |

**Goal:** 1,000 users, 3.5% paid conversion, D30 retention ≥ 30%, K-factor ≥ 0.2.

---

### 10,000 users (Month 5–9) — **compounding loops**

| Channel | Tactic |
|---|---|
| SEO | 800+ pages, 30k organic/mo |
| Referral | K-factor 0.4; outcome cards in the wild |
| Partnerships | 3 signed referral partners driving revenue |
| YouTube | 1,500 subs, evergreen rate videos ranking |
| Universities | 3 pilot cohorts |

**Goal:** 10,000 users, 400 paid, €7k MRR, D30 ≥ 38%.

---

### 100,000 users (Month 10–18) — **paid + institutional**

| Channel | Tactic |
|---|---|
| SEO | 2,500+ pages, 120k organic/mo |
| Paid | Only now: €0.60–€1.20 CPC on high-intent rate/visa queries; CAC target <€35 |
| Institutional | 10 university contracts, 3 bootcamp partnerships |
| Marketplace | Services + learning live, raising ARPU 25% |
| PR | Annual "Global Opportunity Report" from our data |

**Goal:** 100k users, 4,500 paid, €85k MRR, D30 ≥ 44%.

---

### 1,000,000 users (Year 3–4) — **category ownership**

| Channel | Tactic |
|---|---|
| SEO | 6,000+ pages; category-defining content |
| Brand | "MirrorSpread" becomes the verb for career decisioning |
| Institutional | 100+ university/enterprise contracts |
| Geographic | Localised in DE, NL, FR, ES, PT-BR, HI |
| API | Comp-data and skills API licensed to HR tech |
| Network | Talent Graph becomes an infrastructure layer |

**Goal:** 1M users, 31k+ paid, €620k+ MRR, category leader.

---

## 12. Channel ROI summary (Year 1)

| Channel | Cost | Users acquired | CAC | Assessment |
|---|---|---|---|---|
| SEO / programmatic | €0 (time) | 6,200 | €0 | 🟢 Best long-term ROI; slow to start |
| LinkedIn / build-in-public | €0 | 3,400 | €0 | 🟢 Best early ROI |
| Communities / Discord | €0 | 2,900 | €0 | 🟢 High density, high fit |
| Referral loops | €0 (free months) | 2,300 | ~€6 | 🟢 Scales with product quality |
| Newsletter | €0 | 1,400 | €0 | 🟢 Compounding asset |
| Ambassadors | 30% rev share | 1,100 | ~€18 | 🟡 Good at scale |
| Product Hunt | €0 | 500 | €0 | 🟡 One-shot spike |
| Paid ads | €4,000 | 1,400 | €28 | 🔴 Only after retention proven |
| **Total** | **€4,000** | **~18,000** | **~€0.22** | — |

## 13. GTM verdict

| Question | Answer |
|---|---|
| What is the single best channel? | **Programmatic SEO on rate + visa queries.** It's the only channel where our data moat *is* the distribution. |
| What is the fastest channel? | Founder-led LinkedIn + Discord participation. Days, not months. |
| What must never be done in Year 1? | Paid acquisition at scale, community building, influencer marketing, PR stunts. |
| What is the biggest GTM risk? | SEO takes 4–6 months to compound. Mitigation: founder-led channels carry months 1–4. |
