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
| R-10 | The Copilot answer bubble and the Negotiation scripts are the last long unbroken prose in the app; both could carry a label | Copilot, Negotiation | done | `d63ba5c` |
| R-11 | Skill Gaps partner cards still show a partner name as a bare chip button; they should carry the same disclosure line the detail panel does | Gaps | done | `UI-143` |
| R-12 | The Pro+ card lists six "Compare …" bullets that read as a feature dump; they describe one job and could be stated once | Plan | done | `UI-122` |
| R-13 | `docs/planning/AUDIT-2026-11-11.md` still lists the paywall essay as "unnecessary"; it is back by founder request and the audit should say so | Docs | done | `UI-143` |
| R-14 | Market Pulse and Career Trajectory carry the same paragraph-before-table shape and have not had the facts pass | Pulse, Trajectory | done | `bd135a0` |
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
| R-49 | A saved search printed no rule, so the user could not tell what it was watching | `filterChips()` plus `FILTER_KEY` name every filter as a labelled pill above the hits | Done `UI-139` |
| R-50 | A saved search could not be renamed, and its filters could not be changed without deleting it | Pencil rename and **Edit Filters** through `PATCH /api/saved-searches/:id` | Done `UI-139` |
| R-51 | A hit list had no way to clear itself, so the same rows returned every day | **Mark as Seen** records every current hit; per-hit save and dismiss via `dismissed_opps` and `POST /api/dismiss` | Done `UI-139` |
| R-52 | The alert rhythm was a display setting that did not persist | `saved_searches.alert` column, written by the same PATCH | Done `UI-139` |
| R-53 | Pay was converted to EUR and prefixed with `~`, so a posting's own number was hidden | Pay prints in the posting's currency and says so | Done `UI-139` |
| R-54 | The Co-Pilot offered six prompts for five intents, so a chip could ask a question the rules could not answer | Ten chips, each backed by its own grounded intent: fit, competitiveness, growth path, interview prep, negotiation, application pipeline. The fallback answer lists the same ten, so page and answer cannot disagree | Done `UI-140` |
| R-55 | A suggested question was a 999px capsule, which reads as a tag rather than a control | `border-radius: var(--radius-sm)`, so a chip is a small rounded rectangle with a capsule's padding | Done `UI-140` |
| R-56 | A high match score printed in deep blue (`#1d4ed8`), the colour of a link, not of a good result | `--score-good` now carries the same green as `--good` and `--score-hi`: `#0a6f45` on `#e9f7f0` in light (5.64:1), `#4fd6a0` on `#0e2119` in dark (9.17:1) | Done `UI-140` |
| R-57 | The growth-path answer printed `NaN` because it read a risk-adjusted figure off the path objects, where `simulate()` returns it as a separate list | The list is joined onto the paths by `path` before printing, and the sentence now says which number is the end salary and which is total earnings | Done `UI-140` |
| R-58 | Ten chips wrapped into a ragged pile with no alignment, so the set read as clutter | A 5 x 2 grid of equal cells at 1440, three columns under 1100, two under 560; every cell the same height, text left-aligned | Done `UI-141` |
| R-59 | Cards, tiles, chips and inputs were a flat panel with a grey hairline, which read as plain | Two tokens carry it: `--wash` (7% accent over the panel in dark, 4% in light) and `--line-tint` (26% / 22% accent over the line). Cards, plain cards, bot bubbles, chips, inputs and selects all use them | Done `UI-141` |
| R-60 | A primary button read as deep blue because `--accent2` was `#7C3AED` | `#8C52EF`, measured 4.6:1 against white, so the label still clears AA while the button reads violet | Done `UI-141` |
| R-61 | Answers printed literal `**` and flattened a numbered list into one paragraph, because every line had to be a list item before a list was drawn | The list run is taken from the top of the block and the remainder becomes a paragraph, so a list followed by a closing sentence renders as both; `**bold**` becomes `<b>` | Done `UI-141` |
| R-62 | `/uk` answered 404 while `/gb` answered 200, and the country list was typed by hand in two places | One registry (`app/markets.cjs`) holds every market with its currency, language and region; `/uk` is a permanent redirect to `/gb`, so there is one address per market; the sitemap lists only markets the registry knows | Done `UI-142` |
| R-63 | A market route could not preselect its own market, and language was implied by the market | Market, language and currency are three separate settings: `GET /api/markets/config` returns all three, the route suggests a market, `Accept-Language` suggests a language, and a query parameter overrides either | Done `UI-142` |
| R-64 | Country pages carried no `hreflang`, so a crawler saw fifteen unrelated pages | `withSeo()` emits an alternate for every market the corpus can defend plus `x-default`, built from the same registry the sitemap uses | Done `UI-142` |
| R-65 | The landing page could not scroll on a desktop: the app shell's viewport lock applied to the document | `html:not(.is-landing)` scopes the lock to the shell; the landing page is a document again and scrolls | Done `UI-142` |
| R-66 | Nav links were four words floating in the header | Each is a capsule on its own tint with a visible border, so the set reads as a control strip | Done `UI-142` |
| R-67 | Nine capabilities sat in one flat grid with no grouping | Three pillars - Know Your Worth, Find Hidden Roles, Plan Your Move - each a labelled column holding three instruments | Done `UI-142` |
| R-68 | A two-column fact grid could not hold a long label in a narrow card, so the value was pushed outside the card | `.facts.stack` puts the label above its value for narrow containers | Done `UI-142` |
| R-69 | The Signal of the Day sentence was ungrammatical and the count read backwards | "Missing from 6 of your 400 scored opportunities. No other skill blocks more of your set." | Done `UI-142` |
| R-70 | Market Snapshot sat on "Loading…" and Run Ingest was offered to every signed-in account | The panel starts as "Reading the live corpus…" and Ingest moved behind the founder flag | Done `UI-142` |

