# ThinkZet – Task Register

Single source of truth for all work. Rules: `docs/ENGINEERING.md` section 1.
Summary board: `docs/planning/PROGRESS.md`.
Last updated: 9 November 2026.

**Owner:** `Us` = engineering, `You` = needs the founder.
**Categories:** `DEP` deployment · `SEC` security · `AUTH` sign-in · `PAY` payments · `EML` email · `UI` interface · `NAV` navigation · `COPY` wording · `DATA` data and engine · `GRO` growth · `REPO` repository and docs.
**Status:** `OPEN` · `IN PROGRESS` · `BLOCKED` (names what unblocks it) · `DONE` (verified, pushed).

---

## A. Us – in progress, in this order

| # | ID | Cat | Task (what the founder asked) | Status |
|---|---|---|---|---|
| 1 | NAV-01 | NAV | Scrolling to the end of a screen moves to the next one in the left menu; scrolling up at the top moves to the previous one. The left tab follows | IN PROGRESS |
| 2 | AUTH-06 | AUTH | Display name: provider default, user override, used everywhere | DONE |
| 3 | AUTH-07 | AUTH | Signed-in users never see demo mode. Menu item removed for them; server refuses `/api/demo` | IN PROGRESS (code written, to verify) |
| 4 | COPY-14 | COPY | "Explore the demo profile first" becomes "Demo mode" | OPEN |
| 5 | COPY-15 | COPY | "Morning brief" is time-driven; name it "Daily brief" and make the greeting follow the send hour | IN PROGRESS (mailer done, UI labels to do) |
| 6 | COPY-16 | COPY | "closes in 1 days" reads "closes tomorrow" or "closes today" | IN PROGRESS (code written, to verify) |
| 7 | AUTH-08 | AUTH | Sign-in rate limit split: 5 codes per address and 40 per network in 15 minutes, so a shared IP no longer locks out new sign-ups | Us | DONE | tested: 5 x 200 then 429 for one address; 8 different addresses from one IP all 200 |
| NAV-04 | NAV | One gesture at the edge changes screen immediately: no threshold, no progress hint, 420ms settle | Us | DONE | measured: flip on the first wheel event, momentum does not fire, back at the top works |
| NAV-06 | NAV | Scroll flip keeps the measured rule (a gesture that begins at the edge) with a shorter gap and settle; the push-at-edge variant was tried and reverted because it fired during a normal scroll to the bottom | Us | DONE | momentum does not flip, first deliberate gesture does, back at top works |
| COPY-26 | COPY | Hero pill reads "Free Intelligent Career Value Check" | Us | DONE | rendered HTML |
| UI-19 | UI | Onboarding step indicator centred with its heading | Us | DONE | markup |
| COPY-25 | COPY | Payoff card no longer claims live postings while labelled sample data | Us | DONE | rendered copy |
| SEO-04 | SEO | Homepage indexed: Search Console reports "URL is on Google", page indexing indexed, HTTPS valid. Canonical present on the homepage and on the salary and skill long-tail pages | You, then Us | DONE | Search Console screenshot 10 Nov 2026, canonical verified on three long-tail pages |
| SEO-03 | SEO | Canonical link, og:url and Organization JSON-LD injected into the served HTML for every page, including the salary and skill pages, so crawlers see one address per page without running the client bundle | Us | DONE | canonical and ld+json present on /, /salary/software-engineer and /skills/llmops |
| SEO-02 | SEO | robots.txt added: allows the site, keeps `/?app=1` and `/api/` out of the index, and advertises the sitemap at the public origin | Us | DONE | served as text/plain with the Sitemap line |
| UI-26 | UI | The salutation mark uses a three-stop gradient (violet, rose, blue) in both themes instead of a two-stop ramp | Us | DONE | computed background-image in light and dark |
| COPY-27 | COPY | Title case for every h3 heading across the app: 58 headings including Skill Gap Detection, How to Close Them and the table headers | Us | DONE | rendered Skill Gaps screen, 59/59 API, 10/10 browser |
| UI-25i | UI | A running demo labels the account state "Demo Mode" instead of "Signed Out" | Us | DONE | measured: state Demo Mode, signin flex, demo none |
| UI-54 | UI | Plan subtitles moved below the price as the list heading, italic | Us | DONE | computed font-style italic |
| UI-56 | UI | Status badges removed from plan cards; the disabled action marks the active plan | Us | DONE | no plan-state in markup |
| UI-58 | UI | Pro+ carries a gold surround and gold action, completing green, violet, gold | Us | DONE | both themes rendered |
| UI-59 | UI | Continue Free keeps its green treatment when it is the current plan | Us | DONE | computed colours green in both themes |
| UI-53 | UI | Status and action separated (badge above a disabled Continue Free or Unlock Pro), one subtitle per card, cards 10% shorter, stronger subtitles, page titled Choose Your Plan | Us | DONE | heights 411 each, one baseline, ctaWidths 285 at 1440 light |
| UI-52 | UI | Plan copy set to the approved wording, cards lighter: 20px padding, 7px action padding, no list floor; subtitle italic under the title, then price, then bullets | Us | DONE | heights 425 each, one baseline, ctaWidths 281, ctaHeights 33 to 35 at 1440 light |
| UI-51 | UI | Plan cards restored to the reference proportions: 1000px grid, 24px padding, text-3xl prices, 14px bullets, 212px list floor, slimmer actions; subtitles italic directly under the plan name | Us | DONE | heights 449 each, one baseline, ctaWidths 273 each at 1440 light |
| UI-50 | UI | Bullets trimmed so every card wraps identically: 6 points, line counts 2/2/2/2/2/1 on all three, equal 341px heights, one CTA baseline | Us | DONE | measured line counts at 1440; 59/59 API, 10/10 browser |
| UI-49 | UI | Bullets rewritten as one family: noun-led capabilities of similar length on all three cards, no explanations, no "no card required"; Pro+ reads Relocation and offer decisions | Us | DONE | points 6/6/6, heights 375 each, one CTA baseline at 1440 |
| UI-48 | UI | Pro trimmed to six points and every plan action is the same full-width button: 183px wide and 41 to 43px tall, one baseline | Us | DONE | measured at 1440 light: points 6/6/6, heights 426 each, ctaWidths 183/183/183 |
| UI-47 | UI | Free plan carries six real points so the three cards share one density: 6, 7 and 6 points, equal heights, one CTA baseline | Us | DONE | measured at 1440 light: heights 416 each, sameBaseline true; 59/59 API, 10/10 browser, 9/9 billing |
| UI-46 | UI | Plan cards share one skeleton: flex column, list grows, action pinned to the foot, so CTAs align on one baseline on desktop; the current plan keeps its green surround on card and chip | Us | DONE | measured: equal 416px heights and one CTA baseline at 1440; stacked cards at 393 |
| UI-45 | UI | Plan copy rewritten around decisions: taglines Know your value, Make better moves, For bigger decisions; Pro+ leads with relocation and offer comparison; CTAs Continue Free, Unlock Pro, Unlock Pro+ | Us | DONE | 1440px dark render, 59/59 API, 10/10 browser |
| UI-44 | UI | Footer restructured: brand and one-line positioning on row one, three equal cards (Product, Company, Contact) on row two, and a thin Market Snapshot strip instead of a fourth card | Us | DONE | measured 1+3 at 1440, 1+2+1 at 393; 59/59 API, 10/10 browser |
| UI-43 | UI | Pro+ CTA is a solid gradient "Go Pro+" instead of a ghost button that read as disabled; features rewritten as benefits with no filler, and the sub-line explains why the tier exists | Us | DONE | 393px dark render, 59/59 API, 10/10 browser |
| UI-42 | UI | Footer: brand on its own row, then four equal cells on one line on desktop and two by two below 900px; Data Sources folded into the Data cell as a compact metric list instead of a wide band below the grid | Us | DONE | measured per row 1+4 at 1440 and 1024, 1+2+2 at 900 and 393 |
| UI-41 | UI | Pro+ repositioned as an automated tier: priority alerts on 90+ matches, automated negotiation briefs, advanced trajectory modelling, multi-profile twins, premium copilot. No coaching, no relocation pack, no human quarterly review | Us | DONE | landing and plan renders, 59/59 API, 10/10 browser |
| UI-40 | UI | Price unit separated from the amount by a space on every card, and the plan cards are full width and stacked on phones while staying dense at 900px and above | Us | DONE | 393px and 1440px renders, 59/59 API, 10/10 browser |
| UI-39 | UI | Plan cards denser at 660px with 14px padding, price format switched to €19.99/month, €49/month and €149.99/year, CTAs Continue Free, Unlock Pro and Talk to Us | Us | DONE | 1440px dark render, 59/59 API, 10/10 browser |
| UI-38 | UI | Plan cards tightened to 720px with 16px padding, smaller price, bullets and actions; Pro+ shows €49 a month and its four real features, no placeholder | Us | DONE | 1440px dark render, 59/59 API, 10/10 browser |
| UI-37 | UI | Footer measured at five widths: four cells on one row at 1024 and above, two by two below 900 | Us | DONE | per row 4, 4, 1+2+2, 1+2+2, 1+2+2 |
| UI-36 | UI | Plan page keeps the compact card component with the real plan data: 840px centred grid, 20px padding, smaller prices, bullets and actions; Pro+ shows €49 and Talk to us, no Coming soon | Us | DONE | 1440px dark render, 59/59 API, 10/10 browser |
| UI-35 | UI | Plan page reuses the landing pricing component: same cards, spacing, hierarchy and CTA wording, centred, equal height, actions at the foot. The dashboard-tile variant is gone | Us | DONE | 1440px light render of Plan, 59/59 API, 10/10 browser |
| UI-34 | UI | Landing pricing is a near-pixel recreation of the reference: three cells, Free, Pro and Pro+, Most Chosen pill, Start free, Unlock Pro, and a third action, actions at the foot of each cell. Pro+ is display only with no price claim | Us | DONE | measured: 3 cells, 892px grid, centred with 274px either side, heights 422 each |
| UI-33 | UI | Landing pricing restored to the exact 487efe6 design: three equal cells, pill tag on Pro, Start free and Choose yearly as ghost actions, Unlock Pro solid | Us | DONE | 1440px light render, 59/59 API, 10/10 browser |
| UI-32 | UI | Landing pricing matches the reference: grid centred at 1000px, equal-height cells, actions pinned to the bottom with a 10px radius | Us | DONE | 1440px light render, 59/59 API, 10/10 browser |
| UI-31 | UI | Section headings title-cased, and the system-health group carries a small tinted icon before the title: pulse for Live Ingestion, a health ring for Listing Health, a stack for Corpus | Us | DONE | 393px render of Engine, 59/59 API, 10/10 browser |
| UI-30 | UI | Plan cells carry coloured surrounds: green for the current plan, violet for Pro, blue for the yearly cell, in both themes | Us | DONE | dark and light renders, 59/59 API, 10/10 browser |
| UI-29 | UI | Light theme: tone-violet cards and the rate-gap card carry a visible lilac surround and a 1px tinted ring; tone-blue cards carry a pale blue surround | Us | DONE | light-theme render of Plan, 59/59 API, 10/10 browser |
| UI-27b | UI | Plan screen reverted to the exact pre-UI-27 design: three cards, small pill actions, no Most Chosen tag, no full-width buttons | Us | DONE | renderPlan restored from 9396776; 1440px render, 59/59 API, 10/10 browser |
| UI-28 | UI | Footer grid: four columns above 900px, two by two below it, measured at 1440, 1280, 1024, 900, 760 and 393 | Us | DONE | cells per row 4 then 2 by 2; 59/59 API, 10/10 browser |
| UI-27 | UI | Plan screen aligned to the approved landing pricing: Most Chosen tag on Pro, full-width primary action on Pro, yearly action on its own card, equal-height cards | Us | DONE | 1440px render, 59/59 API, 10/10 browser |
| UI-21 | UI | Plan screen restored to the pre-UI-21 three-cell design at the founder's request; the guarded checkout handlers are kept | Us | DONE | renderPlan replaced, plan-grid CSS removed |
| UI-25h | UI | Signed out with a demo running: Demo Mode is replaced by Sign In in the right-hand slot, so the menu offers the next useful action instead of repeating what is already loaded | Us | DONE | measured: demo none, signin flex, demoRunning true |
| UI-25g | UI | Once a demo persona is running, Demo Mode disappears from the menu; Run Ingest keeps the row and Sign Out takes the right slot for a real session | Us | DONE | measured: after loading, demo none and demoRunning true |
| UI-25f | UI | Demo Mode sits to the right of Run Ingest on one row when signed out, the same slot Sign Out uses for a session | Us | DONE | measured at 1440px: both at 107px, Demo Mode right edge 1362px against a 1370px menu edge |
| UI-25e | UI | Demo Mode hidden on onboarding for a signed-in person, and loadDemo no longer claims success when the server refuses it | Us | DONE | signed-in demo 403 is now surfaced; button absent when authed |
| UI-25d | UI | Sign Out is hidden while signed out (demo mode): the menu shows Demo Mode alone, and Sign Out appears only for a real session | Us | DONE | measured: signed out reports demo flex, signout none |
| UI-25c | UI | `[hidden]` now beats `display:flex`, so Demo Mode is really gone for a signed-in person; the Run Ingest and Sign Out pair cannot wrap and stays flush right | Us | DONE | measured: same row at 93px, Sign Out right edge 371px against a 379px menu edge; hidden button reports display none |
| UI-25b | UI | Sign Out moved to the right of Run Ingest on one row; the menu is now three rows instead of four | Us | DONE | measured: same row (top 93px both), Sign Out right edge 374px against a 379px menu edge |
| UI-24 | UI | Onboarding actions centred as a group (centre 197px on a 393px screen), equal 132px cells, Edit Details on the left and Open My Radar on the right | Us | DONE | measured: group centre equals viewport centre |
| UI-23 | UI | Account menu: the state is a label on the right of an "Account" heading instead of a row that repeated "Signed Out"; onboarding Continue and Demo Mode are equal cells side by side | Us | DONE | 393px screenshot, 59/59 API, 10/10 browser |
| UI-21 | UI | Plan screen uses the landing layout: two wide cards, features as a proper list with a bullet, yearly as a line inside Pro, badge inside the card, actions stacked | Us | DONE | 1440px screenshot, 59/59 API, 10/10 browser |
| UI-22 | UI | Outcome Log as a structured table: type, opportunity and company, salary delta in colour, date; heading row with a count chip | Us | DONE | rendered markup |
| AUTH-11 | AUTH | Apple private key normalised: literal `\n`, real newlines, surrounding quotes and a bare base64 body all produce a valid PEM, so a dashboard paste cannot surface as `DECODER routines::unsupported`. Configuration errors now read as our fault, not the user's | Us | DONE | 4 paste shapes verified; callback reaches Apple and answers "code expired" |
| UI-20 | UI | One bottom offset on phones: the view padding and the main padding no longer stack into a dead band under the last card | Us | DONE | measured at 393px: last card bottom 774px against an 852px viewport, a 78px gap to the edge |
| AUTH-10 | AUTH | OAuth state stored in SQLite instead of memory, so Apple's cross-site POST survives a redeploy or another instance | Us | DONE | state issued, server restarted, callback now reaches the token exchange |
| UI-18 | UI | Salutation exclamation uses the same violet-to-pink gradient as the landing headline | Us | DONE | computed style |
| UI-17 | UI | Sign-in opens at the top of the screen from the landing button, the card is centred in the visible area on phones, the SOON tag no longer overlaps the provider label, the pricing badge stays inside its card, and the footer legal clears the bottom nav | Us | DONE | measured: card centre 433px against a 426px viewport centre at 393px; 59/59 API, 10/10 browser |
| COPY-24 | COPY | Footer is a true 2 x 2 grid on phones (Product, Company, Contact, Data), each column its own cell; form labels title-cased on the landing check and onboarding | Us | DONE | measured at 393px: four cells in two rows, no overlap |
| COPY-23 | COPY | "Live pay data, matched to you" title-cased; footer contact addresses wrap instead of overlapping on a phone, and the footer falls to two columns under 760px | Us | DONE | no element wider than 393px; 59/59 API, 10/10 browser |
| COPY-22 | COPY | privacy@thinkzet.com added to the footer, the privacy page and the terms page, alongside support@, hello@ and billing@ | Us | DONE | four mailto links in the footer |
| DATA-07 | DATA | `/api/data-sources`: opportunities, distinct salary values, live share, countries, last ingest, confidence, measured not asserted. Shown as a Data Sources block on the landing page | Us | DONE | live share 22% counted per distinct value, confidence "sample" |
| GRO-03 | GRO | Funnel events: landing.view, signup.started, signup.completed, radar.opened, upgrade.clicked, payment.completed, cancel.started. Server-side for money, client-side for the rest, allow-list only | Us | DONE | known event 200, unknown 400; 59/59 API |
| COPY-21 | COPY | Title case for section and menu labels: Signed Out, No Profile, Setting Up, Run Ingest, Demo Mode, Sign Out, Engine Online, How It Works, Free Career Value Check | Us | DONE | labels verified in rendered HTML |
| COPY-20 | COPY | Title case for labels built from identifiers: "data science" becomes "Data Science", "ai_engineering" becomes "AI Engineering"; small words stay lower case unless they lead | Us | DONE | 10 sample strings verified, family filters and pulse labels use it |
| UI-14 | UI | The live pill sits inside the title block, directly after the page name | Us | DONE | markup: pill inside .tb-line |
| UI-13 | UI | Pricing back to three cells on the landing page and the plan screen: Free, Pro monthly, Pro yearly. Yearly is a billing choice, not a fourth tier, and both buttons use the guarded checkout | Us | DONE | 3 cells rendered; annual checkout refuses without a session |
| NAV-03 | NAV | One firm notch (110px) is now enough to move to the next screen; plural fixed in the gaps table; the live pill is hidden on Sign in and onboarding | Us | DONE | measured: flip fires on the first gesture |
| NAV-02 | NAV | Scroll-to-next-screen made easier: 150px instead of 320px, shorter settle, screens with no scroll room move on any gesture | Us | DONE | measured: flip fires on the first deliberate gesture |
| UI-01 | UI | Radar list in columns: 1 on phones, 2 on tablets, 3 on wide screens, softly tinted, blended faded colours | OPEN |
| 8 | UI-02 | UI | Structure audit of the remaining screens at phone and desktop widths | DONE |
| 9 | UI-07 | UI | Mercor-style structure for app screens (underline tabs, left sub-nav plus form column) | OPEN |
| 10 | UI-03 | UI | Replace the remaining hardcoded colours with tokens | OPEN |
| 11 | UI-12 | UI | Landing page always checked in both PC mode and mobile mode before it is called done | RULE (in `ENGINEERING.md`) |
| 12 | COPY-17 | COPY | Mercor sign-in order option: email first, Google below. Only if the founder asks | OPEN (decision) |

