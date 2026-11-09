# ThinkZet – Task Register

Single source of truth for all work. Rules: `docs/ENGINEERING.md` section 1.
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
| 7 | UI-01 | UI | Radar list in columns: 1 on phones, 2 on tablets, 3 on wide screens, softly tinted, blended faded colours | OPEN |
| 8 | UI-02 | UI | Structure audit of the remaining screens at phone and desktop widths: no paragraph blocks, label-value rows, chips | OPEN |
| 9 | UI-07 | UI | Mercor-style structure for app screens (underline tabs, left sub-nav plus form column) | OPEN |
| 10 | UI-03 | UI | Replace the remaining hardcoded colours with tokens | OPEN |
| 11 | UI-12 | UI | Landing page always checked in both PC mode and mobile mode before it is called done | RULE (in `ENGINEERING.md`) |
| 12 | COPY-17 | COPY | Mercor sign-in order option: email first, Google below. Only if the founder asks | OPEN (decision) |

## B. You – needs the founder

| ID | Cat | Task | Next action |
|---|---|---|---|
| EML-03 | EML | Sign-in email fails. Set `EMAIL_FROM=ThinkZet <onboarding@resend.dev>` in Railway | Railway → Variables → edit → Deploy |
| EML-01 | EML | Verify thinkzet.com in Resend so people other than you can sign in | Resend → Domains → Add `thinkzet.com`, region EU, send the DNS screenshot |
| DATA-03 | DATA | **Salary benchmarks are 80% synthetic** (648 of 812 records from `corpus.cjs`). Choose: A rebuild on live data only, or B label as sample data | Reply A or B |
| AUTH-01 | AUTH | Google credentials | OAuth client, redirect `https://thinkzet.com/api/auth/google/callback`, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` |
| AUTH-02 | AUTH | Apple credentials | Services ID, return URL `https://thinkzet.com/api/auth/apple/callback`, key, four `APPLE_*` variables |
| PAY-01 | PAY | Real €19.99 payment, confirm Pro unlocks, refund yourself | thinkzet.com → Upgrade |
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
| EML-02 | EML | Sender `ThinkZet <brief@thinkzet.com>` | EML-01 |
| AUTH-03 | AUTH | Test Google and Apple sign-in on the live site | AUTH-01, AUTH-02 |
| DATA-02 | DATA | Offsite backup of the SQLite volume | DEP-01 |
| GRO-01 | GRO | Send the link to the first 20 people | PAY-01, EML-01 |
| GRO-02 | GRO | Weekly Funnel and Leads report | GRO-01 |

## D. Done (verified and pushed)

| ID | Cat | Task | Evidence |
|---|---|---|---|
| DEP-10 | DEP | Production live on Railway at thinkzet.com | health 200, launch ready |
| DEP-11 | DEP | Root `railway.json` with Dockerfile builder | `4f5f365` |
| DEP-12 | DEP | Entrypoint fixes volume ownership, drops to `node` | `381a3b0`, `1b96d63` |
| DEP-13 | DEP | `www.thinkzet.com` redirects to the apex (301) | measured |
| PAY-10 | PAY | Stripe live product, prices, six-event webhook on thinkzet.com | signed event 200, forged 400 |
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

- 9 Nov 2026 – Register rewritten as a ledger: every request numbered, ordered and categorised; done work moved out of Open.
