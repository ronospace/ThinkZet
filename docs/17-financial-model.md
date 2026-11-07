# Financial Model

All figures EUR, base case, solo-founder-led with disciplined hiring. Assumptions stated so they can be challenged.

---

## 1. Key assumptions

| Assumption | Y1 | Y2 | Y3 | Rationale |
|---|---|---|---|---|
| Registered users (exit) | 18,000 | 140,000 | 620,000 | SEO compounding + referral loops |
| Free → paid conversion | 3.9% | 4.4% | 5.0% | Above category norm (2–3%) because of the outcome-driven value prop; validated in Phase 2 |
| Monthly Pro churn | 7.0% | 6.0% | 5.0% | Improves as Career Twin data accumulates |
| Blended ARPU (Pro) | €16.00 | €16.80 | €17.50 | Mix of monthly €19, annual €149 (→€12.42/mo), regional PPP |
| Annual plan share | 30% | 40% | 45% | Trust grows with outcomes |
| Blended CAC | €0–5 (Y1) | €22 | €28 | Y1 organic-only; paid starts M10 |
| Gross margin | 84% | 87% | 89% | Infra + LLM costs scale sub-linearly |
| Team | 1 (founder) | 1 + 1 eng + 1 growth (H2) | 6–7 | Hire only against proven metrics |

---

## 2. Revenue build (monthly detail, Year 1)

| Month | Users | New paid | Churned | Paid (exit) | MRR | Revenue (incl. referral) |
|---|---|---|---|---|---|---|
| M1 | 300 | 8 | 0 | 8 | €130 | €130 |
| M2 | 900 | 20 | 1 | 27 | €430 | €430 |
| M3 | 2,000 | 45 | 2 | 70 | €1,120 | €1,300 |
| M4 | 3,500 | 70 | 5 | 135 | €2,160 | €2,700 |
| M5 | 5,200 | 95 | 9 | 221 | €3,540 | €4,400 |
| M6 | 7,000 | 120 | 15 | 326 | €5,220 | €6,400 |
| M7 | 9,000 | 135 | 22 | 439 | €7,020 | €8,600 |
| M8 | 11,000 | 145 | 30 | 554 | €8,860 | €10,700 |
| M9 | 13,000 | 150 | 38 | 666 | €10,660 | €12,800 |
| M10 | 15,000 | 160 | 46 | 780 | €12,480 | €15,000 |
| M11 | 16,500 | 155 | 54 | 881 | €14,100 | €16,800 |
| M12 | 18,000 | 160 | 61 | 980* | €15,700 | €18,600 |

\* *Including free-trial conversions and annual-plan upfront cash, the **exit** paid count modelled in the summary is 700 net paying with ≥1 payment in the last 30 days; the 980 figure counts trials and grace-period users. We report the conservative 700.*

**Year 1 revenue:** Subscription €46k + Referral €28k + Services €4k = **€78k**

---

## 3. Three-year P&L (base case)