## B. You – needs the founder

| ID | Cat | Task | Next action |
|---|---|---|---|


| DATA-06 | DATA | **The 176% rate gap is an artefact of the synthetic corpus.** Backend/senior comparables are 1,461 records, of which 1,311 are USD/year at an average of 174,705 and 109 are CAD at 229,000; only 4 are EUR. The benchmark is a US-market number applied to a EUR salary, and the headline multiplies it. Country filter does not change it (Any, DE and US all return 138,000). Fixing this is DATA-03 | You decide A or B, then Us | OPEN |

| AUTH-01 | AUTH | Google credentials set in Railway and live on production; the client JSON confirms redirect `https://thinkzet.com/api/auth/google/callback` | none |

| PAY-01b | PAY | Stripe product renamed from MirrorSpread Pro to ThinkZet Pro; checkout now requests 3DS automatically; payment suite updated because Pro+ is displayed again, so it asserts the waitlist path and that a plus checkout cannot be bought | Us | DONE | product read back, payment-check 20/20 |
| PAY-08 | PAY | Subscription visibility: `/api/plan` returns plan, status, cycle, since, periodEnd, cancelsAtPeriodEnd and the Stripe subscription id; the plan screen shows a Plan / Status / Renews panel and states the active plan on its card | Us | DONE | three states proven on an isolated server: free none, pro active, pro cancels_at_period_end |
| PAY-07 | PAY | Currency decision: keep EUR as the settlement and price currency (Stripe account is DE, EUR, no FX on the successful charge), and keep Adaptive Pricing on so a non-EUR card sees its own currency at checkout. Rates stay EUR; a USD view is a display option, not a currency change | Us | DONE | successful charge 200 eur with no conversion, card country KE |
| PAY-06 | PAY | Renewal attribution: `invoice.paid` now resolves the user from the subscription id, the subscription inside the invoice lines, or the stored customer id, in that order, and refuses to guess when none match | Us | DONE | four cases proven: subscription id, subscription in lines, customer id, unattributable stays free |
| PAY-01a | PAY | Diagnosed: Stripe answers `payment_intent_authentication_failure` on a card intent, no charge created. The session is 200 **eur** but Stripe presents **30,313 KES** because Adaptive Pricing converted for a Kenyan device, and the page then says "charge you in KES". Account is DE with EUR settlement, so a KES presentment is what the issuer refuses. Also found: the checkout statement descriptor is `FLOW AI`, not ThinkZet | Us | DONE | session `cs_live_b1tTuVsfb1zlF2sAMbx4y0bAXIESTRz9lYT5rw8Bqa8OmrSoAaQq8fBOod` |
| PAY-01 | PAY | Real €19.99 payment, confirm Pro unlocks, refund yourself | thinkzet.com → Upgrade |
| PAY-05 | PAY | Cancellation proven: the subscription is canceled at Stripe and `customer.subscription.deleted` downgraded the account to free | Us | DONE | subscription status canceled, webhook downgraded to free |
| MON-01 | MON | AdSense publisher id `pub-8707491489514576` supplied and wired: `/api/ads` returns enabled only for a free plan with a client id set, and the loader injects AdSense only after consent. AdMob app and banner ids stay on file for a future native app | Us | DONE | enabled true with a client id, false without; paid plans excluded |
| MON-05 | MON | Consent banner never appears on the sign-in screen: the ad mount returns early when the view is auth, so no consent is requested where no ad exists | Us | DONE | measured on the auth screen: banner false, script false, consent null |
| MON-04 | MON | Ads are off for Pro and Pro+: `/api/ads` returns enabled false with reason "paid plan, ads never shown", so the consent banner never appears and the AdSense script is never injected | Us | DONE | four cases on an isolated server: signed out and free enabled, pro and pro+ disabled |
| MON-03 | MON | Consent banner for ads: shown only when `/api/ads` reports enabled and no choice is stored, Allow injects the AdSense script and one labelled unit below the radar list, No thanks stores a refusal and loads nothing | Us | DONE | measured: before banner true, slot false, script false; after Allow banner false, slot true, script true, consent yes |
| MON-02 | MON | Ad placement rules, agreed before any code: never on Pro or Pro+, never inside the rate result, the copilot or the brief, never above the first insight, one unit below the radar list and one on the market pages, labelled, EEA consent first | Us | OPEN | needs MON-01 decision |
| PAY-05 | PAY | Live proof of cancellation against a real Stripe subscription (steps in `docs/planning/PAYMENTS.md`) | After PAY-01: subscribe, cancel in the app, confirm Stripe shows "cancels at period end" |
| SEC-01 | SEC | Roll the Stripe live key, webhook secret and Resend key (all pasted in chat) | Roll in each dashboard, update Railway |
| DEP-01 | DEP | Confirm the volume keeps data across a redeploy | Sign up, redeploy, reload |


