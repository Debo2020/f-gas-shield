

# Fix: Stripe Secret Key Misconfigured

## Problem
The `STRIPE_SECRET_KEY` backend secret is set to a Stripe **webhook signing secret** (`whsec_...`) instead of the actual Stripe **API secret key** (`sk_live_...` or `sk_test_...`). This causes every checkout attempt to fail with "Invalid API Key."

## Fix
Update the `STRIPE_SECRET_KEY` secret to the correct Stripe API key:

1. Go to your [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
2. Copy the **Secret key** (starts with `sk_live_` or `sk_test_`)
3. I will use the `add_secret` tool to prompt you to enter the correct value

No code changes are needed — the edge functions are correct; only the secret value is wrong.

