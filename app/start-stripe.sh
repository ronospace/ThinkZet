#!/bin/bash
# Forwards Stripe webhooks to the local server and prints the signing secret.
# The secret it prints is temporary and changes each run; paste it into .env.
cd "$(dirname "$0")"
KEY=$(grep '^STRIPE_SECRET_KEY=' .env | cut -d= -f2)
stripe listen \
  --api-key "$KEY" \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed \
  --forward-to 127.0.0.1:4173/api/billing/webhook
