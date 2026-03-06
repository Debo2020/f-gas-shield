

# Add-on Management via Organisation Module

## Overview
Move the Natural Gas add-on access control from a simple company-level toggle to a per-user licensing model managed through a new "Add-ons" tab in the Organisation hub. Owners/managers can purchase gas add-on licenses, assign them to specific team members, and manage them alongside existing platform licenses.

## Database Changes

### New table: `addon_licenses`
Tracks per-user assignment of add-on licenses (mirrors `user_licenses` pattern):
- `id`, `company_id`, `addon_type` (addon_type enum), `user_id` (nullable, for unassigned), `email` (nullable)
- `status` (active, disabled, pending), `assigned_by`, `assigned_at`, `created_at`, `updated_at`
- RLS: company_id-scoped, owners/managers can create/update, owners can delete, all company members can view

### Modify `useGasAddon` hook
Currently checks if the **company** has the add-on active. Change it to also check if the **current user** has an assigned gas add-on license. The company-level `company_addons` record still gates overall availability, but individual access requires a license row in `addon_licenses`.

## Organisation Module Changes

### New tab: "Add-ons" (Flame icon)
- Position it after Suppliers, before Documents in `TAB_CONFIG`
- Accessible to: `owner`, `manager`
- Shows the Natural Gas add-on card with:
  - Current subscription status (from `company_addons`)
  - License count stats (total purchased, assigned, available)
  - "Subscribe" button if not yet subscribed (triggers `create-addon-checkout`)
  - License assignment table (same pattern as `OrganisationLicensesTab`)
  - Assign/revoke gas licenses to team members

### New component: `OrganisationAddonsTab.tsx`
- Reads `company_addons` for subscription status
- Reads `addon_licenses` for per-user assignments
- Shows add-on card with features list, price, and status
- License management table: user name, email, status, assign/revoke actions
- "Assign License" dialog: dropdown of unlicensed team members
- "Add Licenses" button: calls `update-license-count` or equivalent for addon quantity

## Navigation Changes

### `AppLayout.tsx`
Update the gas certs nav condition: instead of just `hasGasAddon` (company-level), check if the **current user** has a gas addon license OR is an owner/manager of a company with the addon active.

### `useGasAddon` hook update
```typescript
// Returns both company-level and user-level status
return {
  hasGasAddon: companyAddonActive && (userHasLicense || isOwner),
  companyHasAddon: companyAddonActive,
  userLicense: userAddonLicense,
};
```

## Files to Create
| File | Purpose |
|---|---|
| `src/components/organisation/OrganisationAddonsTab.tsx` | Add-ons management tab with subscription + per-user license assignment |

## Files to Modify
| File | Changes |
|---|---|
| `src/pages/Organisation.tsx` | Add "Add-ons" tab to TAB_CONFIG, import and render OrganisationAddonsTab |
| `src/hooks/useGasAddon.ts` | Add per-user license check alongside company-level check |
| `src/components/layout/AppLayout.tsx` | Update nav condition for gas certs visibility |
| `src/pages/GasCertificates.tsx` | Update paywall to mention per-user licensing |

## Migration SQL
- Create `addon_licenses` table with RLS policies
- Policies follow same pattern as `user_licenses`: company_id-scoped, owner/manager can manage

## Implementation Order
1. Database migration: create `addon_licenses` table with RLS
2. Update `useGasAddon` hook to check per-user licenses
3. Create `OrganisationAddonsTab` component
4. Add "Add-ons" tab to Organisation page
5. Update navigation and paywall logic

