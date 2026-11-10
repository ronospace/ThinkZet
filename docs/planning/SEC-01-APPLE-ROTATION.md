# SEC-01 – Apple `.p8` rotation

The last key. Everything else is rotated. Follow this in order; each step says what you should see before moving on.

## Which Railway variables change

Only one value changes. The other three stay exactly as they are.

| Variable | Action |
|---|---|
| `APPLE_PRIVATE_KEY` | **replace** with the contents of the new `.p8` |
| `APPLE_KEY_ID` | **replace**, only if the new key has a different id |
| `APPLE_CLIENT_ID` | unchanged, `com.thinkzet.web` |
| `APPLE_TEAM_ID` | unchanged |

If you create the new key in the same Apple Developer account, `APPLE_TEAM_ID` cannot change. `APPLE_KEY_ID` is the ten
character code in the key's name, so it changes whenever you create a new key.

## Before you start

- Sign in to developer.apple.com with the account that owns the team.
- Have the Railway project open on the Variables tab for the ThinkZet service.
- Do not delete the old key until step 7 passes. Apple allows two active keys, which is what makes a clean rotation possible.

## Steps

1. **Create the new key.** Certificates, Identifiers & Profiles, then Keys, then the plus button. Name it
   `ThinkZet Sign in with Apple 2`. Tick **Sign in with Apple**, then Configure, and select the primary App ID that backs
   `com.thinkzet.web`. Save.
2. **Download it once.** Apple offers the `.p8` a single time. The file is named `AuthKey_XXXXXXXXXX.p8`, and the ten
   characters are the new key id. Keep it out of any synced folder.
3. **Copy the whole file**, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines. The app
   accepts real newlines, literal `\n`, surrounding quotes or a bare base64 body, so any paste shape works.
4. **Update Railway.** In Variables, set `APPLE_PRIVATE_KEY` to the pasted contents. If the file name gave you a new key
   id, set `APPLE_KEY_ID` to those ten characters. Save; Railway redeploys automatically.
5. **Wait for the deploy** to reach Active. Health should answer:
   `curl -s https://thinkzet.com/api/health`
6. **Check the provider flag:**
   `curl -s https://thinkzet.com/api/auth/providers`
   Expect `{"google":true,"apple":true}`. If `apple` is false, the key did not parse; check that the BEGIN and END lines
   survived the paste.
7. **Prove a real sign-in.** On a phone, open https://thinkzet.com/?app=1, choose Continue with Apple, and complete it.
   You should land signed in with your name filled. This is the only step that proves the key, the client id and the
   service id all agree.
8. **Only now revoke the old key.** Back in Keys, open the old key and Revoke. If step 7 failed, stop here and send me the
   output of the providers call; the old key is still live and nothing is broken.
9. **Tell me it is done** and I will re-run the provider check and record SEC-01 as closed.

## What can go wrong, and what it looks like

| Symptom | Cause | Fix |
|---|---|---|
| `apple:false` after deploy | BEGIN or END line lost in the paste | re-paste the whole file, both lines included |
| `apple:false` with a complete PEM | `APPLE_KEY_ID` does not match the new key | set it to the ten characters in the file name |
| Provider true, sign-in returns `invalid_client` | the key is not enabled for the right App ID | re-open the key, Configure, select the correct primary App ID |
| Sign-in loops back with an error toast | redirect mismatch | the return URL must be `https://thinkzet.com/api/auth/apple/callback` |

## Rollback

Nothing is destructive until step 8. Before that, restoring the old `APPLE_PRIVATE_KEY` and `APPLE_KEY_ID` in Railway
returns you to the current working state in one deploy.

## After this

SEC-01 is closed and every exposed key has been replaced: Resend, Google client secret, Stripe secret, Stripe webhook
secret and Apple `.p8`. The next founder action is the Adzuna app id and key, which opens the DE, GB, CH and US salary
pools in one pass.