| Line | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| **Revenue** | | | |
| Subscriptions | €46,000 | €380,000 | €2,230,000 |
| Referral revenue | €28,000 | €180,000 | €790,000 |
| Services marketplace (net) | €4,000 | €44,000 | €400,000 |
| Learning marketplace (net) | €0 | €6,000 | €180,000 |
| **Total revenue** | **€78,000** | **€610,000** | **€3,600,000** |
| | | | |
| **COGS** | | | |
| Infrastructure (hosting, DB, storage) | €2,400 | €9,600 | €48,000 |
| LLM / AI inference | €3,600 | €24,000 | €120,000 |
| Payment processing (2.9% + €0.25) | €2,100 | €18,000 | €108,000 |
| Third-party APIs / data | €1,200 | €6,000 | €24,000 |
| Support tools | €600 | €3,000 | €12,000 |
| Marketplace provider payouts | €3,200 | €33,000 | €96,000 |
| **Total COGS** | **€13,100** | **€93,600** | **€408,000** |
| **Gross profit** | **€64,900** | **€516,400** | **€3,192,000** |
| **Gross margin** | **83.2%** | **84.7%** | **88.7%** |
| | | | |
| **Operating expenses** | | | |
| Founder salary | €0 | €36,000 | €72,000 |
| Engineering (2 in Y2 H2, 2 in Y3) | €0 | €60,000 | €240,000 |
| Growth / content (1 in Y2 H2, 1.5 in Y3) | €0 | €30,000 | €120,000 |
| Data / ops (0.5 in Y3) | €0 | €0 | €50,000 |
| Marketing (paid, content, tools) | €4,000 | €30,000 | €180,000 |
| Software & subscriptions | €3,600 | €8,400 | €24,000 |
| Legal, accounting, compliance | €2,500 | €12,000 | €30,000 |
| Office / equipment / misc | €2,000 | €6,000 | €18,000 |
| **Total opex** | **€12,100** | **€182,400** | **€734,000** |
| | | | |
| **EBITDA** | **€52,800** | **€334,000** | **€2,458,000** |
| **Net margin** | **67.7%** | **54.8%** | **68.3%** |

*Founder works unpaid in Year 1 (funded by savings/consulting). If a €36k founder salary is taken from M1, Year 1 EBITDA drops to ~€17k and break-even moves to M14.*

---

## 4. Break-even analysis

| Scenario | Fixed monthly cost | Contribution margin/paid user | Break-even paid users | Break-even month |
|---|---|---|---|---|
| **Lean (solo, no salary)** | €1,008 | €13.30 | 76 | **M4** |
| **Base (solo + €3k/mo salary from M1)** | €4,008 | €13.30 | 301 | **M6** |
| **With 1 hire from M9** | €7,500 | €13.30 | 564 | **M8** |

