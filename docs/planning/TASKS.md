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
| 2 | AUTH-06 | AUTH | Greeting and every salutation use the first name Google or Apple supplies, not the email | IN PROGRESS (code written, to verify) |
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
| UI-21 | UI | Plan screen uses the landing layout: two wide cards, features as a proper list with a bullet, yearly as a line inside Pro, badge inside the card, actions stacked | Us | DONE | 1440px screenshot, 59/59 API, 10/10 browser |
| UI-22 | UI | Outcome Log as a structured table: type, opportunity and company, salary delta in colour, date; heading row with a count chip | Us | DONE | rendered markup |
| AUTH-11 | AUTH | Apple private key normalised: literal `\n`, real newlines, surrounding quotes and a bare base64 body all produce a valid PEM, so a dashboard paste cannot surface as `DECODER routines::unsupported`. Configuration errors now read as our fault, not the user's | Us | DONE | 4 paste shapes verified; callback reaches Apple and answers "code expired" |
| UI-20 | UI | One bottom offset on phones: the view padding and the main padding no longer stack into a dead band under the last card | Us | DONE | view padding 0, main 78px plus safe area |
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
| 8 | UI-02 | UI | Structure audit of the remaining screens at phone and desktop widths: no paragraph blocks, label-value rows, chips | OPEN |
| 9 | UI-07 | UI | Mercor-style structure for app screens (underline tabs, left sub-nav plus form column) | OPEN |
| 10 | UI-03 | UI | Replace the remaining hardcoded colours with tokens | OPEN |
| 11 | UI-12 | UI | Landing page always checked in both PC mode and mobile mode before it is called done | RULE (in `ENGINEERING.md`) |
| 12 | COPY-17 | COPY | Mercor sign-in order option: email first, Google below. Only if the founder asks | OPEN (decision) |

## B. You – needs the founder

| ID | Cat | Task | Next action |
|---|---|---|---|


| DATA-06 | DATA | **The 176% rate gap is an artefact of the synthetic corpus.** Backend/senior comparables are 1,461 records, of which 1,311 are USD/year at an average of 174,705 and 109 are CAD at 229,000; only 4 are EUR. The benchmark is a US-market number applied to a EUR salary, and the headline multiplies it. Country filter does not change it (Any, DE and US all return 138,000). Fixing this is DATA-03 | You decide A or B, then Us | OPEN |

| AUTH-01 | AUTH | Google credentials set in Railway and live on production; the client JSON confirms redirect `https://thinkzet.com/api/auth/google/callback` | none |

| PAY-01 | PAY | Real €19.99 payment, confirm Pro unlocks, refund yourself | thinkzet.com → Upgrade |
| PAY-05 | PAY | Live proof of cancellation against a real Stripe subscription (steps in `docs/planning/PAYMENTS.md`) | After PAY-01: subscribe, cancel in the app, confirm Stripe shows "cancels at period end" |
| SEC-01 | SEC | Roll the Stripe live key, webhook secret and Resend key (all pasted in chat) | Roll in each dashboard, update Railway |
| DEP-01 | DEP | Confirm the volume keeps data across a redeploy | Sign up, redeploy, reload |
| DEP-02 | DEP | Delete spare Railway project `feisty-optimism`; switch Railway Agent off | Railway settings |
| DEP-03 | DEP | Rename Railway service to ThinkZet | Service settings |
| REPO-01 | REPO | Rename GitHub repo `MirrorSpread` to `ThinkZet` | GitHub → Settings; then Us updates `deploy/*` |
| DATA-01 | DATA | Make the copilot and cover letters generative | Supply `LLM_ENDPOINT`, `LLM_API_KEY`, `LLM_MODEL` |

## C. Blocked

| ID | Cat | Task | Needs |
|---|---|---|---|
| COPY-13 | COPY | Hero statistics (1 in 3, €13,500, 72%) have no source in the repo. Replace with computed numbers, or remove | DATA-03 |
| EML-02 | EML | Sender `ThinkZet <brief@thinkzet.com>` | EML-01 (cleared) |
| AUTH-03 | AUTH | Both providers live on production: providers reports google and apple true, both start routes return the provider with the thinkzet.com redirect, a forged state is refused and recorded in /api/auth/diagnostic. The consent step itself needs a human browser | You: click Continue with Google and Continue with Apple once | OPEN |
| DATA-02 | DATA | Offsite backup of the SQLite volume | DEP-01 |
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
