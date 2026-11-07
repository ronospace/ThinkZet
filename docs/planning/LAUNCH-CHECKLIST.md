# The day it goes public

One page. Do these in order. Ignore everything else.

---

## T-minus (before anyone sees it)

- [ ] **Rotate the Stripe key.** It has been in a chat log. Developers → API keys → Roll.
- [ ] **Deploy** (see `app/DEPLOY.md`). VPS or container — not your laptop.
- [ ] **Set `APP_URL`** to the real domain. Every email link depends on it.
- [ ] **Add `RESEND_API_KEY`.** Without it, nobody receives a brief.
- [ ] **Permanent Stripe webhook** at `https://yourdomain.com/api/billing/webhook`.
- [ ] **Check the Launch screen** in the app. It should say *"Send it to twenty people."*

## T-0 (first twenty people)

Send the link to twenty people you can name. Not a broadcast. In the AI-talent Discords,
in relocation groups, to people who will reply.

**What to say:** not "check out my startup". Say:

> *"I built something that tells you what your profile is actually worth from live postings.
> It takes a minute. Tell me if the number is wrong."*

That last sentence is the whole ask. It invites a correction, which is a conversation.

## T+1 day

- [ ] Open the **Leads** screen. Anyone with a gap above 10% is your first follow-up.
- [ ] Open the **Funnel** screen. Read the biggest-leak sentence. Do not fix anything else.
- [ ] Read the **Outbox**. Verify the welcome email reads well with a real person's numbers.

## T+1 week

- [ ] Which step leaks worst? Fix only that.
- [ ] Did anyone reach the radar and open an opportunity? If not, activation is broken, not acquisition.
- [ ] Did anyone report an outcome? That is the first moat data point.
- [ ] Did anyone pay? If not, the paywall is in the wrong place — not the price.

## What to ignore for the first month

- Feature requests from people who have not paid
- Design polish
- Anything that is not "more people reaching the rate gap"
- Your own urge to rebuild something that works

## The three numbers that matter

| Metric | Why | Where |
|---|---|---|
| **Rate checks completed** | Is the hook landing at all | Funnel |
| **Lead capture rate** | Do people give an email after seeing a number | Leads |
| **First opportunity opened** | Does it become a tool, not a report | Funnel |

Everything else is commentary.
