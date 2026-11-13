# ThinkZet - Engineering and Design Rules

Living document. Every rule here was paid for by a real mistake or a real correction.
Append a rule when a decision is made twice; never delete one without recording why in the changelog at the bottom.

Owner: whoever is building. Reviewer: the founder.

---

## 1. Measure, never guess

1. Every layout claim is proved with computed geometry from a real browser, not by looking at a screenshot. Read `getBoundingClientRect()`, `scrollWidth`, `clientWidth`, `getComputedStyle()`.
2. A number in a report is a measurement with a source. "Looks fine" is not a result.
3. Check both modes every time: phone at 393px and desktop at 1440px. Add 320 and 344 for anything in the header, the rail or a card row.
4. Screenshot the exact element with a clip rectangle taken from its own bounding box, not the whole page.
5. When a rule is overridden, find out which rule wins. Declare the narrow-screen override last in the sheet, or scope it so specificity is unambiguous.

## 2. One scale, no exceptions

1. Font sizes come from the tokens: `--text-2xs` 10.5, `--text-xs` 11.5, `--text-sm` 12.5, `--text-base` 14, `--text-md` 15, `--text-lg` 17, `--text-xl` 20, `--text-2xl` 25, `--text-3xl` 32.
2. No literal `font-size` in px, rem or em anywhere in the app shell. Two exceptions exist and both are relative to their own container: `sup.ord` at `.62em` and the landing slogan at `1.18em`.
3. Colours come from tokens. A rule-level hex is a bug. `color-mix()` against a token is allowed.
4. Spacing comes from the shared steps. A one-off margin is a smell; a one-off padding inside a measured component is acceptable when it is commented.

## 3. Surfaces are not promotions

1. A card that carries a result is a panel: `--panel2` surface, `--line` border, accent on the kicker only. Use `.card.plain`.
2. The violet gradient is for the landing hero and nothing else. It is a first-impression surface, not an in-app surface.
3. Paid-plan messaging inside the app is a fact line, not a pitch: `.plan-note` with a `FREE` kicker, one sentence of fact, and a `See plans` link. No price, no verb aimed at the wallet, no coloured card.
4. The Plan page may sell. Every other screen states facts.
5. A card that explains the product to someone already using it is deleted, not shortened.

## 4. Copy is fixed unless asked

1. Preserve existing copy unless explicitly asked to change it. Fit long copy by type size, never by rewriting it.
2. Never use an em dash. Use an en dash with spaces, or a hyphen.
3. Title case for screen titles and buttons; sentence case for body and pills.
4. Never truncate an action. Wrap it.
5. A heading that repeats the section name above it is removed.

## 5. The shell

1. The rail is navigation, not content. Only the menu scrolls.
2. On a phone the rail becomes a bottom bar and the logo is hidden, so the top bar carries the Z mark and the page icon steps aside.
3. The top bar is locked: `position:sticky` needs a scrolling ancestor. `main` is the scroller at every width, and the shell is one shrinkable grid row.
4. A title measures itself and steps down 0.5px at a time until it and its pill fit one line. Under 360px the search button steps aside before the title shrinks.
5. Founder and operator surfaces never appear in user navigation. They are hidden in markup and gated by `FOUNDER_EMAILS`.

## 6. Data honesty

1. A number shown to a user is computed from real records. No seeded series, no formula dressed as history.
2. Charts and sparklines stay, and they show real history. Under two points they say so.
3. Benchmarks use live postings with pay disclosed. Synthetic rows display opportunities and never contribute a salary figure.
4. Every benchmark names its market and its depth. Country, then currency area, then global; remote is separate.
5. When the real thing is unavailable, say so in the product and in the report. Never present sample data as real.

## 7. Change control

1. No redesign without instruction. When a layout is reverted, name the commit that restores it.
2. Copy changes and design changes are separate commits.
3. Every change ends with: `node scripts/check.cjs`, `node scripts/browser-check.cjs`, a measured phone and desktop check, one commit, one `restore-YYYYMMDD-N` tag, pushed.
4. A commit message states what changed, the measurements that prove it, and the test counts.
5. Tag before risky work, not after.
6. A page withdrawn from the public answers 410, not 404. A 404 tells a crawler the page may return, so it keeps the URL; a 410 drops it on the next crawl.

## 8. Privacy and money

1. Never ask for a private key in chat. Keys live in the environment, not in the repo.
2. The referral module is physically isolated from ranking. Commission can never move a score.
3. Ads never appear on paid plans, never above the first insight, never inside the rate result or the copilot.
4. Checkout requires a session. A missing subscription is a downgrade, not an unknown state.

## 9. Working with the founder

1. Report in bullets, short, with the measurement that backs each line.
2. Never claim a deploy, a domain or a trademark without verifying it.
3. When a step needs the founder, say exactly which click, on which page, and what success looks like.
4. Keep working autonomously; ask only when a decision is genuinely the founder's.

---

## 10. Focus, hover and state

1. A focus ring appears for keyboard users only. `:focus-visible` carries `--ring`; a pointer tap must not leave a ring behind.
2. A hover state may change border and text colour, never geometry. Nothing may move when the pointer crosses it.
3. Measured proof for focus is a real Tab key event through the browser, not a scripted `.focus()` call, because only a real key press sets `:focus-visible`.

## Changelog

- 2026-11-13 - Created. Rules drawn from UI-107 to UI-111: the title fit, the token pass, the fact line, the panel pass, the shell scroll fix.
- 2026-11-13 - Section 10 added after UI-03 and the focus-ring check: score tones are theme tokens, and a ring is proved with a real Tab key.
- 2026-11-13 - 7.6 added after SEO-07: a withdrawn page answers 410 so the index lets go of it.
