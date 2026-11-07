# Deploying CareerOS

The app is a single Node process with a SQLite database. No build step, no dependencies.
That makes deployment simple — the real choice is who owns the machine.

---

## What it needs

| Requirement | Value |
|---|---|
| Runtime | Node 22+ (uses the built-in `node:sqlite`) |
| Memory | ~200 MB |
| Disk | ~100 MB (database grows with ingestion) |
| Port | one HTTP port (default 4173) |
| Persistence | the `data/` directory must survive restarts |
| Outbound | HTTPS to the four source APIs, Stripe, and your email provider |

---

## Option 1 — Run it here, share a tunnel (fastest, no account)

Good for: showing it to 20 people this week.

```
./start.sh                                        # terminal 1
cloudflared tunnel --url http://localhost:4173    # terminal 2
```

You get a `https://something.trycloudflare.com` URL. Then in Stripe:

```
https://something.trycloudflare.com/api/billing/webhook
```

Caveat: the URL changes each time, and it dies when your machine sleeps.

---

## Option 2 — A small VPS (permanent, around 5 EUR/month)

Good for: the first 100 users.

1. Install Node 22 on the server.
2. Clone the repo, `cd careeros/app`, copy `.env.example` to `.env`, fill in the keys,
   and set `APP_URL` to your domain.
3. Start it under a supervisor so it survives reboots (pm2, systemd, or s6).
4. Put nginx or Caddy in front for TLS, proxying to `127.0.0.1:4173`.
5. In Stripe, create a permanent webhook endpoint at
   `https://yourdomain.com/api/billing/webhook`.

Backups matter here. The SQLite file is the product's memory — snapshot `data/careeros.db`
nightly to object storage.

---

## Option 3 — A container platform (Railway / Fly / Render)

Good for: not thinking about servers.

- Build: none (plain Node)
- Start command: `node app/server.cjs`
- Volume: mount a persistent disk at `/app/data`
- Env: everything from `.env`

---

## Before real users, in order

1. Move the database when writes contend. SQLite is fine to roughly 10k users; a single
   writer is the limit. The schema is already written as if it were Postgres.
2. Rotate the Stripe key. The current one has appeared in a chat log.
3. Set `APP_URL` to the real domain, or every email link points at localhost.
4. Add email. Without `RESEND_API_KEY`, briefs pile up in the outbox and nobody gets one.
5. Watch the outbox for the first week. It shows exactly what users received.
6. Watch the Funnel screen. It names the biggest leak in one sentence.

---

## What is deliberately NOT production-ready yet

| Item | Why it is fine for now | When it must change |
|---|---|---|
| SQLite single file | One writer is plenty under ~10k users | At write contention |
| In-process scheduler | Restarts lose one cycle | When a missed brief matters |
| No API rate limiting | Only reachable by people you invite | At public launch |
| No CDN or cache headers | Pages are dynamic and small | At meaningful traffic |
| Logs to stdout | Readable and enough | When you need to query them |

Being explicit about this is the point: these are known, bounded, and each has a trigger.
