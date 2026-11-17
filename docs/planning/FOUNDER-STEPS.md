# Founder steps – everything only you can do, click by click

Last updated: 16 November 2026.
This is the hands-on companion to `NEXT-STEPS.md`. Every step says what to click, what to type, and what you should see before moving on. If a step does not show what it says, stop there and send me the line it printed.

Five jobs. About 90 minutes in total, and the first two are 10 minutes each.

| # | Job | Time | What it unblocks |
|---|---|---|---|
| 1 | Apple: sign in once, revoke the old key | 10 min | the last broken sign-in |
| 2 | Adzuna keys | 10 min | more live salary data |
| 3 | One backup bucket | 25 min | backups that leave the machine |
| 4 | Search Console indexing | 10 min | the 219 country pages getting crawled |
| 5 | The first 20 people | 35 min | revenue |

---

## 1. Apple sign-in: sign in once, then revoke the old key

The key is proven. Apple accepts the client secret and refused only the fake probe code, which is the answer you want. What is left is one real sign-in and one revocation.

### 1.1 Sign in on a phone

1. On your phone, open `https://thinkzet.com` in Safari.
2. Tap **Sign in** in the top right.
3. Tap **Continue with Apple**.
4. Apple asks to share or hide your email. Either is fine. Choose **Share My Email** if you want the account to match your Apple ID.
5. Face ID or your passcode.
6. You should land inside the app, signed in.

**What you should see:** the app shell with your name, no red banner, no toast.
**If you see an error:** copy the exact words. "This sign-in link expired. Please try again." is a retry, tap it again. "Sign-in with apple is misconfigured on our side" is a key or id mismatch, and I need the two-line log block from step 1.3.

### 1.2 Confirm the account exists

1. Open `https://thinkzet.com/?app=1`.
2. Your Career Twin or onboarding should be there, attached to the Apple email.

**What you should see:** an account, not a fresh onboarding screen. If it is fresh, the Apple email differs from the one you used before, which is fine, it is a second account.

### 1.3 Read the boot log (only if something failed)

1. Railway, ThinkZet service, **Deployments**, the live one, **View Logs**.
2. Find the two lines near the top:

```
[auth] apple key: present=true len=257 begin=true end=true literalBSN=false lines=6 parses=true
[auth] apple probe: ok (invalid_grant)
```

3. Send me both lines if the sign-in failed. They contain no secret.

### 1.4 Revoke the old key

Only after 1.1 worked.

1. `https://developer.apple.com/account/resources/authkeys/list`
2. Find the **old** key, the one named `ThinkZet Sign in with Apple` without the `2`.
3. Click it, then **Revoke**.
4. Confirm.

**What you should see:** the old key gone, `ThinkZet Sign in with Apple 2` still listed and still Active.
**Then:** sign in once more on the phone to prove the revoked key was not the one in use.

---

## 2. Adzuna keys

The adapter is written and registers itself only when its keys exist. No code change, no redeploy by hand.

### 2.1 Get the keys

1. `https://developer.adzuna.com/signup`
2. Register with your email. It is free for the volume ThinkZet uses.
3. Confirm the email, then sign in.
4. Open **Dashboard** or **Your API Access Details**.
5. Copy **App ID** (8 characters) and **App Key** (32 characters).

### 2.2 Put them in Railway

1. Railway, ThinkZet service, **Variables**.
2. **New Variable**: name `ADZUNA_APP_ID`, value the App ID.
3. **New Variable**: name `ADZUNA_APP_KEY`, value the App Key.
4. Optional, only if you want countries other than the default: `ADZUNA_COUNTRIES` = `de,gb,ch,us`.
5. Railway redeploys on its own. Wait for the deployment to go green.

### 2.3 Prove it

1. Open `https://thinkzet.com/api/data-sources`.
2. Look for `adzuna` inside `sources`.
3. Look at `salaryRecords` and `salaryRecordsFromLiveFeeds`. Both should rise within 30 minutes, which is the ingest interval.

**What you should see:** `adzuna` listed, and a higher salary count on the next check.
**If it is missing:** the keys are wrong or the variable names have a typo. Names are exact and case sensitive.

---

## 3. One bucket for backups

`scripts/backup.cjs` already takes a verified snapshot, checks integrity, and prunes to seven. It uploads nowhere until a bucket exists. Cloudflare R2 is free at this size and is the same account as the domain.

### 3.1 Create the bucket

1. `https://dash.cloudflare.com` → **R2** in the left menu.
2. **Create bucket**. Name it `thinkzet-backups`. Location: Automatic.
3. Open the bucket, then **Settings**, and note the **S3 API** endpoint. It looks like `https://<account-id>.r2.cloudflarestorage.com`.

### 3.2 Create the key

1. R2 → **Manage R2 API Tokens** → **Create API token**.
2. Name it `thinkzet-backup`.
3. Permissions: **Object Read & Write**.
4. Scope: **Only apply to specific buckets**, then pick `thinkzet-backups`.
5. Create, then copy the **Access Key ID** and **Secret Access Key**. The secret is shown once.

