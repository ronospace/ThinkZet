# MirrorSpread Brand Transformation — Phase 1: Audit

**Status:** complete, no changes made
**Date:** 7 November 2026
**Prepared for review before any implementation**

---

## 1. Executive summary

The platform already reads as **MirrorSpread** in every user-facing location. The previous
rename was completed across 32 files with zero legacy strings remaining.

What is **not** yet done is the brand *architecture* in its final form:

| Required | Present | Gap |
|---|---|---|
| Product name: MirrorSpread | ✅ everywhere | — |
| Parent: ZyraFlow GmbH™ | ✅ footer + legal only | — |
| Category: **Career Intelligence Platform** | ❌ | Sidebar says "Opportunity OS"; title says "Opportunity Operating System" |
| Attribution: **An independent product by ZyraFlow GmbH™** | ⚠️ different wording | Footer says "is a product of" |
| Copyright: **© 2026 ZyraFlow GmbH™** | ⚠️ has extra text | Adds "All rights reserved" + attribution sentence |
| Tagline: **See your value. Expand your possibilities.** | ❌ absent entirely | Hero uses the narrative headline instead |
| Five capability names as written | ⚠️ mostly | Several views use different names |

**Conclusion:** this is a *brand architecture* job, not a string replacement job. Roughly 40
precise edits across 6 files, plus one open question about the tagline's placement (see §7).

---

## 2. Complete inventory of brand references

### 2.1 User-facing brand strings (12 in `app/public/index.html`)

| Location | Current | Target |
|---|---|---|
| `<title>` | MirrorSpread AI — Opportunity Operating System | MirrorSpread — Career Intelligence Platform |
| Sidebar brand subtitle | Opportunity OS | Career Intelligence |
| Landing logo lockup | MirrorSpread | MirrorSpread *(keep)* |
| Landing sub-headline | …MirrorSpread reads live postings… | keep *(narrative, not the tagline)* |
| Star-seller `og:title` | The market has been pricing you without you | keep |
| Footer legal | © 2026 ZyraFlow GmbH™. All rights reserved. MirrorSpread is a product of ZyraFlow GmbH™. | © 2026 ZyraFlow GmbH™ · An independent product by ZyraFlow GmbH™ |
| App sidebar footer | © 2026 ZyraFlow GmbH™ | © 2026 ZyraFlow GmbH™ |
| Share card brand | MirrorSpread | keep |
| SEO page brand ×3 | MirrorSpread | keep |
| One-liner share text | "MirrorSpread says…" | keep |

### 2.2 Emails (`app/mailer.cjs`, 3 references)

| Location | Current | Target |
|---|---|---|
| Sender | MirrorSpread <brief@careeros.local> | MirrorSpread <brief@…> *(domain unchanged — see §5)* |
| Email header | MirrorSpread · Morning brief | keep |
| Sign-off | — MirrorSpread, a product of ZyraFlow GmbH™ | — MirrorSpread · An independent product by ZyraFlow GmbH™ |
| Email footer | © 2026 ZyraFlow GmbH™. All rights reserved. | © 2026 ZyraFlow GmbH™ |

### 2.3 Metadata and manifests

| File | Item | Current | Target |
|---|---|---|---|
| `manifest.webmanifest` | name | MirrorSpread | MirrorSpread — Career Intelligence |
| `manifest.webmanifest` | short_name | MirrorSpread | MirrorSpread |
| `manifest.webmanifest` | description | Discover how much opportunity… | See your value. Expand your possibilities. |
| `icon.svg` | glyph | M | M *(no change needed)* |
| `index.html` | `theme-color` | #0b0d10 | keep |

### 2.4 Documentation (18 files)

`README.md`, `docs/01…19`, `docs/planning/*` all reference MirrorSpread correctly.
**No action required** beyond adding the tagline to the mission document.

### 2.5 Backend (`app/server.cjs`, 11 references)

All are **internal** — the `COMPANY` constant, comments, and log lines. Only two are
user-visible: the `COMPANY.legalLine()` helper and the copyright helper. Update those two,
leave the rest.

---

## 3. Files requiring changes (complete list)

| File | Change | Risk |
|---|---|---|
| `app/public/index.html` | title, sidebar subtitle, footer legal, add tagline to hero | **Low** — text only |
| `app/public/manifest.webmanifest` | name, description | Low |
| `app/mailer.cjs` | sign-off, footer | Low |
| `app/public/legal/privacy.html` | entity line, footer | Low |
| `app/public/legal/terms.html` | entity line, footer | Low |
| `app/server.cjs` | `COMPANY.legalLine`, `COMPANY.copyright` | Low |
| `docs/planning/MISSIONS.md` | add tagline | None |
| `scripts/build-strategy.cjs` + `app/public/strategy.html` | subtitle in sidebar | Low |

**Total: 8 files.**

---

## 4. What must NOT change (and why)

