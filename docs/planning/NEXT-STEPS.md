# Next steps – everything left, in the order to do it

Last updated: 16 November 2026.
State: Apple sign-in works in production, 133 recommendations closed, `scripts/check.cjs` 65/65, sitemap 219 URLs all answering 200.

Two kinds of work are below. **You** means only you can do it: it needs a console, a key or a person. **Me** means I can start it now with nothing from you.

Do the You items first. They are short, and three of the five unblock something that is already built and waiting.

---

## Part 1 – Yours, in this order

### 1. Apple sign-in: sign in once, then revoke the old key

The key is proven. Apple accepts the client secret; only the fake probe code was refused.

- Open thinkzet.com on a phone and tap **Continue with Apple**. Sign in with a real Apple ID.
- You should land inside the app, signed in, with no error banner.
- Then, and only then, go to developer.apple.com, Keys, and **revoke the old key**. Apple allows two active keys, which is what made this rotation safe.
- Proof it worked: the app shows you signed in, and `/api/auth/providers` still reads `{"google":true,"apple":true}`.

If it fails, the callback now tells you which of two things it is: "This sign-in link expired" is a retry, "misconfigured on our side" is a key or id mismatch.

### 2. Adzuna keys: two variables, and the adapter switches itself on

The adapter is written and registers only when its keys exist. Nothing else changes.

- Register at developer.adzuna.com and copy the App ID and App Key.
- Railway, ThinkZet service, Variables: add `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`.
- Optional: `ADZUNA_COUNTRIES`, default `de,gb,ch,us`.
- Proof it worked: `/api/data-sources` lists `adzuna` in `sources`, and the salary record count rises on the next ingest.

### 3. One bucket for backups: tonight's snapshot leaves the machine

`scripts/backup.cjs` already takes a verified snapshot and prunes to seven. It uploads nowhere until a bucket exists.

- Create one bucket. Cloudflare R2 is free at this size and is the same account as the domain.
- Railway variables: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`. Add `S3_REGION` if the provider needs one.
- Run `node scripts/backup.cjs` once by hand and read the output.
- Proof it worked: the run prints an upload, and the object is visible in the bucket.

### 4. Search Console: request indexing for the four pages that matter

The sitemap is submitted and the homepage is indexed. The country pages are not yet crawled.

- Search Console, URL inspection, one at a time: `https://thinkzet.com/`, `/de`, `/gb`, `/us`.
- Request indexing on each.
- Proof it worked: each shows "Indexing requested" and, within days, "URL is on Google".

### 5. The first 20 people

This is the only step that produces revenue, and it is the one that has been paused longest.

- Open `docs/planning/GRO-01-FIRST-20.md`. It has four buckets, invite copy, five test steps and a seven-day schedule.
- Send the link to five people individually today, not a broadcast.
- Run the free rate check on your own profile first, as a stranger would, and note the first thing that confuses you.
- Proof it worked: five replies, and the first piece of feedback recorded the same day.

---

## Part 2 – Mine, ready to start

These need nothing from you. Say the word and I begin at the top.

### 6. `/de` localisation of the landing page

The route, the language declaration and the string table exist; the German copy is partial. This finishes it, page by page, with the same measured checks at 1440, 1024, 768, 393 and 320.

### 7. The 14-point Career Twin completion report

UI-146 shipped. The written report you asked for, with commit and deployment identifiers, desktop and mobile screenshots and the accessibility checks, is still owed.

### 8. The verification and sign-off package

Screenshots for UI-152 and UI-153 exist in `docs/shots/`. The written sign-off, against your sixteen points, is still owed.

### 9. The `:focus-visible` outline re-check

A probe returned `outline:none 3px` on the second Tab stop. Either the shorthand is being overridden or the probe read the wrong element. One measurement settles it.

### 10. `/api/taxonomy` role labels

The browser shows 11 roles and 58 skills. Whether every `SEO_ROLE` value reaches that list is unverified when the map is partial.

### 11. `ronospace/Flow-Ai` for RustLabs

Separate repo, `d0abb53`. The `third_party/` removal plan is written and unexecuted: `git filter-repo`, then gitleaks 0, regex 0, cloc above 30,000, force-push, resubmit with AI share 25 to 50 per cent.

---

## Part 3 – Waiting, not actionable yet

| Item | Waiting on |
|---|---|
| Testimonials block | a paying cohort; it fills itself after 14 days of Pro |
| Pro+ value proposition review | the first 20 users, so the tier is designed against real usage |
| Sharp Boy SDK, paywall, entitlements | a local path or a repo; there is no Sharp Boy codebase on this machine or in the 16 repos |
| Sharp Boy legal registration fields | company name, HRB, court, VAT ID, address, managing director |

---

## The shortest path to the first euro

1. Step 1 above, so sign-in is not a wall.
2. Step 5, five people, today.
3. Step 6 in parallel, because a German visitor should not land on English.

Everything else can wait a week without costing anything.
