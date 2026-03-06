

# Fix: Gas Add-on Activation After Stripe Checkout

## Problem Found

The `check-addon` edge function exists and correctly upserts the `company_addons` record from Stripe, but **it is never called from the frontend**. After Stripe checkout redirects back to `/gas-certificates?addon=success`, nothing happens -- the `company_addons` table stays empty and the addon appears inactive.

The `company_addons` table currently has **zero records** for the user's company (`0332b489-78b1-404c-b358-69613e9d31d5`), confirming the function was never invoked.

Additionally, the dexie TypeScript error (`TS1540`) is a pre-existing type declaration issue unrelated to our changes -- it can be suppressed via `tsconfig.app.json`.

## Plan

### 1. Call `check-addon` on GasCertificates page load and after checkout redirect

In `src/pages/GasCertificates.tsx`:
- Add a `useEffect` that detects the `addon=success` query parameter
- When detected (or on page load when addon is not yet active), call `supabase.functions.invoke('check-addon')` to sync Stripe subscription state into `company_addons`
- After successful call, invalidate the `gas-addon` query to refresh the hook state
- Remove the `addon=success` param from URL after processing

### 2. Call `check-addon` periodically in `useGasAddon` hook

In `src/hooks/useGasAddon.ts`:
- When `companyHasAddon` is `false` but user is an owner, automatically invoke `check-addon` to detect if a Stripe subscription was completed
- This ensures the addon activates even if the user navigates elsewhere after checkout

### 3. Call `check-addon` on Organisation Add-ons tab

In `src/components/organisation/OrganisationAddonsTab.tsx`:
- When the tab loads and `companyHasAddon` is `false`, invoke `check-addon` to sync state
- This covers the scenario where an owner subscribes via Pricing and then navigates to Organisation to manage licenses

### 4. Fix dexie TypeScript error

In `tsconfig.app.json`:
- Add `"skipLibCheck": true` to suppress the `TS1540` error from `dexie.d.ts`

## Files to Modify

| File | Change |
|---|---|
| `src/pages/GasCertificates.tsx` | Add `useEffect` to call `check-addon` on `addon=success` redirect and when addon not active |
| `src/hooks/useGasAddon.ts` | Add auto-sync: call `check-addon` when owner visits and addon appears inactive |
| `src/components/organisation/OrganisationAddonsTab.tsx` | Call `check-addon` on tab load when addon inactive |
| `tsconfig.app.json` | Add `skipLibCheck: true` |

## Implementation Order

1. Fix `tsconfig.app.json` (build error)
2. Add `check-addon` call to `GasCertificates.tsx` (post-checkout activation)
3. Add `check-addon` auto-sync to `useGasAddon.ts` (background activation)
4. Add `check-addon` call to `OrganisationAddonsTab.tsx` (admin view activation)

