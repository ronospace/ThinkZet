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
6. A page withdrawn from the public answers 410, not 404.
7. A one-time token is claimed, never deleted. An OAuth state, a login code, a reset link is marked used and kept until its own expiry, so the second arrival can say "already completed" instead of "expired". Deleting the row makes a replay indistinguishable from a timeout, and the person who already authorised is told the link died. Claim with one conditional `UPDATE ... WHERE claimed_at IS NULL` and read its row count; that is the only atomic step SQLite gives you here. A 404 tells a crawler the page may return, so it keeps the URL; a 410 drops it on the next crawl.

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
- 2026-11-13 - 7.6 and 7.7 renumbered after AUTH-25: a one-time token is claimed, not deleted.

## 11. Capability that waits for a credential

A source, a backup target or a model that needs a key is built and registered before the key exists, so the key is a
variable rather than a piece of work. Two rules make that safe: an adapter whose credential is absent is not registered
at all (a missing key must never become a failing source in the ingest log), and any list of sources is derived from the
registered adapters rather than typed out again (a second list is a second thing to forget). `scripts/backup.cjs` runs
with no bucket and says so; `sources.cjs` registers `adzuna` only when both of its keys are present. Measured 14 November
2026: registered adapters without keys are the six live feeds, with keys the same six plus `adzuna`; the backup wrote
21.1 MB, passed `integrity_check`, and reported 36 tables.

## 12. A question is a row, not a pill

An ask the product already knows how to answer is a row with a mark, a left edge and a full-width hit area, laid out on
the page grid, never an oval of whatever width its words happen to need. Ovals read as tags, they cannot be scanned down
a column, and five of them at 393px pushed the first answer 315px down the screen. `.suggest` is a two-column grid of
rectangular rows (one column below 700px), and the copilot intro is a full-width card because it carries a definition
and four facts. Measured: rows 35px tall at 393 and 39px at 1440, intro 283px on a phone and 179px on a desk, with 14px
of the composer still visible at 852px so the first answer is one tap away.

## 13. A heading is a label; a sentence is not a heading

Card headings are full caps, letter-spaced, at `--text-sm` (12.5px) and weight 600, in `--ink2`. They are labels on a container,
not titles competing with the page title, and they are never bold. A sentence that states a finding - "Closing PyTorch
alone unblocks 12 of your 60 realistic opportunities" - is body copy at `--text-base`, weight 400, `--ink`, and it is
never set as a heading. A name is not a label either: a saved search keeps its own case, its own size and weight 650, so
`.sh-card h3` overrides the rule. One class carries the finding line, `.stmt`, used by Skill Gaps, Negotiation and Career
Trajectory. Measured 14 November 2026: every card heading at 393 and 1440 is 12.5px, weight 600, uppercase, 1.125px
tracking; the three finding lines are 14px weight 400. A heading one step above body copy is the point: at 11.5px it was the
same size as the sentence under it and the reader had to use weight alone to tell them apart.

A repeated unit label is not repeated. "cumulative" under four numbers became one column header, `Cumulative unblocked`,
because a word repeated once per row is noise the reader has to skip four times.

## 14. A number is written for a reader, not for a database

Every count is printed through `int()`, so it carries a thousands separator: 2,867 opportunities, 1,940 postings, 400 scored.
A raw template value - `${items.length}`, `${p.sample}`, `${c.n}` - is a defect even when the number is small, because the
same line prints 12 today and 1,204 next month. `int()` also turns null into an en dash rather than printing `null` or `NaN`.
Money goes through `money()`, percentages through `pct()`, scores through `score()`. There is no fourth formatter and no
inline `toLocaleString`. Measured 14 November 2026: twelve raw counts found and fixed; no bare four-digit run remains in the
rendered text of Market Pulse or Career Tracker at 393 or 1440.

## 15. Plain punctuation; an empty state is an instruction

No em dash anywhere in shipped code or user-visible copy. A colon, a comma or a full stop does the same work and does not
read as machine-written. The one exception is a parser character class, where the dash is data rather than prose.

An empty state says what is missing and how it fills: "Nothing saved yet. Save an opportunity from the radar and it lands
here." The word "empty" in grey tells the reader nothing and reads as a fault. One component carries it, `.tk-empty`, a
dashed border at `--line`, `--text-sm` in `--ink2`.

## 16. One emphasis order, and colour carries the transition

Emphasis is a ladder, not a switch. Nothing is bold because it is important; a thing is bold because it is higher on the ladder than what surrounds it. The order, top to bottom:

1. **Hero number** - `.big` at `--text-2xl`, weight 700, tight tracking. One per card, never two.
2. **Section title** - `h2.section` at `--text-md`, weight 650, and the only place a gradient is allowed inside a result surface: `--ink` to a 94% `--accent2` mix across the last third, clipped to the text. It marks where the next block starts without a rule or a heavier weight.
3. **Card heading** - full caps, weight 600, 0.09-0.1em tracking, `--ink2` (RULES 13). A label, never bold.
4. **Row label** - `.kv` at body size, weight 400, `--ink`.
5. **Caption** - `.big-cap` at `--text-sm`, weight 500, `--ink2`. The sentence under a hero number is a sentence, not a footnote: it sits one step above `--text-xs` so it can be read without leaning in.
6. **Note** - `.kv-note` or `.muted` at `--text-xs`, weight 400, `--muted`.

Two consequences worth stating, because they were both broken:

- A caption under a hero number is not a footnote. `0` over `outcomes you have reported` at 11px grey reads as a caption for a chart nobody drew. At `--text-sm` weight 500 in `--ink2` it reads as the answer's name.
- A gradient belongs to a transition, not to a decoration. The section title is the one element that says "the next thing starts here", so it is the one element that gets colour. The hero gradient stays landing-only (RULES 3).

