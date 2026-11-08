# ThinkZet – Task Register

Single source of truth for all work. Rules: `docs/ENGINEERING.md` section 1.
Last updated: 9 November 2026.

**Owner:** `Us` = engineering, `You` = needs the founder.
**Categories:** `DEP` deployment · `SEC` security · `AUTH` sign-in · `PAY` payments · `EML` email · `UI` interface · `COPY` wording · `DATA` data and engine · `GRO` growth · `REPO` repository and docs.

---

## A. Open

| ID | Cat | Task | Owner | Status | Next action |
|---|---|---|---|---|---|
| PAY-01 | PAY | Real €19.99 payment test, then refund | You | OPEN | Pay with own card on thinkzet.com, confirm Pro unlocks and Stripe shows webhook 200, refund in Stripe |
| EML-03 | EML | Set `EMAIL_FROM=ThinkZet <onboarding@resend.dev>` in Railway until the domain is verified (current value uses the unverified thinkzet.com and every send fails) | You | OPEN | Railway Variables, then Deploy |
| EML-01 | EML | Verify thinkzet.com in Resend | You | OPEN | Resend → Domains → Add `thinkzet.com`, send screenshot of DNS records; then add to Cloudflare |
| EML-02 | EML | Switch sender to `ThinkZet <brief@thinkzet.com>` | Us | BLOCKED | Needs EML-01 |
| AUTH-01 | AUTH | Google sign-in credentials | You | OPEN | Create OAuth client, redirect `https://thinkzet.com/api/auth/google/callback`, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway |
| AUTH-02 | AUTH | Apple sign-in credentials | You | OPEN | Services ID, return URL `https://thinkzet.com/api/auth/apple/callback`, key; set four `APPLE_*` variables in Railway |
| AUTH-04 | AUTH | Sign-in shows Google and Apple buttons with a Soon tag until credentials exist | Us | DONE | Live automatically once AUTH-01 and AUTH-02 are set |
| AUTH-03 | AUTH | Test Google and Apple sign-in end to end on the live site | Us | BLOCKED | Needs AUTH-01 and AUTH-02 |
| SEC-01 | SEC | Roll Stripe live key, webhook secret and Resend key (all pasted in chat) | You | OPEN | Roll in each dashboard, update Railway variables; webhook secret must match the Stripe destination |
| DEP-01 | DEP | Confirm the volume keeps data across a redeploy | You | OPEN | Sign up, redeploy in Railway, reload and confirm the profile survives |
| DEP-02 | DEP | Delete spare Railway project `feisty-optimism`; switch Railway Agent off | You | OPEN | Railway project settings |
| DEP-03 | DEP | Rename Railway service from MirrorSpread to ThinkZet | You | OPEN | Service settings |
| REPO-01 | REPO | Rename GitHub repo `MirrorSpread` to `ThinkZet`, update clone URLs in `deploy/*` | You, then Us | OPEN | GitHub → Settings → Rename; then Us updates URLs |
| UI-04 | UI | Desktop layout: shared 1200px container, hero as two columns, FAQ as two columns, one-line footer legal | Us | DONE | measured: nav, page and footer share the same left and right edges |
| UI-05 | UI | Brand: translucent gradient mark with echo and halo, two-tone wordmark, one shared symbol, favicon and touch icon | Us | DONE | computed styles verified in both themes |
| UI-06 | UI | Logo simplified: removed sheen, echo and halo; content width capped (1080 landing, 1120 app) so wide screens keep calm margins | Us | DONE | measured at 1280, 1440, 1920 |
| UI-07 | UI | App screens adopt Mercor-style structure: underline tabs for sections, left sub-nav plus a form column, quiet icon rail | Us | OPEN | Study references, then apply to Plan, Twin, Tracker, Brief |
| COPY-11 | COPY | Removed filler notes and button arrows; hero reduced to headline, one line, one button, centred | Us | DONE | 0 arrow spans left; hero has 3 elements; copy and check card centre offset 0px at 1280, 1440, 1920 |
| UI-01 | UI | Radar list: 1 column on phones, 2 on tablets, 3 on wide screens, tinted by score | Us | OPEN | Build and measure at 393, 768, 1280 |
| UI-02 | UI | Structure audit of remaining screens: landing lower sections, pricing, Brief, Tracker, Negotiation, Market Pulse, Onboarding | Us | IN PROGRESS | Screenshot each at 393 and fix paragraph-style blocks |
| UI-03 | UI | Light-mode audit of the 90 remaining hardcoded colours | Us | OPEN | Tokenise or confirm each |
| DATA-01 | DATA | Generative copilot and cover letters | You, then Us | OPEN | Supply `LLM_ENDPOINT`, `LLM_API_KEY`, `LLM_MODEL` |
| DATA-02 | DATA | Offsite backup of the SQLite volume | Us | OPEN | Nightly snapshot to object storage |
| GRO-01 | GRO | Send the link to the first 20 people | You | BLOCKED | Needs PAY-01, EML-01 |
| GRO-02 | GRO | Watch the Funnel and Leads screens, report weekly | Us | BLOCKED | Needs GRO-01 |

## B. Done

| ID | Cat | Task | Evidence |
|---|---|---|---|
| DEP-10 | DEP | Production live on Railway at thinkzet.com | `/api/health` 200, launch `ready: True`, 57/57 API, 10/10 browser |
| DEP-11 | DEP | Root `railway.json` with Dockerfile builder | commit `4f5f365` |
| DEP-12 | DEP | Entrypoint fixes volume ownership, drops to `node` | commits `381a3b0`, `1b96d63` |
| DEP-13 | DEP | `www.thinkzet.com` redirects to the apex (301) | measured |
| PAY-10 | PAY | Stripe live product, prices, six-event webhook on thinkzet.com | signed event 200, forged 400 |
| SEC-10 | SEC | Sign-in code no longer returned when mail is live | commit `47454dc` |
| AUTH-10 | AUTH | Google and Apple sign-in built (state, nonce, verified email) | commit `89318d3` |
| UI-10 | UI | Top bar: title, live pill, icons pinned right, no sideways scroll | measured at 360 and 393 |
| UI-11 | UI | Sign-in card, score rings as real arcs, footer in three columns, Skill Gaps fits phone | commits `89318d3` to `487efe6` |
| COPY-10 | COPY | Slogan on sign-in and hero, two lines max | commit `487efe6` |
| REPO-10 | REPO | Strategy and planning docs split, README rewritten, `.gitignore` tightened | commit `19f3907` |

## C. Change log

- 9 Nov 2026 – COPY-11 filler removed, hero centred.
- 9 Nov 2026 – EML-03: sign-in failing because EMAIL_FROM uses an unverified domain; app now logs the real reason.
- 9 Nov 2026 – UI-06 logo simplified, widths capped.
- 9 Nov 2026 – UI-04 desktop layout and UI-05 brand refresh.
- 9 Nov 2026 – AUTH-04: provider buttons always visible, Soon tag until configured.
- 9 Nov 2026 – Register created. Engineering rules added in `docs/ENGINEERING.md`.
