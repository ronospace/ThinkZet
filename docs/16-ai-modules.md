# AI Modules

Twelve modules. For each: inputs, outputs, data requirements, models, evaluation metrics, user value, business value.

## Cross-cutting principles

1. **Deterministic where possible, LLM where necessary.** Scoring is arithmetic on embeddings and features; only *explanation* and *generation* use frontier models.
2. **Every output must be explainable.** A score without a reason is a liability ("why did you tell me I'm 31% likely?").
3. **Calibration > accuracy.** A model that says 68% and is right 68% of the time is worth far more than one that says 90% and is right 50% of the time.
4. **Every module logs its output** so it can be evaluated later against real outcomes.
5. **Version everything.** `model_version` on every prediction; a change in model is an experiment, not a deploy.

---

## 1. Opportunity Ranking Engine

**Purpose:** order the user's daily feed so the best opportunities are first.

| | |
|---|---|
| **Inputs** | Career Twin embedding; profile features (seniority, comp floor, location, visa need); candidate set from retrieval; historical user behaviour (views, saves, applies, dismisses); opportunity freshness and source quality |
| **Outputs** | Ranked list (top 10–30) with `rank_position`, `rank_score`, `why_ranked` (top 3 contributing factors) |
| **Data requirements** | ≥5k user-opportunity interaction events for LTR; before that, rules |
| **Models** | **v0 (0–5k users):** weighted rules — `0.35·skill_fit + 0.20·comp_fit + 0.15·location_fit + 0.15·seniority_fit + 0.10·freshness + 0.05·source_quality`. **v1:** LambdaMART / LightGBM ranker on implicit feedback. **v2:** two-tower retrieval + LTR rerank |
| **Evaluation** | NDCG@10, MRR, CTR of rank-1 item, save-rate@10, **downstream interview-rate by rank bucket** (the real metric) |
| **User value** | Never scrolls past the best option; time-to-decision drops from hours to minutes |
| **Business value** | The core retention driver. Higher rank quality → higher D7/D30 → lower CAC payback |

**Key detail:** the ranking model must be trained on *outcomes*, not clicks. Optimising for clicks makes us LinkedIn. Optimising for interviews makes us MirrorSpread.

---

## 2. Career Twin Engine

**Purpose:** a persistent, evolving model of the person that makes every other module personal.

| | |
|---|---|
| **Inputs** | Resume versions; manual profile edits; conversation with copilot; behaviour (saves, dismisses, applies); outcomes; stated goals and constraints; time-based signals (last job change, salary trajectory) |
| **Outputs** | Structured `twin.state` JSON + `twin.embedding` (1536d) + inferred attributes (skills with confidence, risk tolerance, true priorities, deal-breakers) + drift alerts ("your goals changed 3 months ago") |
| **Data requirements** | Per-user: profile, ≥1 resume, ≥20 interactions for behavioural inference |
| **Models** | LLM extraction + summarisation; embedding model; simple online learning for preference weights (Bayesian update on save/dismiss); no custom neural net needed |
| **Evaluation** | **Preference prediction accuracy** (predict the next saved opportunity), recommendation acceptance rate, user correction rate on inferred attributes, twin-coherence score by human review |
| **User value** | The product gets smarter the longer you use it — the definition of a switching cost |
| **Business value** | **The retention moat.** Twin history cannot be ported to a competitor. Directly increases LTV |

**Key detail:** the twin must be *inspectable*. A "here's what MirrorSpread knows about you" page builds trust, catches errors, and is a GDPR asset.

---

## 3. Opportunity Match Scoring Engine

**Purpose:** produce the 6 sub-scores on every opportunity card.

| | |
|---|---|
| **Inputs** | Twin state; opportunity features; skills overlap with importance weights; seniority/experience gap; comp vs floor; location/remote/visa fit; employer signals |
| **Outputs** | `match_score` (0–100), `skill_fit`, `experience_fit`, `income_potential`, `interview_probability`, `offer_probability`, `risk_score`, `missing_skills[]`, `reasons[]` |
| **Data requirements** | Structured skills on both sides; comp data; ≥500 outcomes for probability calibration (before that, use priors from published funnel benchmarks) |
| **Models** | **Skill fit:** weighted Jaccard + embedding cosine on skill semantics. **Experience fit:** gradient-boosted regressor on seniority/years/domain. **Interview probability:** logistic regression → GBM, calibrated with isotonic regression. **Offer probability:** hierarchical model (offer | interview) × interview prob. **Risk:** rules + employer health |
| **Evaluation** | **Calibration curve / Brier score** (primary), AUC-ROC, MAE on income prediction, precision@10 for "high match → applied" |
| **User value** | Rational effort allocation: stop applying to 15% roles, double down on 68% ones |
| **Business value** | The headline feature. Directly drives conversion to Pro ("unlimited match scores") and word-of-mouth ("it told me my odds") |

**Key detail:** publish the calibration. "Of opportunities we scored 60–70%, 64% resulted in an interview" is the most trust-building sentence the company can say.

---

