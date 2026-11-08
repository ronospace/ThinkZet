# Deploying ThinkZet to Hetzner

Two files do the whole job. `deploy/provision.sh` is idempotent: safe to re-run.

---

## 1. Create the server

| Field | Value |
|---|---|
| Type | CX22 (2 vCPU, 4 GB RAM, 40 GB SSD) |
| Location | Nuremberg (nbg1) |
| Image | Ubuntu 24.04 LTS |
| Networking | IPv4 and IPv6 |
| SSH key | ed25519 |
| Backups | enabled |

Firewall: 22 from your IP only, 80 and 443 from anywhere, ICMP from anywhere.

---

## 2. Point DNS at it

At your registrar, for `thinkzet.com`:

```
A     @      <server IPv4>
AAAA  @      <server IPv6>
CNAME www    thinkzet.com
```

Propagation is usually minutes. Verify before continuing:

```
dig +short thinkzet.com
```

It must return your server IP. Caddy cannot issue a certificate until it does.

---

## 3. Provision

```
ssh root@<server-ip>
curl -fsSL https://raw.githubusercontent.com/ronospace/MirrorSpread/master/deploy/provision.sh -o provision.sh
bash provision.sh
```

Or copy the file up first:

```
scp deploy/provision.sh root@<server-ip>:/root/
ssh root@<server-ip> 'bash /root/provision.sh'
```

What it does, in order:

1. System update, base packages
2. Node 22 from NodeSource
3. Caddy with automatic HTTPS
4. Non-root `thinkzet` service user
5. Clone the repo to `/opt/thinkzet`
6. Create `app/.env` at mode 600 (preserved on re-run)
7. systemd unit with sandboxing, `Restart=always`
8. Caddyfile with HSTS and JSON logs
9. ufw: 22, 80, 443 only
10. fail2ban on SSH, 5 tries then 1 hour
11. Unattended security upgrades
12. Nightly SQLite backup, 14 days retained

---

## 4. Fill in the keys

```
ssh root@<server-ip>
nano /opt/thinkzet/app/.env
```

Required:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ALLOW_LIVE=true
RESEND_API_KEY=re_...
EMAIL_FROM=ThinkZet AI <brief@thinkzet.com>
APP_URL=https://thinkzet.com
PORT=4173
```

Then:

```
systemctl restart thinkzet
journalctl -u thinkzet -n 30 --no-pager
```

---

## 5. Verify

```
curl -s https://thinkzet.com/api/health
curl -s https://thinkzet.com/api/config
curl -s https://thinkzet.com/api/launch
```

`/api/launch` must read `ready: true`. If it does not, the response names the blocker.

Then run the full suites against production:

```
cd /opt/thinkzet
BASE=https://thinkzet.com node scripts/check.cjs
BASE=https://thinkzet.com node scripts/browser-check.cjs
```

---

## 6. Resend domain verification

Resend, Domains, Add Domain, `thinkzet.com`. Add the SPF, DKIM and DMARC records it
shows you at your registrar. Once verified, set `EMAIL_FROM` to `brief@thinkzet.com` and
restart. Until then Resend only delivers to your own address.

---

## 7. Permanent Stripe webhook

Stripe, Developers, Webhooks, Add endpoint:

```
https://thinkzet.com/api/billing/webhook
```

Six events: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
`invoice.payment_failed`.

Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and restart. Then delete the old
trycloudflare endpoint, which will stop working when the tunnel closes.

---

## Operating it

```
systemctl status thinkzet          # is it running
journalctl -u thinkzet -f          # live logs
systemctl restart thinkzet         # after an .env change
cd /opt/thinkzet && git pull && systemctl restart thinkzet   # deploy
ls -la /opt/thinkzet/backups       # nightly dumps
```

---

## What is deliberately simple

| Choice | Why it is fine now | When to change |
|---|---|---|
| SQLite on local disk | One writer is plenty under ~10k users | At write contention, move to Postgres |
| Single process | 57 MB RAM, 4 background schedulers | At ~50k users, split workers |
| No container | One host, one service, no orchestration cost | When there are two hosts |
| Backups to local disk | Survives app failure | Move off-box before real revenue |
