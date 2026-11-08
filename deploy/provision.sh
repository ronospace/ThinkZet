#!/usr/bin/env bash
# ThinkZet - one-shot server provisioning for Ubuntu 24.04 LTS on Hetzner.
#
# Run as root on a fresh server:
#   bash provision.sh
#
# Idempotent: safe to re-run. It will not clobber an existing .env or database.

set -euo pipefail

DOMAIN="${DOMAIN:-thinkzet.com}"
APP_DIR="/opt/thinkzet"
APP_USER="thinkzet"
REPO="${REPO:-https://github.com/ronospace/MirrorSpread.git}"
NODE_MAJOR=22

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

log "System update and base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git ufw fail2ban unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https

log "Node ${NODE_MAJOR} from NodeSource"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
node -v

log "Caddy (automatic HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -qq
  apt-get install -y -qq caddy
fi

log "Service user ${APP_USER}"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

log "Application directory ${APP_DIR}"
mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --quiet origin
  git -C "$APP_DIR" reset --hard origin/master
else
  git clone --quiet "$REPO" "$APP_DIR"
fi
mkdir -p "$APP_DIR/data"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "Environment file"
if [ ! -f "$APP_DIR/app/.env" ]; then
  cp "$APP_DIR/app/.env.example" "$APP_DIR/app/.env" 2>/dev/null || : > "$APP_DIR/app/.env"
  chmod 600 "$APP_DIR/app/.env"
  chown "$APP_USER:$APP_USER" "$APP_DIR/app/.env"
  echo "  created $APP_DIR/app/.env - fill in the keys, then: systemctl restart thinkzet"
else
  echo "  existing .env preserved"
fi

log "systemd unit"
cat > /etc/systemd/system/thinkzet.service <<UNIT
[Unit]
Description=ThinkZet AI - career intelligence platform
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/app
Environment=NODE_ENV=production
Environment=PORT=4173
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/node ${APP_DIR}/app/server.cjs
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=thinkzet

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${APP_DIR}/data ${APP_DIR}/app/.env
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable thinkzet >/dev/null
systemctl restart thinkzet
sleep 3
systemctl is-active thinkzet

log "Caddy reverse proxy for ${DOMAIN}"
cat > /etc/caddy/Caddyfile <<CADDY
${DOMAIN}, www.${DOMAIN} {
    encode zstd gzip
    reverse_proxy 127.0.0.1:4173 {
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
    }
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
    log {
        output file /var/log/caddy/thinkzet.log
        format json
    }
}
CADDY
mkdir -p /var/log/caddy
chown -R caddy:caddy /var/log/caddy
systemctl restart caddy
sleep 2
systemctl is-active caddy

log "Firewall"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ufw status numbered | head -8

log "fail2ban for SSH"
cat > /etc/fail2ban/jail.d/sshd.local <<'JAIL'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
JAIL
systemctl enable fail2ban >/dev/null
systemctl restart fail2ban

log "Unattended security upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'UPG'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
UPG

log "Nightly database backup"
cat > /etc/cron.daily/thinkzet-backup <<'BK'
#!/bin/sh
set -e
DIR=/opt/thinkzet/backups
mkdir -p "$DIR"
sqlite3 /opt/thinkzet/data/careeros.db ".backup '$DIR/careeros-$(date +%F).db'" 2>/dev/null || \
  cp /opt/thinkzet/data/careeros.db "$DIR/careeros-$(date +%F).db"
find "$DIR" -name 'careeros-*.db' -mtime +14 -delete
BK
chmod +x /etc/cron.daily/thinkzet-backup
apt-get install -y -qq sqlite3

log "Done"
echo
echo "  app      : http://127.0.0.1:4173 (systemctl status thinkzet)"
echo "  logs     : journalctl -u thinkzet -f"
echo "  caddy    : https://${DOMAIN} (systemctl status caddy)"
echo "  env      : ${APP_DIR}/app/.env"
echo "  backups  : ${APP_DIR}/backups (14 days retained)"
echo
echo "  Next: fill in ${APP_DIR}/app/.env, then systemctl restart thinkzet"
