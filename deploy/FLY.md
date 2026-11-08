# Deploying ThinkZet to Fly.io

Fly runs a container on a small VM with a persistent volume. Closest to a VPS in behaviour,
without the VPS. About 5 USD/month. No identity verification beyond a card.

---

## 1. Install and sign in

```
brew install flyctl
fly auth signup      # or: fly auth login
```

## 2. Create the app

From the repository root:

```
fly launch --no-deploy --name thinkzet --region fra --dockerfile deploy/Dockerfile
```

`fra` is Frankfurt. `ams` (Amsterdam) is equally fine. Answer **no** to Postgres and Redis;
the app uses SQLite on a volume.

## 3. Create the volume

The database must survive restarts and deploys.

```
fly volumes create thinkzet_data --region fra --size 1
```

Then confirm `fly.toml` contains:

```
[mounts]
  source = "thinkzet_data"
  destination = "/app/data"
```

## 4. Set secrets

```
fly secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_PRICE_MONTHLY=price_1UZXla41m9e00I4DeCR2mWNe \
  STRIPE_PRICE_ANNUAL=price_1UZXlb41m9e00I4DRtPTxZw6 \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_ALLOW_LIVE=true \
  RESEND_API_KEY=re_... \
  EMAIL_FROM="ThinkZet AI <brief@thinkzet.com>" \
  APP_URL=https://thinkzet.com
```

## 5. Deploy

```
fly deploy
```

The image is `node:22-slim` plus the source. There is no `npm install` and no build step,
so the deploy is seconds, not minutes.

## 6. Point thinkzet.com at it

```
fly certs add thinkzet.com
fly certs add www.thinkzet.com
```

Fly prints the DNS records to create at your registrar:

```
A     @      <the IPv4 Fly shows>
AAAA  @      <the IPv6 Fly shows>
CNAME www    <app>.fly.dev
```

Wait for the certificate to show `Issued`:

```
fly certs show thinkzet.com
```

## 7. Verify

```
curl -s https://thinkzet.com/api/health
curl -s https://thinkzet.com/api/launch
```

`/api/launch` must read `ready: true`.

Then both suites against production:

```
BASE=https://thinkzet.com node scripts/check.cjs
BASE=https://thinkzet.com node scripts/browser-check.cjs
```

## 8. Stripe webhook

Stripe, Developers, Webhooks, Add endpoint:

```
https://thinkzet.com/api/billing/webhook
```

Six events: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
`invoice.payment_failed`.

Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy. Delete the old
trycloudflare endpoint afterwards.

## 9. Resend domain

Resend, Domains, Add Domain, `thinkzet.com`. Add the SPF, DKIM and DMARC records at your
registrar. Once verified, `EMAIL_FROM` already points at `brief@thinkzet.com`.

---

## Operating it

```
fly status                 # is it running
fly logs                   # live logs
fly ssh console            # shell into the VM
fly secrets list           # which secrets are set (values hidden)
fly deploy                 # redeploy after a code change
fly volumes list           # volume and free space
```

## Backups

Fly volumes are not automatically backed up. Add a nightly snapshot from your machine:

```
fly ssh console -C "sqlite3 /app/data/careeros.db \".backup '/app/data/backup-$(date +%F).db'\""
fly sftp get /app/data/backup-$(date +%F).db ./backups/
```

Or run the Hetzner setup, which includes a cron backup and 14-day retention.

---

## Comparison with the other two

| | Railway | Fly.io | Hetzner CX22 |
|---|---|---|---|
| Setup time | 10 min | 20 min | 45 min |
| Cost/month | ~5 USD | ~5 USD | ~4.50 EUR |
| Verification | none | card only | identity review |
| Persistent volume | yes | yes | yes, local disk |
| SSH access | no | yes | yes |
| fail2ban, systemd sandbox | no | no | yes |
| Nightly backup built in | no | no | yes |
| Best for | fastest start | container control | long-term production |
