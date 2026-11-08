# Live now - public URL

**https://fellowship-leasing-event-investments.trycloudflare.com**

Verified from outside the machine: `/api/health` 200, `/` 200, `/api/public/rate-check` 200.

---

## What this is

A Cloudflare quick tunnel pointed at `localhost:4173`. It gives a real HTTPS URL with no
account and no cost, which is exactly right for showing the product to twenty people.

## What it is not

- The URL changes every time the tunnel restarts.
- It dies when this machine sleeps or the process stops.
- It is not a deployment. It is a window.

That is fine for the first twenty users. It is not fine for the first two hundred.

---

## Stripe webhook for this URL

In Stripe, Developers, Webhooks, add endpoint:

```
https://fellowship-leasing-event-investments.trycloudflare.com/api/billing/webhook
```

Events: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

Then put the signing secret in `app/.env` as `STRIPE_WEBHOOK_SECRET` and restart.

Alternatively, keep using the CLI forwarder (`./start-stripe.sh`) which needs no dashboard
endpoint at all.

---

## What to send to people

Not "check out my startup". Send this:

> I built something that tells you what your profile is actually worth from live postings.
> It takes a minute. Tell me if the number is wrong.

That last sentence is the ask. It invites a correction, which is a conversation, which is a
user.

---

## What to watch, in order

1. **Rate checks completed** - is the hook landing at all. Funnel screen.
2. **Lead capture rate** - of people who saw a number, how many gave an email. Leads screen.
3. **First opportunity opened** - does it become a tool rather than a report. Funnel screen.
4. **Biggest leak** - the Funnel screen names it in one sentence. Fix only that.

Ignore everything else for a week.

---

## To stop it

```
pkill -f cloudflared
```

## To restart it

```
cd careeros/app && node server.cjs &
cloudflared tunnel --url http://localhost:4173
```