| REPO-01 | REPO | Rename GitHub repo `MirrorSpread` to `ThinkZet` | GitHub → Settings; then Us updates `deploy/*` |
| DATA-01 | DATA | Make the copilot and cover letters generative | Supply `LLM_ENDPOINT`, `LLM_API_KEY`, `LLM_MODEL` |

## C. Blocked

| ID | Cat | Task | Needs |
|---|---|---|---|
| COPY-13 | COPY | Hero statistics (1 in 3, €13,500, 72%) have no source in the repo. Replace with computed numbers, or remove | DATA-03 |
| EML-02 | EML | Sender `ThinkZet <brief@thinkzet.com>` | EML-01 (cleared) |
| AUTH-06 | AUTH | Display name: provider name on first sign-in, user override in `users.display_name`, the override wins in every API response and the UI, and a later provider name never overwrites it | Us | DONE | 6 checks on an isolated server |
| AUTH-03 | AUTH | Both providers live on production: providers reports google and apple true, both start routes return the provider with the thinkzet.com redirect, a forged state is refused and recorded in /api/auth/diagnostic. The consent step itself needs a human browser | You: click Continue with Google and Continue with Apple once | OPEN |
| DATA-02 | DATA | Offsite backup of the SQLite volume | DEP-01 |
| FB-01 | FB | In-app feedback: a short rating (1 to 5) plus an optional comment, stored against the account or the lead, surfaced on a Leads screen with an average and a distribution | Us | OPEN | founder request 10 Nov 2026 |
| FB-02 | FB | Ask for a rating at the right moment only: after the first rate check result, after a recorded outcome, and once at day 7. Never on the paywall, never twice | Us | OPEN | needs FB-01 |
| FB-03 | FB | Public proof: a review request by email to paying customers after 14 days, and a testimonials block on the landing page that shows only real, attributed quotes | Us | OPEN | needs FB-01 and a first paying cohort |
| GRO-01 | GRO | Send the link to the first 20 people | PAY-01 |
| GRO-02 | GRO | Weekly Funnel and Leads report | GRO-01 |

