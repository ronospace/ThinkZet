# Deploying ThinkZet to Railway

Railway needs no identity verification. It is the fallback while Hetzner reviews the account.
Same code, same database, same behaviour. About 5 USD/month.

---

## 1. Create the project

1. Go to https://railway.app and sign in with GitHub.
2. **New Project**, then **Deploy from GitHub repo**.
3. Choose `ronospace/MirrorSpread`. Authorise Railway to read the private repo if asked.

Railway reads `deploy/railway.json` automatically and sets the start command to
`node app/server.cjs` with a health check on `/api/health`.

## 2. Add a persistent volume

The database must survive a redeploy. Without this, every deploy wipes every user.

1. Open the service, then **Variables** tab is not enough, go to **Settings**.
2. **Volumes**, then **Add Volume**.
3. Mount path: `/app/data`
4. Size: 1 GB is plenty.

The app writes `data/careeros.db` relative to the repository root, so `/app/data` is the
correct mount.

## 3. Set the environment

Service, **Variables**, **Raw Editor**, paste and fill:

```
PORT=4173
HOST=0.0.0.0
APP_URL=https://<your-railway-domain>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ALLOW_LIVE=true
RESEND_API_KEY=re_...
EMAIL_FROM=ThinkZet AI <brief@thinkzet.com>
```

`HOST=0.0.0.0` matters: Railway routes traffic to the container, not to localhost.

## 4. Generate the domain

Settings, **Networking**, **Generate Domain**. You get something like
`mirrorspread-production.up.railway.app`.

Put that in `APP_URL` and redeploy.

## 5. Point thinkzet.com at it

In Railway: Settings, Networking, **Custom Domain**, add `thinkzet.com` and `www.thinkzet.com`.

Railway shows a CNAME target. At your registrar:

```
CNAME  @    <target>.up.railway.app
CNAME  www  <target>.up.railway.app
```

Some registrars refuse a CNAME on the apex. If yours does, use their ALIAS or ANAME record,
or move DNS to Cloudflare (free) which supports CNAME flattening at the apex.

## 6. Verify

```
curl -s https://thinkzet.com/api/health
curl -s https://thinkzet.com/api/launch
```

`/api/launch` must read `ready: true`.

Then the full suites against production:

```
BASE=https://thinkzet.com node scripts/check.cjs
BASE=https://thinkzet.com node scripts/browser-check.cjs
```

## 7. Stripe webhook

Stripe, Developers, Webhooks, Add endpoint:

```
https://thinkzet.com/api/billing/webhook
```

Six events: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
`invoice.payment_failed`.

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`, redeploy, then delete the old
trycloudflare endpoint.

## 8. Resend domain

Resend, Domains, Add Domain, `thinkzet.com`. Add the SPF, DKIM and DMARC records at your
registrar. Once verified, set `EMAIL_FROM` to `brief@thinkzet.com`.

---

## What Railway does not give you

| Missing | Impact | Mitigation |
|---|---|---|
| Systemd-style sandboxing | Process runs as root in the container | Acceptable; the container is the boundary |
| fail2ban | No SSH surface to protect | Not applicable, no SSH |
| Local nightly backup | Volume snapshots are provider-managed | Enable Railway backups, or add a cron service later |
| Automatic security patching of the OS | Base image updates on redeploy | Redeploy monthly |

For the first hundred users, none of these matter. For a paid product with real revenue, move
to the Hetzner setup in `deploy/README.md`, which has all four.