| R-71 | The hero proved nothing: three hardcoded numbers (`1 in 3`, `EUR13,500`, `72%`) with no source behind them | `GET /api/public/proof` computes all three from the corpus and `loadProof()` writes them, with the sample size and a methodology link under the bar | Done `UI-144` |
| R-72 | The landing page had no product on it, so a visitor had to sign in to see what ThinkZet does | "Live Career Twin Preview" card backed by `GET /api/public/preview`: real percentiles, real postings, real match scores, and a `Sample preview` badge that becomes `Live preview` once the calculator drives it | Done `UI-144` |
| R-73 | A salary benchmark was only ever printed in EUR, whatever market the visitor was in | `fx.cjs` converts display-only and every converted figure carries the rate date and a "Converted from EUR at the YYYY-MM-DD rate" chip; with no rate the EUR figure is labelled EUR rather than guessed | Done `UI-144` |
| R-74 | The hero was a single centred column, so the claim and the evidence never sat together | Two-column `hero-grid` at 1024 and above, one column below, proof bar as three micro-cards that stay three across a phone down to 360px | Done `UI-144` |
| R-75 | The page carried two of everything: two heroes, two calculators, two capability grids, two datalists | One `hero-sec`, one `#check`, one `#capabilities`, one `dl-roles`/`dl-skills`; duplicate ids asserted at zero in the browser | Done `UI-144` |
| R-76 | Nine capabilities sat in a flat grid under a heading that repeated the section above it | Three pillars of three, each with a number, a question and a one-line answer; heading is now "Three Questions, Nine Instruments" | Done `UI-144` |
| R-77 | `.proof` was defined twice and the later rule won on order, so the bar rendered as three stacked lines | One definition, in one place, with the phone rules in the media query that owns them | Done `UI-144` |
| R-78 | The document title still said "AI Intelligence Platform" and the description did not mention salary | "ThinkZet - Career & Salary Intelligence" plus a description naming market rate, fit and earning potential | Done `UI-144` |
