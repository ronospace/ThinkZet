# Verification and sign-off – 18 November 2026

Every figure below was read from the running build with a headless Chrome driven over CDP, or from
the live API on `127.0.0.1:4173`. Nothing here is estimated. Commit `f8ebfb7` plus the focus and
taxonomy work that follows it.

## 1. The preview card, three personas, four widths

Measured by clicking each tab and reading the rendered card, not the payload.

| Width | Persona | Segment line | Median | Period | Currency | Confidence | Postings | Card height | Horizontal scroll |
|---|---|---|---|---|---|---|---|---|---|
| 1440 | UK Data Scientist | Market range · Data Science · Senior | £109,788 | /yr | GBP | Medium | 172 | 390 | No |
| 1440 | DE Backend | Market range · Backend · Senior | €112,500 | /yr | EUR | Medium | 42 | 390 | No |
| 1440 | US Product | Market range · Product · Lead | US$167,143 | /yr | USD | Medium | 48 | 390 | No |
| 1024 | all three | as above | as above | /yr | as above | Medium | as above | 429 | No |
| 393 | all three | as above | as above | /yr | as above | Medium | as above | 390 | No |
| 360 | UK / DE | as above | as above | /yr | as above | Medium | as above | 390 | No |
| 360 | US Product | Market range · Product · Lead | US$167,143 | /yr | USD | Medium | 48 | 402 | No |

- One currency per card, and it is the card's own: GBP, EUR and USD never mix inside a card.
- Every disclosed figure carries `/yr`. The one hourly posting in the US set prints `/hr` in its own row.
- The card reserves its height, so a tab switch is not a layout shift: 390 at 1440, 393 and 360; 402
  only on the US card at 360, where the conversion line takes a second line.
- A converted benchmark declares itself: "Estimated converted benchmark · source EUR area · rate
  2026-11-17" on the UK card, "Converted from EUR at the 2026-11-17 rate" on the US card. The DE card
  is native and carries no conversion line.

## 2. Card and evidence strip end together

At 1440 the left column bottom is 657 and the card footer bottom is 636; at 1024, 695 and 674. The
19px difference is the card's own bottom padding, and it is identical at both widths, so the two
columns end on the same line rather than one running past the other.

## 3. Consumer-only boundary

A stranger's HTML, fetched with no cookie:

| Token | Count |
|---|---|
| `run-ingest` | 0 |
| `menu-demo` | 0 |
| `profile-pill` | 0 |
| `api/demo` | 0 |
| `tb-op` | 0 |
| `tb-cell-act` | 0 |

Operator routes answer a stranger with the same 404 a missing route answers: `/console`,
`/internal.js`, `/api/ops`, `/api/ingest`, `/api/leads`, `/api/analytics`, `/diagnostic`,
`/api/ops/backup`, `/api/demo`. Asserted in `scripts/check.cjs`, not by hand.

## 4. Focus rings, proved with a real Tab key

Driven with `Input.dispatchKeyEvent` for Tab, not `element.focus()`.

| Width | Stop | Ring |
|---|---|---|
| 1440 | nav links ×4 | `2px solid rgb(139,92,246)` outline, offset 2 |
| 1440 | theme toggle | `rgba(167,139,250,.4) 0 0 0 3px` |
| 1440 | Sign in | same ring |
| 1440 | hero primary | same ring |
| 1440 | hero sample | same ring |
| 393 | theme toggle, Sign in, hero primary, hero sample | same ring on all four |
| 393 | persona tab | `2px solid` outline plus the ring |
| 393 | preview panel, role input | same ring |

Defect found and fixed: `:focus-visible` sat at CSS line 138, before `.btn`, and `.btn` declares its
own `box-shadow`, so a focused button showed `outline:none` and no ring at all. The rule is now last in
the sheet, and the buttons that declare a shadow restate the ring explicitly.

## 5. `/api/taxonomy` with a partial `SEO_ROLE`

The endpoint used to return `SEO_ROLE` verbatim, which is keyed by slug (`data-science`) while the
rows are keyed by family (`data_science`). All 11 families were unlabelled. The label table is now
built from the families the query returns, with `FAMILY_LABEL` first and a title-cased fallback:

- 11 families, 11 labels, 0 missing.
- With `SEO_ROLE` reduced to a single entry, still 0 missing, and an unknown family falls back to
  `Quantum Engineering`.

## 6. `/de` in German, four widths

Fetched with `Accept-Language: de-DE,de;q=0.9`, which the server honours over the market default.

| Width | `html lang` | Overflowing elements | Horizontal scroll | Headline lines |
|---|---|---|---|---|
| 1440 | de | 0 | No | 2 |
| 1024 | de | 0 | No | 3 |
| 393 | de | 0 | No | 3 |
| 360 | de | 0 | No | 3 |

Checked for overflow inside their own box: nav links, buttons, pillar numbers, persona tabs, footer
links, footer headings, the kicker, chips, price buttons, headline spans and hero bullets.

Defect found and fixed: the German secondary CTA "Live-Beispiel ansehen" overflowed its 42% cell at
393 and 360 and pushed the row 15px past the viewport, while the document still reported no
horizontal scroll. The phone CTA now wraps inside its cell: the row ends at 375 in a 393 viewport and
342 in a 360 viewport.

Also fixed: the footer's Product links, the FAQ link and the metadata date had no keys, so a German
page printed "Capabilities", "Pricing" and "Updated". They now print "Funktionen", "Preise" and
"Stand 2026-11-18".

## 7. Suite

`node scripts/check.cjs` from the repo root: **65 passed, 0 failed**, with no `TEST_SESSION` supplied,
so the suite mints its own session and asserts the anonymous 401 first.

## Sign-off

- [x] Three personas, four widths, one currency per card, `/yr` on every disclosed figure
- [x] Card and evidence strip end together at 1440 and 1024
- [x] Zero operator markup in a stranger's HTML; operator routes 404
- [x] Focus rings proved with a real Tab key at 1440 and 393
- [x] Taxonomy labels complete with a partial `SEO_ROLE`
- [x] `/de` renders German at 1440, 1024, 393 and 360 with no overflow
- [x] 65/65 API
