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
| R-12 | The Pro+ card lists six "Compare …" bullets that read as a feature dump; they describe one job and could be stated once | Plan | done | `UI-122` |
| R-13 | `docs/planning/AUDIT-2026-11-11.md` still lists the paywall essay as "unnecessary"; it is back by founder request and the audit should say so | Docs | open | – |
| R-14 | Market Pulse and Career Trajectory carry the same paragraph-before-table shape and have not had the facts pass | Pulse, Trajectory | open | – |
| R-15 | The landing page has no statement of what is free; a visitor meets the price cards before the rule | Landing | open | – |
| R-16 | Learning Loop explained nothing: no statement of what the page is for, jargon labels ("flywheel", "shrinkage", "prior lift"), and a Report button duplicated in two cards | Learning Loop | done | `UI-120` |
| R-17 | Learning Loop grids were inline four-column styles that squeezed on a phone; moved to `.lrn-grid` and `.lrn-funnel` with 1100 and 560 breakpoints | Learning Loop | done | `UI-120` |
| R-18 | Export and Delete sat stacked as two full-width buttons with one shared paragraph; they are now a two-column row with a line each, side by side at every width | Career Twin | done | `UI-121` |
| R-19 | Counts were printed raw in 16 places, so 1646 rendered without a thousands separator; every count now goes through `int()` | Whole app | done | `UI-121` |
| R-20 | Apple sign-in needed two attempts: the second callback found its state already consumed and answered "expired" to someone who had already authorised | Auth | done | `AUTH-25` |
| R-21 | A duplicate OAuth callback now redirects into the app when a session already exists instead of reporting a failure | Auth | done | `AUTH-25` |
| R-22 | Pro+ listed six "Compare …" bullets that repeated one idea; now two lines, the comparison and the negotiation brief | Plan | done | `UI-122` |
| R-23 | Card headings were sentence case in 13 places and title case in the rest; every `h2`/`h3` now uses title case, and the skill count goes through `int()` | Whole app | done | `COPY-40` |
| R-24 | Values were printed as stored: senior, any, no, high, emerging, copy, balanced. Every enumerated value now goes through `titleCase()` or a `Yes`/`No` pair, including the server-side trajectory drivers and confidence factors | Whole app | done | `COPY-41` || R-24 | Values were printed as stored: senior, any, no, high, emerging, copy, balanced. Every enumerated value now goes through `titleCase()` or a `Yes`/`No` pair, including the server-side trajectory drivers and confidence factors | Whole app | done | `COPY-41` |
| R-25 | Saved Searches asked for a name in a text box and showed filters as `horizon: balanced`; it now names itself from the filters, shows what it watches in words, and lists the matches it found with a score chip and a new count | Saved Searches | done | `UI-123` |
| R-26 | Career Copilot asked its five questions as oval pills of different widths, three rows deep, and its intro bubble spent 315px of a 852px screen before a single answer | Career Copilot | done | `UI-124` |

## How to use this

- Every new recommendation gets the next number at the moment it is raised, even if it is fixed in the same
  commit. The row is then marked `done` with the commit.
- At the end of the build we walk the table top to bottom and decide each `open` row: build, defer or reject.
- A `rejected` row keeps its number and gains one line saying why, so the same idea is not raised twice.
