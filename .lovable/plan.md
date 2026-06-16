# Back-office Partners & Loyalty Scheme

Currently the "Partners" tab is exposed to every tenant's company owner, which both leaks cross-tenant data and isn't what you want. We'll move it into a true platform back office gated to the FTrack platform owner (d.allison@solusgsc.com), and keep the merchant/Stripe flow that's already in place.

## Access model

Introduce a **platform admin** concept separate from tenant `app_role`:

- New table `public.platform_admins` (`user_id` PK → `auth.users`, `granted_at`).
- SECURITY DEFINER helper `public.is_platform_admin(uuid)`.
- Seed `d.allison@solusgsc.com` as the sole platform admin.
- `useAuth` exposes `isPlatformAdmin`.
- Future admins added by inserting a row (no UI for now).

## Database changes

- Create `platform_admins` + `is_platform_admin()`.
- Rewrite RLS on `partners`, `partner_codes`, `partner_redemptions` so only `is_platform_admin(auth.uid())` can SELECT/INSERT/UPDATE/DELETE (service_role keeps full access for the webhook).
- Seed Darren by email lookup from `auth.users`.

## Remove the tenant-facing surface

- Drop the `partners` tab from `src/pages/Organisation.tsx` and its `TAB_CONFIG` entry.
- `OrganisationPartnersTab.tsx` is moved/renamed into the back office (below); old import removed.

## New back-office area

- New route `/admin/partners` (lazy-loaded in `App.tsx`), wrapped in a `PlatformAdminGuard` that redirects non-admins to `/dashboard`.
- New page `src/pages/admin/AdminPartners.tsx` rendering the existing partners dashboard (KPIs, partner table, recent redemptions, create/pause flows) inside `AppLayout` with an "Admin · Partners & Loyalty" header.
- New `src/components/admin/PlatformAdminGuard.tsx` using `isPlatformAdmin` + loading state.
- Add a discreet "Admin" link in the user menu (only visible when `isPlatformAdmin` is true) pointing at `/admin/partners`.

## Edge functions (small hardening, no behaviour change)

- `create-partner-code` and `update-partner-code`: replace the current `has_role('owner')` JWT check with a `platform_admins` lookup so only Darren can mint/pause codes. Stripe coupon (20% off, 3 months, annual Basic & Premium product restriction), optional `max_redemptions` and `expires_at` logic stays as-is.
- `stripe-webhook` attribution → no change (writes via service role; restriction is annual-only enforced at coupon level + checkout, as already configured).
- `create-checkout`: confirms `allow_promotion_codes: true` is set only for annual Basic/Premium (already the case from previous step) — no edit needed unless we spot a gap when wiring.

## Files to add / edit

Add:
- `supabase/migrations/<new>.sql` — platform_admins table + grants + RLS + helper fn + RLS rewrite for partner tables + seed.
- `src/components/admin/PlatformAdminGuard.tsx`
- `src/pages/admin/AdminPartners.tsx`

Edit:
- `src/hooks/useAuth.tsx` — expose `isPlatformAdmin`.
- `src/App.tsx` — register `/admin/partners` route.
- `src/pages/Organisation.tsx` — remove `partners` tab + import.
- `src/components/organisation/OrganisationPartnersTab.tsx` — relocate logic into `AdminPartners.tsx` (delete old file).
- User menu component (whichever currently renders the avatar dropdown) — conditional "Admin" entry.
- `supabase/functions/create-partner-code/index.ts` and `update-partner-code/index.ts` — platform-admin check.

## Out of scope

- No partner self-service portal, no commission payouts, no email to partners on redemption — happy to add later.
- No UI to grant/revoke platform admin (insert manually for now).

## Verification

- Sign in as a tenant owner → no Partners tab, `/admin/partners` redirects to `/dashboard`.
- Sign in as Darren → Admin link appears, dashboard loads, create a test code, run a £0 Stripe test checkout with annual Basic, confirm `partner_redemptions` row appears with correct MRR and `active` status.
