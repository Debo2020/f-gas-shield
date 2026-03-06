

# Auto-Update Stripe Gas Addon Subscription Quantity

## Problem
When gas addon licenses are added/removed for individual users, the Stripe subscription quantity for the gas addon isn't updated, so billing doesn't reflect actual usage.

## Approach

### 1. Create new edge function: `update-addon-license-count`

**File: `supabase/functions/update-addon-license-count/index.ts`**

Similar to the existing `update-license-count` function but for addon subscriptions:
- Authenticate user, get their company ID
- Count active `addon_licenses` rows for the company where `addon_type = 'natural_gas'`
- Find the gas addon Stripe subscription via `company_addons.stripe_subscription_id`
- If no subscription ID in DB, fall back to searching Stripe subscriptions for the gas product ID (`prod_U66CcCxINGyl6y`)
- Update the Stripe subscription item quantity to match the new count
- Update `company_addons` record if needed

### 2. Update `OrganisationLicensesTab.tsx` -- call the new function after toggling

**In `handleToggleGasAddon`:**
- After inserting or deleting the `addon_licenses` row, call `supabase.functions.invoke("update-addon-license-count")`
- Show appropriate error toast if the Stripe update fails (but keep the local change)

**In `handleAssignToMember`:**
- After inserting the gas addon license during assignment, also call the same edge function

### Files
1. **New:** `supabase/functions/update-addon-license-count/index.ts`
2. **Edit:** `src/components/organisation/OrganisationLicensesTab.tsx` -- add calls after gas addon toggle/assign

No database changes needed.