| Identifier | Value | Reason |
|---|---|---|
| Database file | `data/careeros.db` | Renaming orphans every existing record. Zero user benefit. |
| Session cookie | `careeros_session` | Renaming logs out every user. |
| Browser storage keys | `mirrorspread-theme`, `-taught`, `-visit` | Already renamed in the previous pass. |
| API routes | `/api/…` | Contract with the running client. |
| Table names, column names | unchanged | Internal. |
| Git history | unchanged | Rewriting history destroys the audit trail. |
| Folder name | `careeros/` | Breaks the running server and every path reference. |
| Test fixture emails | `*@careeros.local` | Only appear in the local outbox. |

**Recommendation: leave all of these.** A future rename can be planned properly with a
migration; doing it now risks data for a cosmetic gain nobody sees.

---

## 5. Domain and trademark — explicitly out of scope

I have **not** verified, reserved or claimed:

- `mirrorspread.com` or any TLD
- `zyraflow.com` or any TLD
- Trademark availability in the EU (DPMA) or the US (USPTO)
- Social handle availability

The email sender currently reads `brief@careeros.local` — a placeholder domain, valid only
locally. **Do not wire a real email provider to a domain you have not yet secured.**

---

## 6. Feature naming

The brief lists five headline capabilities. Current implementation has **more**, and the
names differ slightly:

| Brief | Current in product | Recommendation |
|---|---|---|
| Career Twin | Career Twin | ✅ match |
| Opportunity Radar | Opportunity Radar | ✅ match |
| Rate Intelligence | Rate Intelligence | ✅ match |
| Market Pulse | Market Pulse | ✅ match |
| Career Trajectory | **Trajectory** | Rename to **Career Trajectory** |
| *(not listed)* | Negotiation | keep — it is a differentiator |
| *(not listed)* | Skill Gaps | keep |
| *(not listed)* | Career Tracker | rename from **Tracker** |
| *(not listed)* | AI Career Copilot | already "Copilot" → **Career Copilot** |

**Decision needed:** do you want the brief's five-feature presentation (which omits
Negotiation, Skill Gaps and Tracker), or all nine? My recommendation is **all nine** —
the four omitted ones are the highest-value screens.

---

## 7. The one genuine open question: where does the tagline go?

*"See your value. Expand your possibilities."* is a **calm, corporate** line.

The current hero is a **confrontational** one: *"The market has been pricing you without you."*

These do different jobs. The tagline is what the company says. The headline is what makes
someone stop scrolling.

**Three options:**

**A. Tagline replaces the headline.** Calm, credible, forgettable. Conversion likely drops.

**B. Tagline above the headline as a kicker.** Both present. The page becomes:
> *See your value. Expand your possibilities.*
> **The market has been pricing you without you.**

**C. Tagline in the brand lockup and footer; headline keeps the hero.** The tagline becomes
the brand promise used on the login screen, the App Store listing, the email footer and
anywhere the product describes itself. The landing hero stays confrontation-first.

**My recommendation is C**, with the tagline also present in the sidebar brand block
(as a subtitle under the logo, replacing "Opportunity OS"). It keeps the emotional hook
where it earns its keep and gives the brand a calm, repeatable line everywhere else.

**This is the only blocking decision in the audit.** Everything else can proceed on approval.

---

## 8. Implementation sequence (once approved)

1. `COMPANY` constant in `server.cjs` — single source of truth for name, category, attribution, copyright.
2. `manifest.webmanifest` + `<title>` + meta description.
3. Sidebar brand block: MirrorSpread / Career Intelligence / tagline.
4. Footer legal line, landing and app.
5. Email sign-off and footer.
6. Legal pages entity line.
7. Feature renames: Trajectory → Career Trajectory, Tracker → Career Tracker, Copilot → Career Copilot.
8. Add tagline to `MISSIONS.md` and the strategy site subtitle.
9. Rebuild `strategy.html`.
10. Run the 57-test suite. Nothing else.

---

## 9. Acceptance criteria

- [ ] `grep -r "CareerOS\|Karyvo"` returns **0** user-facing hits
- [ ] `<title>` reads `MirrorSpread — Career Intelligence Platform`
- [ ] Sidebar reads MirrorSpread / Career Intelligence, with the tagline
- [ ] Footer reads `© 2026 ZyraFlow GmbH™ · An independent product by ZyraFlow GmbH™`
- [ ] Emails sign off with the same line
- [ ] Database, cookie, routes, storage keys **unchanged**
- [ ] 57/57 tests pass
- [ ] No new external dependencies
- [ ] No domain or trademark claims made anywhere

---

## 10. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Copy change hurts conversion | Medium | Medium | The audit flags it; §7 proposes keeping the headline |
| Broken layout from longer strings | Low | Low | Test at 375px and 1440px after the change |
| Legal page misstatement | Low | **High** | No invented claims; entity line only |
| Accidental identifier rename | Low | **High** | §4 explicit do-not-touch list; verify with grep |
| Email sent from unverified domain | Medium | Medium | Not wired to a provider yet; flagged in §5 |

---

**STOPPING HERE.** No implementation until §7 (tagline placement) is decided and this
plan is approved.
