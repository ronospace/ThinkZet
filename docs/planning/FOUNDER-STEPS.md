# What is left on your end

Last updated: 17 November 2026.
Done and verified: Apple sign-in, Adzuna, R2 backup upload, desktop width, Account copy.

Four items. Two are minutes, one is an hour, one is a decision.

---

## 1. Search Console indexing - 10 minutes

Four URLs, four requests, once.

1. `https://search.google.com/search-console`, property `thinkzet.com`.
2. Paste `https://thinkzet.com/`, then **Request Indexing**.
3. Repeat for `/de`, `/gb`, `/us`.
4. Stop at four; that is the daily soft limit.

Proof: each reads "Indexing requested", then "URL is on Google" within days.
Do not "fix" the three reasons already reported: `/api/` is disallowed on purpose, `/uk` redirects to `/gb` on purpose, a 404 is a 404.

---

## 2. R2 token: add Object List - 2 minutes

The upload works. Pruning does not, because the token is write-only.

1. Cloudflare, R2, **Manage R2 API Tokens**, edit `thinkzet-backup`.
2. Add **Object List** to the permissions, keep the bucket scope.
3. Nothing else changes; the same token and the same variables.

Proof: the next backup prints `pruned N old copies` instead of `prune skipped: list failed 403`.
Until then every snapshot is kept, which costs pennies and loses nothing.

---

## 3. Nightly backup - 2 minutes

1. Railway, ThinkZet service, **Settings**, **Cron Schedule**.
2. Schedule `0 3 * * *`, command `node scripts/backup.cjs --keep 7`.

Proof: one new object each morning, never more than seven.
Or say the word and I add it as a routine instead.

---

## 4. The first 20 people - 1 hour, then seven days

The only item that produces revenue.

1. Signed out, on your phone, open `https://thinkzet.com`.
2. **Check my market gap** with your real role, years and market.
3. Note the first thing that confuses you.
4. Send the invite to five people individually, one message each, and ask "what number did it give you?"
5. Record every reply the same day in `GRO-01-FIRST-20.md`.

Proof by day seven: 20 invited, 8 replies, 2 people asking what Pro costs.

---

## Waiting on you, not actionable yet

| Item | What you must supply |
|---|---|
| Sharp Boy SDK, paywall, entitlements | a local path or a repo; there is no Sharp Boy codebase on this machine or in the 16 repos |
| Sharp Boy legal registration | company name, HRB, court, VAT ID, address, managing director |

---

## Nothing else

Everything on my side is either shipped or listed in `NEXT-STEPS.md`. There is no founder item beyond the four above.