**Cash break-even (cumulative) = Month 11** in the base case: cumulative spend of ~€60k is recovered by M11–M12 revenue. Peak cash requirement: **€25–35k** (well within a founder's ability to self-fund).

**This is the most important financial fact in this document:** Karyvo does not need venture capital to reach €10k MRR and profitability.

---

## 5. The four milestone models

### €10k MRR

| Lever | Value | Notes |
|---|---|---|
| Paid subscribers | 590 | At €17 blended ARPU |
| Registered users needed | ~13,000 | At 4.5% conversion |
| Traffic needed (M9–12) | ~45,000 sessions/mo | SEO + social + referral |
| Time to reach | **Month 9–10** | Base case |
| Cumulative investment | ~€35k | |
| What must be true | D30 ≥ 35%, conversion ≥ 3.5%, churn ≤ 7% | |

**Fastest path to €10k MRR:** if referral revenue lands early (2 partners × €1.5k/mo), €10k MRR arrives at **Month 7** with ~420 subscribers.

---

### €50k MRR

| Lever | Value |
|---|---|
| Paid subscribers | 2,700 |
| + Referral revenue | €6,000/mo |
| + Services | €1,500/mo |
| Registered users | ~62,000 |
| Time to reach | **Month 16–18** |
| Team at that point | 4 (founder, 1 eng, 1 growth, 0.5 content) |
| D30 retention required | ≥ 40% |

---

### €100k MRR (€1.2M ARR)

| Lever | Value |
|---|---|
| Paid subscribers | 5,200 |
| + Referral | €10,000/mo |
| + Services | €3,000/mo |
| + Learning | €1,000/mo |
| Registered users | ~120,000 |
| Time to reach | **Month 21–24** |
| Team | 6–7 |
| NRR | > 105% |

---

### €1M ARR (€83.3k MRR)

Essentially the same as €100k MRR — reached at **Month 22–25** in the base case.

**Year 2 exit ARR: €1.45M** (€121k MRR in December of Y2). ✅

---

## 6. Unit economics

| Metric | Y1 | Y2 | Y3 |
|---|---|---|---|
| Blended CAC | €0.22 (organic only) | €22 | €28 |
| ARPU (monthly) | €16.00 | €16.80 | €17.50 |
| Avg customer lifetime (months) | 14.3 | 16.7 | 20.0 |
| **LTV** | **€229** | **€281** | **€350** |
| **LTV / CAC** | ∞ (organic) | **12.8x** | **12.5x** |
| CAC payback | 0 months | 1.3 months | 1.6 months |
| Gross margin | 83% | 85% | 89% |
| Net revenue retention | — | 103% | 108% |
| Rule of 40 (growth% + margin%) | n/a | 100%+ | 100%+ |

**Note:** the LTV/CAC of 12.5x is unusually high because SEO + referral dominate acquisition. If we model 100% paid acquisition at €28 CAC and 16-month lifetime, LTV/CAC = 10x — still excellent. The risk is **not** unit economics; it is **volume of traffic**.

---

## 7. Sensitivity analysis

### Impact on Year 2 revenue (base €610k)

| Variable | -30% | Base | +30% |
|---|---|---|---|
| Conversion rate | €500k | €610k | €730k |
| **Retention (churn)** | **€420k** | €610k | €790k |
| Traffic / users | €455k | €610k | €770k |
| ARPU | €520k | €610k | €700k |
| Referral revenue | €556k | €610k | €664k |

**Retention is the most sensitive variable by far.** A 30% worse churn (7.8% vs 6.0%) costs more than a 30% worse conversion. This is why Phase 3's only job is retention.

### Scenario matrix (Year 3 ARR)

| | Poor churn (7%) | Base churn (5%) | Great churn (3.5%) |
|---|---|---|---|
| **Poor conversion (2.5%)** | €2.1M | €3.2M | €4.6M |
| **Base conversion (5%)** | €4.9M | **€7.4M** | €10.6M |
| **Great conversion (7%)** | €6.9M | €10.4M | €14.8M |

---

## 8. Cash flow & funding

| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Opening cash | €15,000 | €45,000 | €310,000 |
| Operating cash flow | €52,800 | €310,000 | €2,300,000 |
| Capex / equipment | €2,000 | €6,000 | €18,000 |
| Founder drawings | €0 | €36,000 | €72,000 |
| **Closing cash** | **€65,800** | **€313,000** | **€2,520,000** |
| **Minimum cash point** | **€8,000 (M3)** | — | — |

**Funding requirement to execute the base case: €0.** The €25–35k peak gap is bridgeable with founder savings or €5–10k of consulting income.

**If raising a €1.0M pre-seed at M6:** the plan accelerates (hire 2 engineers, spend €180k on content/SEO, land 30 university contracts) and targets €3M ARR by M24 instead of €1.45M — but adds a board and a growth-at-all-costs pressure that may push toward paid acquisition before retention is proven. **Recommendation: raise only after M9, only if retention ≥ 40%.**

---

## 9. Cost of development (if outsourced / if hiring)

| Item | Solo (base) | With a hired engineer |
|---|---|---|
| MVP build (6 weeks) | €0 (founder time) | €18,000–€30,000 |
| Design system / brand | €0 (templates) | €3,000–€8,000 |
| Legal (T&Cs, privacy, DPA) | €1,500 | €1,500 |
| Stripe + billing setup | €0 | €0 |
| Data sources / APIs (Y1) | €1,200 | €1,200 |
| **Total to first revenue** | **€2,700** | **€25,000–€40,000** |

---

## 10. Financial verdict

| Question | Answer |
|---|---|
| Does this business work? | Yes — 85–89% gross margins, break-even at ~300 paid users, positive cash from M11. |
| Does it need VC money? | **No.** It needs 6 weeks of focused building and 90 days of distribution. |
| What's the biggest financial risk? | Churn. Not CAC, not infrastructure, not LLM cost. |
| What's the highest-leverage financial decision? | **Annual-first pricing from day one** — it converts a 3–6 month customer into a 12-month one and funds growth with customer cash. |
| What would break the model? | A talent marketplace cutting off referral revenue (mitigated by multi-partner spread) or a search-algorithm change killing SEO (mitigated by newsletter + referral loops). |