## D. Done (verified and pushed)

| ID | Cat | Task | Evidence |
|---|---|---|---|
| DEP-10 | DEP | Production live on Railway at thinkzet.com | health 200, launch ready |
| DEP-11 | DEP | Root `railway.json` with Dockerfile builder | `4f5f365` |
| DEP-12 | DEP | Entrypoint fixes volume ownership, drops to `node` | `381a3b0`, `1b96d63` |
| DEP-13 | DEP | `www.thinkzet.com` redirects to the apex (301) | measured |
| EML-01 | EML | Resend domain verified (SPF and DKIM), sender `ThinkZet <support@thinkzet.com>` delivering to any address | production send 200, `delivered: true` |
| EML-04 | EML | Railway holds a working Resend key; production queue shows `login_code | sent` | verified 9 Nov 2026 |
| DATA-03 | DATA | Option B chosen: label salary intelligence as sample data until the rebuild. Chip on every salary figure, plain line on the screens that lead with a number, KPI relabelled "vs sample median" | Us | DONE | rendered HTML carries the label; 57/57 API, 10/10 browser |
| COPY-19 | COPY | Contact addresses: support@, hello@ and billing@thinkzet.com in the footer; legal pages use support@ and hello@; mailer default sender is support@ | Us | DONE | three mailto links in the footer, one in each legal page |
| AUTH-02 | AUTH | Apple variables set in Railway and live on production: `apple: true`, start returns appleid.apple.com with the thinkzet.com redirect | production providers |
| DEP-03 | DEP | Railway service renamed to ThinkZet | founder confirmed 10 Nov 2026 |
| DEP-02 | DEP | Railway Agent destroyed, no active agents, spare project `earnest-forgiveness` deleted | founder confirmed 10 Nov 2026 |
| AUTH-13 | AUTH | Signed-in visitor is never shown a Demo Mode button: the sign-in screen offers "Back to the app" instead, and the account menu hides Sign In whenever a session exists | Us | DONE | signed-out shows demo, signed-in shows back; session proven on a fresh database |
| DATA-09 | DATA | A fresh database crashed on boot because SQLite cannot use a partial index as an ON CONFLICT target. The dedupe index is now a plain unique index and the migration drops the old one first | Us | DONE | fresh db boots 200, no conflict error |
| AUTH-12 | AUTH | Apple key parses on production: providers reports apple true and the callback reaches Apple's token endpoint, which answers "code expired" for a fake code | production diagnostic |

