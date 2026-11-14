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
| R-15 | The landing page has no statement of what is free; a visitor meets the price cards before the rule. A `.free-line` now sits above the cards: green rule, FREE kicker, one sentence naming the three free things and saying everything below is the ongoing system | Landing | done | `UI-135` |
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
| R-27 | Card headings were bold titles at 15px competing with the page title; they are now full-caps labels at 11.5px, weight 600, and the three finding sentences ("Closing PyTorch alone unblocks 12 of your 60…") are body weight instead of bold | Skill Gaps, Negotiation, Career Trajectory, every card | done | `UI-125` |
| R-28 | Skill Gaps repeated its own page title as a card heading, and printed "cumulative" under all four numbers | Skill Gaps | done | `UI-125` |
| R-29 | Counts were printed as stored: 2867, 871, 1940, 68. Twelve raw template values now go through `int()`, so every count carries a separator and a null prints an en dash | Market Pulse, Career Tracker, Partners, Saved Searches, Outbox | done | `8a3f7f4` |
| R-30 | Signal of the Day showed a violet box with a skill name, "Blocks 8 of your opportunities", then two label/value rows where one read "Add your pay to see it" as if it were a value. It is now a sentence saying what the blocker means, an explicit "See what closing it unblocks" link, and two labelled facts | Daily Brief | done | `8a3f7f4` |
| R-31 | Market Pulse "How to Read This" was one 60-word paragraph. It is now five labelled rows: Source, Not a survey, Currency, Small samples, The number in brackets | Market Pulse | done | `8a3f7f4` |
| R-32 | Status badges were weight 650 at 10.5px, as loud as a heading, and caps card headings sat at 11.5px, the same size as the body copy under them. Badges are now caps at weight 500 with 0.07em tracking, headings 12.5px, one step above body | Career Tracker, every card | done | `8a3f7f4` |
| R-33 | The phone bar's six boxes had uneven gaps (4, 0, 0, 4, 8) because three groups each carried their own margin, and the rail collapse handle hung 11px past the right edge. One six-column grid with `display:contents` on the groups gives 4px everywhere and equal widths; the handle is hidden on a phone | Every screen, phone | done | `8a3f7f4` |
| R-34 | Emphasis was one switch: everything that mattered was bold, and the caption under a hero number sat at 11px grey. One ladder now, declared in RULES 16: hero number, section title, caps card label, row label, caption, note. `.big-cap` lifts the caption to `--text-sm` weight 500 in `--ink2` | Every screen | done | `UI-133` |
| R-35 | A section title is where the next block starts, so it is the one element inside a result surface that carries colour: `h2.section` runs `--ink` into a 94% `--accent2` mix across its last third, clipped to the text | Every screen | done | `UI-133` |
| R-36 | The free plan card had lost its green and read as a disabled panel. It is green again on its own token: `--good` border at 42%, a 9% to 3% wash, the plan name and the price in the green mix, green list dots, and a green Current Plan button | Plan | done | `UI-133` |
| R-37 | Copilot's five question cards were fixed at 165px inside two hidden-scrollbar scrollers, so a 1440 screen showed three cards and 600px of dead space beside them, and the data panel stopped at 545px while the composer ran to 1126px. Desktop is now a real three-column grid of 268px cards and the panel is full width; the phone keeps its scrollers, because five cards cannot fit 393px | Copilot | done | `UI-133` |
| R-38 | On a phone the copilot composer floated mid-screen with 200px of dead space under it, because `.chat` was `min-height:60vh` with a `55vh` message cap. It is now `calc(100dvh - 196px)` with no cap, so the composer sits on the bottom bar | Copilot, phone | done | `UI-133` |
| R-39 | The Current Plan button stayed neutral grey because `.plan-grid-compact .price.is-current .btn[disabled]` outranked `.plan-cur`. It now carries the same green as the card: 13% `--good` fill, 82% green ink, 45% green border, scoped with `:not(.plan-cur)` on the generic disabled rule so the two never fight again | Plan | done | `UI-134` |
| R-40 | Every SEO surface was served the same `<title>`, the same description and the same empty body, so 205 sitemap URLs were 205 identical documents and Google indexed none. `seoFor()` now builds a title, description, `og:*`, a WebPage node and a `<noscript>` body per role, role x country, skill and country hub, from the same slugs the sitemap uses | Public SEO surfaces | done | `UI-136` |
| R-41 | `/de` answered 404 while the sitemap advertised `/salary/x/de`: a bare country code was never a route. A country hub is now a real page for every country in the corpus, answers 200 with its own head, and is listed in the sitemap (219 URLs) | Routing, sitemap | done | `UI-136` |
| R-42 | `serveStatic` described the file it read rather than the path asked for, so every `/salary/...` page carried `/index.html` as its canonical. It now takes the requested path separately | Public SEO surfaces | done | `UI-136` |
| R-43 | A label is caps and tracking, not weight: `.fk` drops 700 to 500. Caps already carry the label, and bold caps shout | Every facts row | done | `UI-136` |
| R-44 | A ghost button was an empty outline and a danger button a red outline. Both now carry a light tint at rest (8% accent, 9% bad) and deepen on hover, so a button reads as a button | Every screen | done | `UI-136` |

