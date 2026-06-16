---
name: Partner Loyalty Codes
description: Merchant referral programme giving 20% off for 3 months on annual Basic/Premium plans
type: feature
---
20% off coupon, duration=repeating, duration_in_months=3, restricted to annual Basic (prod_Tkr6tR0MQAMZ4S) and Premium (prod_Tkr6z4LLzOAMfG) products only — Enterprise and monthly plans excluded.

Edge functions: `create-partner-code` (owner-only, creates Stripe coupon + promotion code, persists to partners/partner_codes), `update-partner-code` (toggle active, mirrors to Stripe), and `stripe-webhook` extended to attribute redemptions on `checkout.session.completed` via expanded `total_details.breakdown.discounts.discount.promotion_code`.

Tables: `partners`, `partner_codes` (unique code, stripe_coupon_id, stripe_promotion_code_id, max_redemptions, redemptions_used), `partner_redemptions` (unique on stripe_subscription_id). All owner-only RLS; service_role for webhook writes.

UI: New "Partners" tab in Organisation hub (owner only) — `src/components/organisation/OrganisationPartnersTab.tsx`. `create-checkout` sets `allow_promotion_codes: true` only for annual price IDs.