| PAY-12 | PAY | Production switched back to €19.99 and both test prices archived | Us | DONE | billing/verify reads 19.99 EUR/month; both test prices active false |
| PAY-11 | PAY | Temporary test prices created on the live product: `price_1Ua1Np41m9e00I4Dx6Lhej6T` at €2.00/month and `price_1Ua1Np41m9e00I4D8wA8DvYF` at €14.99/year, both active and never wired into the app. The real prices stay in Railway | Us | DONE | both read back from Stripe; a €2 checkout session opens with amount 200 eur |
| PAY-10 | PAY | Stripe live product, prices, six-event webhook on thinkzet.com | signed event 200, forged 400 |
| PAY-02 | PAY | Checkout requires a signed-in session; the demo account can never be charged; a missing Stripe key refuses checkout in production instead of granting Pro | `3731853`; payment-check 19/19 |
| PAY-03 | PAY | Pro+ hidden from the landing page, the plan screen and the catalogue; interest recorded without selling | `3731853`; payment-check 19/19 |
| PAY-04 | PAY | Cancellation calls Stripe (`cancel_at_period_end`), access runs to the period end, a refusal changes nothing | `3731853`; billing-unit 9/9 |
| SEC-10 | SEC | Sign-in code never returned when mail is live | `47454dc` |
| AUTH-04 | AUTH | Google and Apple buttons always visible, Soon tag until configured | `7ccaaa9` |
| AUTH-05 | AUTH | Names never derived from the email; asked at onboarding; old derived names cleared | tested 400/200/401 |
| AUTH-10 | AUTH | Google and Apple sign-in built (state, nonce, verified email) | `89318d3` |
| UI-04 | UI | Desktop layout: shared container, one-line footer legal | measured |
| UI-05 | UI | Brand: translucent gradient mark, two-tone wordmark, single shared symbol, favicon | computed styles |
| UI-06 | UI | Logo simplified (no sheen, echo, halo); content width capped | measured 1280, 1440, 1920 |
| UI-08 | UI | Sign-in card centred; sidebar and top bar stay | measured at 1440, 1920, 393 |
| UI-09 | UI | Landing sections snap on desktop, off on phones and reduced motion | measured |
| UI-10 | UI | Top bar: title, live pill, icons pinned right, no sideways scroll | measured 360 and 393 |
| UI-64 | UI | The nav never scrolls: overflow visible, flex 0 0 auto, indicator and keep-in-view helper removed, so logo, all four groups and the footer hold position across navigation | Us | DONE | logo 16, TODAY 71, footer 968 unchanged across two navigations; navScrollable false |
| UI-65 | UI | Compact rail for short viewports: the nav is 897px tall, so below about 1170px the footer falls below the fold and needs a height-based density mode | Us | OPEN | measured at 700, 900 and 1170 |
| UI-63 | UI | Nav scroll indicator: a thin drawn bar inside the nav box that tracks its scroll position, because macOS overlay scrollbars take no space and fade out, which made an internal scroll look like a moving rail | Us | DONE | bar 262px tall, top 71 to 233 while the nav scrolls 0 to 300; rail unchanged |
| UI-62 | UI | The rail is locked: overflow hidden and full height, the logo fixed at the top, the nav scrolling in its own box, and the company footer pinned at the bottom with the nav running underneath it | Us | DONE | rail scroll 0 and logo 16 and footer 556 unchanged across two navigations while nav scrolls 0 to 407 to 55 |
| UI-61 | UI | The left rail no longer moves when a screen changes: the active nav button is scrolled inside the nav list only, instead of scrollIntoView walking every scrollable ancestor | Us | DONE | rail top 0 and logo top 16 unchanged after navigating; nav scrolls internally 0 to 407 |
| UI-11 | UI | Score rings as arcs, footer in three columns, Skill Gaps fits phone | `487efe6` |
| COPY-10 | COPY | Slogan on sign-in and hero | `487efe6` |
| COPY-11 | COPY | Filler notes and button arrows removed | 0 arrow spans |
| COPY-12 | COPY | Landing hero restored to the original layout after variants were rejected | measured |
| COPY-18 | COPY | Hero: plain pill, "Check my market gap", heavier headline in one purple | `b46d14b` |
| REPO-10 | REPO | Docs split into strategy and planning; README; `.gitignore` | `19f3907` |

