## Merchant Loyalty / Referral Codes — 20% off for 3 months (annual Basic & Premium)

### How it works for the new customer
1. New customer signs up via `/get-started` and chooses Basic or Premium **annual**.
2. On Stripe Checkout, they see a "Add promotion code" field and enter the merchant's code (e.g. `ACME20`).
3. Stripe applies a 20% discount that repeats for the first 3 monthly equivalents of the annual term — implemented as a **20% off coupon, duration=repeating, duration_in_months=3** restricted to the Basic Annual and Premium Annual prices.
4. If the merchant's redemption cap is reached, Stripe rejects the code automatically (we set `max_redemptions` on the Stripe promotion code, kept in sync with our DB).
5. Enterprise tier and monthly plans never expose the field (we only enable `allow_promotion_codes` for the two annual price IDs).

### How it works for the merchant / partner
A new **Partners** area (admin-only at first):
- **Create a partner** — name, contact email, optional logo, commission % (informational), redemption cap, expiry date, active toggle.
- **Auto-generate a code** — readable format `{SLUG}20` (editable). One Stripe coupon + one Stripe promotion code created behind the scenes, both tagged with `partner_id` in metadata.
- **Dashboard per partner**:
  - Code, status, cap, redemptions used / remaining, expiry
  - List of referred signups (company name, plan, signup date, MRR, status: trial / active / churned)
  - Totals: signups, active subscriptions, gross MRR attributed, estimated commission
- **Owner-only**: a top-level Partners admin page lists every partner with rolled-up stats and CSV export.
- Later (out of scope for this build): self-serve partner portal where partners log in with their own credentials. We will design the schema to support it.

### Attribution flow
- `stripe-webhook` already handles `checkout.session.completed`. We extend it: when a session has `total_details.breakdown.discounts[].discount.promotion_code`, we look up the matching `partner_referrals` row by Stripe promo code id and insert a `partner_redemptions` row linked to the new `company_id`, plus increment `redemptions_used`.
- `check-subscription` is unchanged — discount is purely a Stripe construct.

### Technical details

**New tables (all RLS, owner-only writes, service_role for webhook):**
- `partners` — id, name, contact_email, logo_url, commission_pct, notes, is_active, created_by, timestamps.
- `partner_codes` — id, partner_id, code (unique, uppercase), stripe_coupon_id, stripe_promotion_code_id, max_redemptions, redemptions_used (default 0), expires_at, is_active, timestamps.
- `partner_redemptions` — id, partner_code_id, partner_id, company_id (fk companies), stripe_subscription_id, stripe_customer_id, tier, plan_interval, mrr_pennies, status (`trialing|active|canceled|past_due`), redeemed_at, canceled_at.

GRANTs: `authenticated` (SELECT only, gated by `has_role(auth.uid(),'owner')` in policies); `service_role` ALL.

**New edge functions:**
- `create-partner-code` — owner-only. Creates Stripe coupon (`percent_off=20, duration=repeating, duration_in_months=3, applies_to.products=[basic_prod, premium_prod]`) and promotion code (`code, max_redemptions, expires_at, restrictions.first_time_transaction=true`). Persists both ids.
- `update-partner-code` — owner-only. Toggle active / adjust cap / expiry → mirrors to Stripe (`promotionCodes.update`, coupon stays immutable).
- Extend `stripe-webhook` — new handler block for promotion-code attribution on `checkout.session.completed` and status sync on `customer.subscription.updated|deleted`.

**Existing code changes (small):**
- `supabase/functions/create-checkout/index.ts` — when `priceId` is one of the two annual price IDs **and** tier ≠ enterprise, add `allow_promotion_codes: true` to the session. No price-bag changes; the existing metered overage block stays as-is (annual already skips overage).
- `src/components/landing/PricingSection.tsx` — small "Have a partner code? Apply it at checkout." note under the annual toggle on Basic/Premium cards.

**New UI:**
- `src/pages/admin/Partners.tsx` — list + create dialog (owner only, route guarded).
- `src/pages/admin/PartnerDetail.tsx` — single partner view with code, stats, redemption table, CSV export.
- Sidebar entry "Partners" visible only to owners.

### What's explicitly out of scope (this build)
- Partner self-serve login / portal
- Automated commission payouts
- Stacking with other coupons (Stripe will reject; we won't try to merge)
- Monthly plans — discount only applies to 12-month annual Basic & Premium, Enterprise excluded

### Pricing/contract note
"12-month contract" = annual Stripe price (existing `price_1SnLZ9F9KjzL48Nkwq1dmZOH` Basic, `price_1SnLZZF9KjzL48Nk6IJW7XR9` Premium). Discount runs first 3 months only, then full price for the remaining 9 months of the annual term — exactly matching "20% off first 3 months on a 12-month contract".
