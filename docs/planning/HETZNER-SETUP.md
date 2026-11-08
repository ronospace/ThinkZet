# Hetzner setup - exact choices

**Measured on the running app:** 740 KB of code, 17 MB database, 0 npm dependencies,
57 MB resident memory, Node 22+ required (uses the built-in `node:sqlite`).

---

## What to create

| Field | Value |
|---|---|
| **Server type** | **CX22** - 2 vCPU, 4 GB RAM, 40 GB SSD |
| **Location** | **Nuremberg (nbg1)** |
| **Image / OS** | **Ubuntu 24.04 LTS** |
| **Networking** | Public IPv4 and IPv6 |
| **SSH keys** | Your existing key, or create one now |
| **Backups** | Enable (20% surcharge, about 1 EUR/month) |
| **Volume** | none needed |
| **Firewall** | create one, see below |

**Cost:** about 4.50 EUR/month plus backups.

### Why CX22

The app needs about 60 MB RAM and one process. CX22 gives 4 GB and 2 vCPU, roughly 50x
headroom for the first ten thousand users, and it is the cheapest tier that is not
shared-vCPU-throttled for a long-running Node process.

### Why Nuremberg

Germany means GDPR data residency by default, low latency to EU users, and it matches the
EU-first positioning of the product. Falkenstein (fsn1) is equally fine.

### Why Ubuntu 24.04 LTS

NodeSource publishes Node 22 packages for it, systemd and Caddy are current, and security
updates run to 2029. Do not pick 22.04.

---

## Firewall rules

| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | TCP | 22 | your IP only |
| Inbound | TCP | 80 | anywhere |
| Inbound | TCP | 443 | anywhere |
| Inbound | ICMP | - | anywhere |
| Outbound | any | any | anywhere |

Restricting port 22 to your IP is the single most effective hardening step. Ports 80 and 443
must be open for Caddy to obtain and renew TLS certificates.

---

## SSH requirements

**Key type:** ed25519. Do not use RSA.

If you do not have one:

    ssh-keygen -t ed25519 -C "thinkzet-hetzner" -f ~/.ssh/thinkzet_ed25519

Paste the public key (`thinkzet_ed25519.pub`) into Hetzner when creating the server. Never
send the private key to anyone, including me.

**Access I need:** either add my session public key to `authorized_keys` on the server, or
give me the server IP and add the key I will generate and show you.

I will never ask for your private key or your Hetzner password.

---

## What I will do once the server exists

1. Create a non-root `deploy` user with sudo, disable root SSH login.
2. Install Node 22 from NodeSource, plus `git`, `caddy`, `ufw`, `fail2ban`.
3. Clone the repository, write `.env` with the live keys, `chmod 600`.
4. Run the app under systemd so it survives reboots and crashes.
5. Put Caddy in front for automatic HTTPS on `thinkzet.com`.
6. Point DNS: `A` record to the IPv4, `AAAA` to the IPv6, `www` CNAME to the apex.
7. Verify the domain in Resend, switch `EMAIL_FROM` to `brief@thinkzet.com`.
8. Create the permanent Stripe webhook at `https://thinkzet.com/api/billing/webhook`.
9. Run `scripts/check.cjs` and `scripts/browser-check.cjs` against the live URL.
10. Set up a nightly database backup.

---

## What to send me

    IPv4:
    IPv6:
    SSH user:      (root, for first login)
    SSH port:      22
    Key added:     yes
    Domain DNS:    thinkzet.com at which registrar

Do not send the root password. Key access only.
