# Recommendations Register

A numbered list of every recommendation raised while building, so nothing is lost and everything can be
reviewed once at the end. One row per recommendation. Status is `open`, `done`, `rejected` or `deferred`.

Rule: a recommendation is added here the moment it is raised, with the number it will keep forever. Numbers
are never reused and never reordered.

Last updated: 13 November 2026.

## Register

| # | Recommendation | Surface | Status | Where it landed |
|---|---|---|---|---|
| R-01 | Sweep the semantic badge system across Opportunity Radar and Tracker so no uniform purple pill remains | Radar, Tracker | done | `e54a5ba` UI-116 |
| R-02 | Give the tracker grid a real responsive rule instead of an inline four-column style that squeezed to 90px on a phone | Tracker | done | `e54a5ba` UI-116 |
| R-03 | Stop the current plan reading as an achievement: neutral fill, no green halo, button says Current Plan | Plan | done | `5702c55` UI-117 |
| R-04 | Break the paywall essay into labelled rows and retitle it to say what it is about | Plan | done | `5702c55` COPY-38 |
| R-05 | Replace the plan-only explainer component with one shared facts component | Plan, Copilot, Negotiation, Gaps, Calibration | done | `4faadeb` UI-118 |
| R-06 | Fix `white-space:pre-wrap` inherited by the copilot intro, which rendered 105px of blank space | Copilot | done | `4faadeb` UI-118 |
| R-07 | Take the partner routing operator form off the customer surface: founder-only, and a plain rule statement for everyone else | Partners | done | `9d0f0e5`-series UI-119 |
| R-08 | Stop the referrals API returning payout models, affiliate templates and click counts to a customer | Partners | done | UI-119 |
| R-09 | Turn the Rate Intelligence and Career Score prose into labelled rows | Rates, Scores | done | UI-119 |
| R-10 | The Copilot answer bubble and the Negotiation scripts are the last long unbroken prose in the app; both could carry a label | Copilot, Negotiation | open | – |
| R-11 | Skill Gaps partner cards still show a partner name as a bare chip button; they should carry the same disclosure line the detail panel does | Gaps | open | – |
| R-12 | The Pro+ card lists six "Compare …" bullets that read as a feature dump; they describe one job and could be stated once | Plan | open | – |
| R-13 | `docs/planning/AUDIT-2026-11-11.md` still lists the paywall essay as "unnecessary"; it is back by founder request and the audit should say so | Docs | open | – |
| R-14 | Market Pulse and Career Trajectory carry the same paragraph-before-table shape and have not had the facts pass | Pulse, Trajectory | open | – |
| R-15 | The landing page has no statement of what is free; a visitor meets the price cards before the rule | Landing | open | – |
| R-16 | Learning Loop explained nothing: no statement of what the page is for, jargon labels ("flywheel", "shrinkage", "prior lift"), and a Report button duplicated in two cards | Learning Loop | done | `UI-120` |
| R-17 | Learning Loop grids were inline four-column styles that squeezed on a phone; moved to `.lrn-grid` and `.lrn-funnel` with 1100 and 560 breakpoints | Learning Loop | done | `UI-120` |

## How to use this

- Every new recommendation gets the next number at the moment it is raised, even if it is fixed in the same
  commit. The row is then marked `done` with the commit.
- At the end of the build we walk the table top to bottom and decide each `open` row: build, defer or reject.
- A `rejected` row keeps its number and gains one line saying why, so the same idea is not raised twice.
