# What I need from you, and exactly how to get it

Three things. Each takes a few minutes. Nothing here costs money.

---

## 1. Email delivery - RESEND_API_KEY

**Why:** without it the morning brief and the four onboarding emails pile up in the
outbox. Nobody receives anything, and retention has no mechanism.

**Steps:**

1. Go to https://resend.com and sign up (free tier: 3,000 emails a month, 100 a day).
2. In the left sidebar choose **API Keys**, then **Create API Key**.
3. Name it `mirrorspread-prod`, permission **Sending access**, and create it.
4. Copy the key. It starts with `re_` and is shown only once.
5. Send it to me.

**One caveat:** Resend will only send from a domain you have verified. Until you verify
one, use their test sender. I will set `EMAIL_FROM` to `onboarding@resend.dev` so it works
immediately, and switch it to your domain later.

To verify a domain later: Resend, **Domains**, **Add Domain**, add the DNS records they
show you, wait for verification, then set `EMAIL_FROM` to `brief@yourdomain.com`.

---

## 2. AI copilot - a model key

**Why:** the copilot and cover letters are currently composed deterministically. They are
honest and grounded, but they are not generative.

**Pick one. Any of these works, the code does not change.**

### Option A - OpenAI (simplest)
1. https://platform.openai.com and sign in.
2. **API keys**, **Create new secret key**, name it `mirrorspread`.
3. Copy the key. It starts with `sk-`.
4. Send it to me with the word "openai".

### Option B - Anthropic
1. https://console.anthropic.com and sign in.
2. **API Keys**, **Create Key**.
3. Copy the key. It starts with `sk-ant-`.
4. Send it to me with the word "anthropic".

### Option C - Google Gemini
1. https://aistudio.google.com/apikey
2. **Create API key**.
3. Copy it. It starts with `AIza`.
4. Send it to me with the word "gemini".

**Note:** all three require a payment method on file even for small usage. Expect a few
cents per hundred copilot messages.

---

## 3. Live Stripe - only when you are ready to take real money

**Why:** test mode works end to end today. Flipping to live means real cards, real charges
and real refunds, so it should be deliberate.

**Steps:**

1. In Stripe, complete **Activate payments** (business details, bank account).
2. Developers, **API keys**, reveal the **Secret key**. It starts with `sk_live_`.
3. Send it to me and say "go live".
4. I will set `STRIPE_ALLOW_LIVE=true` and swap the key.

**Also do this regardless:** Developers, API keys, **Roll** the current test key. It has
appeared in a chat log.

---

## Optional - a permanent URL instead of the tunnel

The tunnel works today and costs nothing, but the URL changes on restart. For a permanent
address you need somewhere to run a Node process:

- A VPS at roughly 5 EUR a month (Hetzner, DigitalOcean), or
- A container host (Railway, Fly, Render), or
- The paid plan here, which keeps it running with the app closed.

`app/DEPLOY.md` has the exact steps for each. Tell me which and I will write the config.

---

## How to send secrets safely

Paste them here and I will write them into `app/.env`, which is gitignored and chmod 600.
They never enter the repository. If you prefer, put them in the file yourself and tell me
to restart.

After each key I will verify with a real send or a real generation, not just a config check.