## 17. Global by default, never one country

ThinkZet is a worldwide platform. Germany is one market among many, and nothing in the product may imply otherwise.

- No country is the default. A rate check with no country pools the whole corpus, then the currency area, then the country, in that order (DATA-11).
- No copy names a country as the home market. "In Germany" appears only where a page is explicitly about Germany.
- No list of countries is typed out by hand. It is derived from the corpus, so a market appears the moment the data can defend it and disappears when it cannot.
- A country code is a real page, not a redirect and not a 404. `/de` is the hub for one market, and the same route exists for every country in the corpus.
- A prioritisation that would only make sense in one country (a visa scheme, a tax rule, a public holiday) belongs in a market-specific surface, never in a global one.

The test: if the same screen were shown to a user in Lisbon, Toronto and Singapore, would every sentence still be true? If not, the sentence is wrong, not the user.

## 18. One registry, many markets

A market is a configuration record, never a code path. `app/markets.cjs` is the only place a country,
its currency, its language and its region are written down; every route, page, sitemap entry, select
and `hreflang` reads from it. Three settings stay separate, because they answer three questions:

- **market** - which labour market the numbers describe
- **language** - which language the interface is written in
- **currency** - which currency money is printed in

A route may suggest a market and a header may suggest a language, and the visitor may override
either. A code people type that ISO does not use for that market (`/uk`) is a permanent redirect to
the real one (`/gb`), never a second page. A route the registry knows answers 200 to a crawler; a
route it does not know answers 404. The sitemap lists only markets the corpus can defend, so a
listed route can never 404 and a 404 route can never be listed.

The test: add a market by adding one line to the registry. If anything else has to change, the
architecture is wrong.

## 19. Show the product before asking for anything

A landing page that only describes the product is a claim. The first screen carries a working
preview built from the same engine the signed-in product uses, so the visitor sees a real number
before they see a form.

- **One engine, no second implementation.** The preview calls the same rate intelligence and the
  same scoring the free check calls. A preview that drifts from the product is a lie with a delay.
- **Sample is a label, not a mood.** A preview the visitor has not driven says **Sample preview**;
  the moment the calculator drives it, it says **Live preview**. Never print one and mean the other.
- **No invented uplift.** A figure the corpus cannot defend is not printed. If the salary pool is
  too thin, the card says so in a sentence rather than filling the space.
- **A converted figure declares itself.** Money converted for display carries the rate date next to
  it, and a currency with no rate prints the original amount labelled with its own currency.
- **A proof number has a source line under it.** The count, the sample and a link to the method sit
  in the same block, so a sceptical reader can check the claim without leaving the page.
- **The page has one of everything.** One hero, one calculator, one capability grid, one datalist.
  Duplicate ids are a defect, asserted at zero in the browser rather than eyeballed.

The test: hide the marketing copy and the first screen should still tell a visitor what the product
does, with a number they can trace.

## 20. A hidden thing is not a removed thing

Anything the product does not offer a customer must not be delivered to that customer. Hiding it with an
attribute, a class, a founder flag or a client-side condition is not removal: every one of those is one
devtools session away from being visible again, and all of them are present in the accessibility tree and in
the bytes of the response.

- Operator markup is fenced with `@internal:start` / `@internal:end` and removed server-side by
  `stripInternal()` before the response leaves, for anyone who is not a founder.
- Operator code lives in its own file (`public/internal.js`), served only to a founder, and never
  referenced by the consumer document. The consumer bundle defines none of those functions.
- An operator route answers the same 404 as any unknown path to everyone else, and carries
  `X-Robots-Tag: noindex, nofollow, noarchive` so it can never be indexed.
- A view that is not in the consumer map does not exist, whoever is signed in.

The test: fetch the public page as a signed-out visitor and as Googlebot, and grep the bytes for every
operator word. The count must be zero, not the element hidden.

## 21. The declared language is the rendered language

A document may only claim a language it actually speaks. `lang`, `hreflang`, the metadata and the visible
copy are one statement, and a market route does not imply a translation.

- `app/i18n.cjs` holds every interface string, keyed once, in English and German.
- The server translates the document first and sets `lang` afterwards, so the tag cannot name a language the
  page does not have.
- Market, interface language and currency stay three separate settings: `/gb?lang=de` is German copy in GBP.
- Text rendered after load reads the same table through `T(key)`, so there is never a second copy of the words.
- An element with no key stays as written, so a missing translation is visible in review rather than blank.

The test: load the page, read `document.documentElement.lang`, and check that every sentence on it is in that
language. If not, the tag is wrong or the copy is.

## 22. A profile belongs to the person it describes

A screen that shows someone their own data is an editor, not a record. If a value can be wrong, it must be
correctable; if it came from somewhere, it must say where; if it is missing, it must say so and offer the
control that closes the gap.

- Every stored value carries its source: entered by the person, read from their CV, imported from their
  account, inferred, or awaiting review. A value with no recorded source says so.
- A save writes only the fields the request names. A partial form can never blank a value nobody touched.
- Completeness is a sum of named items with printed weights, so the percentage reconciles by hand.
- An absent figure is absent. Zero is a number and is never printed for a field that was left empty.
- A contradiction is a question, never a correction: name both values, say nothing was changed, offer Review.
- Destructive account actions live on their own page, last, behind a confirmation. They never share a card
  with the intelligence the person came for.

The test: open the screen as its owner, find a wrong value, and fix it without leaving the page.