### 3.3 Put them in Railway

1. Railway, ThinkZet service, **Variables**. Add five:

| Name | Value |
|---|---|
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | `thinkzet-backups` |
| `S3_ACCESS_KEY` | the Access Key ID |
| `S3_SECRET_KEY` | the Secret Access Key |
| `S3_REGION` | `auto` |

2. Optional: `S3_PREFIX` = `prod` to keep production snapshots apart from any later ones.
3. Wait for the redeploy.

### 3.4 Prove it

Railway's shell is not always available on the free tier, so the reliable way is a one-off local run against the same bucket:

1. On this machine, in `careeros/`, run:

```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com \
S3_BUCKET=thinkzet-backups \
S3_ACCESS_KEY=... S3_SECRET_KEY=... S3_REGION=auto \
node scripts/backup.cjs --keep 7
```

2. Read the output. You want a `VACUUM INTO`, an `integrity_check ok`, a row count, and an upload line.
3. Open the bucket in the Cloudflare dashboard.

**What you should see:** one object under the prefix, dated today, a few megabytes.
**If the upload fails:** the endpoint is the usual culprit. It must be the S3 endpoint, not the bucket's public URL.

### 3.5 Schedule it

1. Ask me and I will add the nightly run to the routine list, or
2. Railway, ThinkZet service, **Settings**, **Cron Schedule**: `0 3 * * *` with the command `node scripts/backup.cjs --keep 7`.

**What you should see:** a new object each morning, and never more than seven.

---

## 4. Search Console: request indexing

The sitemap is submitted and the homepage is indexed. The country pages are not yet crawled, which is why Search Console reported "Blocked by robots.txt, Page with redirect, Not found (404)" as new reasons. Those three are expected: `/api/` is deliberately disallowed, `/uk` redirects to `/gb` by design, and a 404 is a 404. What matters is that the real pages get crawled.

### 4.1 Request indexing, one at a time

1. `https://search.google.com/search-console` → the `thinkzet.com` property.
2. Paste into the top search bar: `https://thinkzet.com/`
3. Wait for "URL is on Google" or "URL is not on Google", then click **Request Indexing**.
4. Repeat for `https://thinkzet.com/de`, `https://thinkzet.com/gb`, `https://thinkzet.com/us`.
5. Four requests is the daily soft limit per property. Stop at four.

**What you should see:** "Indexing requested" on each, then "URL is on Google" within days.

### 4.2 Confirm the sitemap is still healthy

1. Search Console → **Sitemaps**.
2. `sitemap.xml` should read **Success** with 219 discovered URLs.

### 4.3 Do not "fix" the three reported reasons

- `Blocked by robots.txt` is `/api/` and `/?app=1`, both intentional.
- `Page with redirect` is `/uk` → `/gb`, intentional.
- `Not found (404)` is any old URL, and a withdrawn page answers 410 by design.

Nothing to change. If you want the report quieter, the only real lever is more internal links to the country pages, which is a content job, not a settings job.

---

## 5. The first 20 people

This is the only step that produces revenue. `docs/planning/GRO-01-FIRST-20.md` has the four buckets, the invite copy and the seven-day schedule.

### 5.1 Run it on yourself first

1. On your phone, signed out, open `https://thinkzet.com`.
2. Tap **Check my market gap**.
3. Enter your real role, your real years, your real market.
4. Read the number. Then read the three proof figures under it.
5. Note the first thing that confuses you. That is the first thing to fix.

**What you should see:** a rate, a range, a percentile and at least one opportunity, with no dashes and no wait line.

### 5.2 Pick five people, not a list

1. Open `GRO-01-FIRST-20.md`, bucket 1.
2. Choose five people you can name, in different countries if you can.
3. Send the invite copy to each one individually, in your own words, one message each. No broadcast, no BCC.
4. Ask one question with the link: "what number did it give you?"

### 5.3 Record the first feedback the same day

1. Any reply, any complaint, any number they mention goes into `docs/planning/GRO-01-FIRST-20.md` under the feedback section, the same day.
2. Five replies is the goal for day one. Three is fine. Zero means the message, not the product, needs work.

### 5.4 The seven-day rhythm

| Day | What you do |
|---|---|
| 1 | Five invites, record replies |
| 2 | Five more, and fix the one thing that confused you |
| 3 | Ask the two most engaged people what they would pay for |
| 4 | Five more |
| 5 | Five more, and one post in a community you are already in |
| 6 | Read every reply again, and write down the pattern |
| 7 | Decide: keep inviting, or change the pitch |

**What you should see by day seven:** 20 invited, at least 8 replies, at least 2 people asking what Pro costs.

---

## When you are done

Tell me which of the five are finished. I will then:

- close the matching rows in `TASKS.md` and add the recommendation numbers,
- run the full check and re-verify production,
- and start the `/de` localisation, which is the first item on my side.

If a step fails, send me the exact line it printed. Every one of these five now prints something specific enough to name the cause.