## 4. AI Resume Parser

**Purpose:** turn any CV (PDF/DOCX) into structured, trustworthy profile data.

| | |
|---|---|
| **Inputs** | Resume file (PDF/DOCX/plain text) |
| **Outputs** | `parsedJson` (experience, education, skills with evidence, dates, seniority estimate) + confidence per field + list of fields needing user confirmation |
| **Data requirements** | 500+ annotated CVs for eval; LLM extraction handles the rest zero-shot |
| **Models** | PDF text extraction (pdf-parse/unstructured) → LLM structured extraction with strict JSON schema (Zod) → rule-based date/seniority normalisation → skill entity linking against the controlled vocabulary |
| **Evaluation** | Field-level F1 (company, title, dates, skills), skill-linking precision/recall, **user-correction rate** (primary — the honest metric), parse success rate |
| **User value** | 5-second onboarding instead of 20 minutes of forms |
| **Business value** | Onboarding completion is the #1 funnel lever; also seeds the skills graph |

**Key detail:** never silently trust the parse. Show the extracted data with "confirm" affordances. Corrected data is better data.

---

## 5. Resume Optimiser

**Purpose:** rewrite/restructure a CV for a specific opportunity, honestly.

| | |
|---|---|
| **Inputs** | Resume version; target opportunity (description + required skills); gap analysis |
| **Outputs** | Optimised resume (DOCX/PDF) + diff view + ATS score + list of what changed and why + warnings where the user lacks evidence |
| **Data requirements** | Opportunity skill requirements; ATS heuristics; successful-resume corpus (later, from outcomes) |
| **Models** | LLM (frontier) with structured rewrite instructions + a factuality guard (no invented experience) + embedding check that key skills are present |
| **Evaluation** | ATS score delta, **interview rate of optimised vs unoptimised applications** (A/B, the only metric that matters), hallucination rate (must be 0), user acceptance rate of changes |
| **User value** | Tailored applications without 2 hours of editing |
| **Business value** | Strong Pro feature; measurable outcome lift = retention |

**Hard rule:** the optimiser may reframe, reorder and re-emphasise. It may **never fabricate**. Every generated bullet must be traceable to source text.

---

## 6. Cover Letter Generator

| | |
|---|---|
| **Inputs** | Resume, opportunity, user voice samples (optional), tone preference |
| **Outputs** | 150–250 word letter, 3 variants (formal/warm/direct), editable, with a "why this company" hook derived from real data |
| **Data requirements** | Opportunity description, employer info, user's strongest matching evidence |
| **Models** | Frontier LLM with few-shot examples per role family; retrieval of the 3 most relevant experience bullets |
| **Evaluation** | User acceptance/edit distance, send rate, **interview rate for cover letters used**, hallucination rate |
| **User value** | Saves 30–60 min per application |
| **Business value** | High perceived value, low cost, strong upsell trigger |

---

## 7. Interview Coach

| | |
|---|---|
| **Inputs** | Opportunity (role, company, level), user profile, interview stage, prior interview feedback |
| **Outputs** | Predicted question set (role-specific + company-specific), STAR answer scaffolding from the user's real experience, mock Q&A with scoring, a 30/60/90 prep plan |
| **Data requirements** | Question corpus per role/company (scraped from public interview reports), user experience bullets |
| **Models** | RAG over question corpus + frontier LLM for dialogue; rubric-based scoring (structure, specificity, evidence, impact) |
| **Evaluation** | Interview pass rate for coached users vs control (the killer metric), user-rated usefulness, prep completion rate |
| **User value** | Directly converts interviews into offers |
| **Business value** | Highest-perceived-value feature in Pro; the natural anchor for Pro+ and coaching marketplace |

---

## 8. Salary Prediction Engine

| | |
|---|---|
| **Inputs** | Role family, seniority, skills, country/city, remote status, channel (full-time/contract/marketplace), company size/stage |
| **Outputs** | Predicted range (p25/p50/p75), confidence, comparable records (anonymised), delta vs the user's current/offered comp, negotiation headroom |
| **Data requirements** | `salary_records` from postings + user-reported + partner feeds; ≥50 records per segment for publication (k-anonymity) |
| **Models** | Quantile regression (GBM) per role family with hierarchical pooling by country; fallback to published benchmarks when n is small |
| **Evaluation** | MAE vs actual offer amounts (from `outcomes` — this is where the moat pays off), interval coverage (does p25–p75 contain the truth 50% of the time?), user-rated accuracy |
| **User value** | The "holy shit" moment: "you're 32% underpaid" |
| **Business value** | **The single best acquisition hook.** Rate-gap insight is the highest-converting free feature and the best shareable content |

---

## 9. Career Growth Predictor