## E. Rejected (do not rebuild)

| Item | Why |
|---|---|
| Centred hero, story strip, two-column hero | Founder wanted the original layout back |
| Full-screen sign-in without sidebar | Founder wanted the left side kept |
| Logo sheen, echo and halo | Founder: "not good" |
| Salary-band opener line in the hero | Founder: "not supposed to be there" |

## F. Change log

- 9 Nov 2026 – DATA-03 option B applied, contact addresses updated, EML-01 and EML-04 closed.
- 9 Nov 2026 – EML-01 and EML-04 closed on production evidence: code sent, code verified, dashboard reached.
- 9 Nov 2026 – PAY-02, PAY-03, PAY-04 done and tagged `restore-20261109-1`; PAY-05 added for the live cancellation proof.
- 9 Nov 2026 – Register rewritten as a ledger: every request numbered, ordered and categorised; done work moved out of Open.

## G. DATA-03 / DATA-06 – the decision

**What is wrong.** The benchmark is built from `salary_records`, and that table is not what it looks like.

| | Records | Distinct values |
|---|---|---|
| Live feeds (jobicy, hackernews, remoteok, arbeitnow) | 8,470 | 160 |
| Backend/senior comparables in use | 1,461 | – |
| of which USD/year | 1,311 | average 174,705 |
| of which CAD/year | 109 | average 229,000 |
| of which EUR/year | 4 | average 90,875 |

