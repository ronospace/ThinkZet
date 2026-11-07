#!/bin/bash
# Karyvo — start everything.
#   1. the app server
#   2. the Stripe webhook forwarder (if the CLI is installed)
# Ctrl-C stops both.
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example to .env and fill in your keys."
  exit 1
fi

node server.cjs &
APP_PID=$!
trap 'kill $APP_PID 2>/dev/null' EXIT

if command -v stripe >/dev/null 2>&1 && grep -q '^STRIPE_SECRET_KEY=sk_' .env; then
  KEY=$(grep '^STRIPE_SECRET_KEY=' .env | cut -d= -f2)
  echo "Starting Stripe webhook forwarder…"
  stripe listen --api-key "$KEY" \
    --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed \
    --forward-to 127.0.0.1:4173/api/billing/webhook &
  STRIPE_PID=$!
  trap 'kill $APP_PID $STRIPE_PID 2>/dev/null' EXIT
fi

wait