| | |
|---|---|
| **Inputs** | Current profile, target role/level, chosen path, market trends, historical trajectories of similar users |
| **Outputs** | 12/24/36-month projection: expected comp, expected level, probability of achieving the target, 3 alternative paths with trade-offs, key risks |
| **Data requirements** | Longitudinal outcome data (starts at ~6 months of operation); market trend data; skill demand curves |
| **Models** | Survival analysis (time-to-promotion / time-to-offer) + Monte Carlo simulation over path options; LLM narrates the scenarios |
| **Evaluation** | Prediction error at 12 months (backtested), user-rated decision usefulness, % of users who act on a recommendation |
| **User value** | Answers "which path creates the fastest growth?" — the question nobody else answers |
| **Business value** | The premium-tier anchor ("planning" is worth more than "searching") |

---

## 10. Skill Gap Detector

| | |
|---|---|
| **Inputs** | User skills (with confidence/years), target opportunities' required skills (weighted), market demand trends |
| **Outputs** | Ranked gaps: skill, market demand, salary premium, effort to close, time estimate, evidence of the gap in the user's own applications |
| **Data requirements** | Skills graph; `opportunity_skills` with importance; `skill_market_stats` |
| **Models** | Set-difference over the skill graph + importance weighting + effort estimation (heuristic per skill, later learned from users who closed gaps) |
| **Evaluation** | Precision of "this gap is blocking you" (measured by whether closing it correlates with interviews), user action rate on gaps, skill closure rate |
| **User value** | "AWS + MLOps is why you're not getting these" — actionable, not generic |
| **Business value** | Drives the learning marketplace (highest-intent course recommendations possible) |

---

## 11. Learning Recommendation Engine

| | |
|---|---|
| **Inputs** | Skill gaps, user time budget, learning style, budget, prior courses, career target |
| **Outputs** | Sequenced plan (8–12 weeks), 1–3 specific resources per gap (course/cert/project), expected salary impact, cost/time |
| **Data requirements** | Course catalogue with skill mappings; certification data; outcome data on "did the course close the gap?" |
| **Models** | Constraint-based sequencing + collaborative filtering on what similar users completed; LLM to build the plan narrative |
| **Evaluation** | Plan completion rate, gap closure rate, course conversion, **interview rate after plan completion** |
| **User value** | Stops course-hopping; gives a shortest path |
| **Business value** | Learning marketplace revenue (15–30% rev share) + retention (a plan is a reason to return weekly) |

---

## 12. Career Advisor Engine

**Purpose:** the conversational copilot that ties everything together.

| | |
|---|---|
| **Inputs** | User question + full twin context + retrieved data (opportunities, benchmarks, trends, their own outcomes) |
| **Outputs** | Grounded, specific advice with citations to the user's own data ("based on your 3 applications this month…"), recommended next action, and an offer to execute it |
| **Data requirements** | RAG index over: user profile, opportunities, salary data, skill stats, curated career knowledge base |
| **Models** | Frontier LLM + RAG + tool calling (search opportunities, compute scores, build plans) + guardrails (no invented salary data, no legal/immigration advice beyond sourced facts) |
| **Evaluation** | Groundedness/hallucination rate (human + LLM judge), user-rated helpfulness, action-taken rate after a conversation, deflection of support tickets |
| **User value** | A career advisor who knows your whole situation and never forgets |
| **Business value** | The Pro retention engine; the surface that makes every other module discoverable |

**Guardrails:** the advisor must never fabricate salary numbers, never give immigration legal advice as fact (it cites official thresholds and routes to partners), and must always say when it doesn't know.

---

## Module dependency graph

```
Resume Parser ──► Skills Graph ──► Skill Gap Detector ──► Learning Recommender
      │                 │                    │
      ▼                 ▼                    ▼
Career Twin ──► Match Scoring ──► Ranking Engine ──► Feed
      │                 │
      │                 ├──► Salary Prediction
      │                 └──► Growth Predictor
      ▼
Career Advisor (RAG over everything) ◄── Interview Coach
                                        ◄── Cover Letter
                                        ◄── Resume Optimiser
```

**Build order:** Parser → Skills Graph → Match Scoring → Ranking → Salary → Advisor → Gap Detector → Cover Letter → Interview Coach → Resume Optimiser → Twin v2 → Growth Predictor.

---

## Cost and latency budget

| Module | Calls/user/month | Model class | Cost/user/mo | Latency target |
|---|---|---|---|---|
| Resume Parser | 1–3 | small | €0.02 | <20s async |
| Match Scoring | batched (no per-opp LLM) | none (numeric) | €0.00 | <50ms |
| Ranking | 1/day | none (numeric) | €0.00 | <100ms |
| Explanations | 30–80 | small/mid | €0.04 | <2s cached |
| Salary | 2–5 | none + template | €0.00 | <200ms |
| Skill Gap | 2 | small | €0.01 | <2s |
| Learning Rec | 1 | mid | €0.01 | <4s |
| Cover Letter | 1–3 | frontier | €0.03 | <8s |
| Interview Coach | 2–5 sessions | frontier | €0.02 | streaming |
| Advisor chat | 20–40 msgs | frontier | €0.03 | streaming |
| **Total** | | | **≈ €0.16** | |

Target blended inference cost **< €0.20/user/month** — against €17 ARPU, that's ~1% of revenue.