Two separate faults:
1. **Repetition.** 8,470 live records carry only 160 distinct (amount, role, seniority) combinations. Every ingest run re-inserts the same postings, so one job advert counts many times and the sample size is fiction.
2. **Currency.** The backend/senior benchmark is a US number. A EUR salary is compared with it, so the gap is overstated. Country filter does not help: Any, DE and US all return 138,000.

### Option A – rebuild on real data

| Step | Work | Effort |
|---|---|---|
| A1 | De-duplicate `salary_records` on (opportunity, amount, period) so each advert counts once | 0.5 day |
| A2 | Add EUR-first sources that disclose pay (EU boards, StepStone-style feeds, company career pages with structured pay) | 2–4 days, depends on access |
| A3 | Currency-correct comparison: convert the person's pay to EUR and compare only within the same currency bucket, or convert the market to EUR with a stated rate and date | 0.5 day |
| A4 | Minimum-sample gate: below N comparables, show a range with "thin data" instead of a single headline number | 0.5 day |
| A5 | Re-baseline the tests and the landing statistics on the new numbers | 0.5 day |

**Total: 4–6 working days**, of which 2–4 depend on getting EUR pay data.

### Impact on accuracy

| Measure | Now | After A |
|---|---|---|
| Distinct comparables, backend/senior | 160 (of 8,470 rows) | 160 to a few hundred, honestly counted |
| Currency match for a EUR user | none (USD benchmark) | EUR bucket, or FX-converted with a stated rate |
| Backend/senior median, EUR, after FX on today's data | 138,000 (USD-shaped) | ~155,700 median, p25 140,100, p75 184,000 |
| Confidence label | "high" on 4 EUR records | driven by the real count |
| 176% headline for a 50,000 salary | 176% | falls to roughly 210% on FX-converted data, so the number barely moves until A2 adds EUR sources |

**Honest reading:** A1, A3 and A4 fix the counting and the currency and make the number defensible. A2 is what actually changes the answer for a European user, and it is the part that depends on data access.

### Can PAY-01 and PAY-05 run before this?

**Yes, and they should.** They test the payment rail, not the number: checkout, Stripe customer, webhook, entitlement, cancellation. None of that touches `salary_records`.

Two conditions:
1. Refund the test payment, as planned, so no money changes hands on a benchmark we are about to replace.
2. Do not send the link to the first 20 people (GRO-01) until A1, A3 and A4 are in, because the headline number is the first thing a new user sees.