## How to use this

- Every new recommendation gets the next number at the moment it is raised, even if it is fixed in the same
  commit. The row is then marked `done` with the commit.
- At the end of the build we walk the table top to bottom and decide each `open` row: build, defer or reject.
- A `rejected` row keeps its number and gains one line saying why, so the same idea is not raised twice.
| R-45 | Saved Searches gave two unlabelled buttons and a floating sentence, so nobody could tell what either one did | Two labelled columns, each with a one-line note under its button: Watch This Search saves the filters as a standing search, Change the Filters opens The Radar with the same filters | Done `UI-138` |
| R-46 | A saved-search hit printed a title, a company and a country, and nothing about what the opportunity pays or what it is | Each row now carries pay (or "Pay not disclosed"), seniority and role family beside the company and market, so the row answers "what is it, what does it pay" without opening it | Done `UI-138` |
| R-47 | The saved-search card heading was 15px mixed case, the only card heading in the product that was not a caps label | `.sh-card h3` is now the caps label used everywhere else (12.5px, 600, 0.09em, `--ink2`); the search's own name keeps its case in the row above | Done `UI-138` |
| R-48 | Career Co-Pilot asked five questions as 165x76 boxes in two staggered scrollers, and answered into a plain column | Six one-line chips, avatar-led bubbles, a typing indicator, a growing composer with Enter and Shift+Enter, and a collapsible Career Context of six badges | Done `UI-137` |
| R-54 | The Co-Pilot offered six prompts for five intents, so a chip could ask a question the rules could not answer | Ten chips, each backed by its own grounded intent: fit, competitiveness, growth path, interview prep, negotiation, application pipeline. The fallback answer lists the same ten, so page and answer cannot disagree | Done `UI-140` |
| R-55 | A suggested question was a 999px capsule, which reads as a tag rather than a control | `border-radius: var(--radius-sm)`, so a chip is a small rounded rectangle with a capsule's padding | Done `UI-140` |
| R-56 | A high match score printed in deep blue (`#1d4ed8`), the colour of a link, not of a good result | `--score-good` now carries the same green as `--good` and `--score-hi`: `#0a6f45` on `#e9f7f0` in light (5.64:1), `#4fd6a0` on `#0e2119` in dark (9.17:1) | Done `UI-140` |
| R-57 | The growth-path answer printed `NaN` because it read a risk-adjusted figure off the path objects, where `simulate()` returns it as a separate list | The list is joined onto the paths by `path` before printing, and the sentence now says which number is the end salary and which is total earnings | Done `UI-140` |

