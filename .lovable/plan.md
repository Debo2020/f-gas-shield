

# Add License Management with Natural Gas Addon Toggle

## Current State
- The Settings tab has a simple subscription summary card and embeds `OrganisationAddonsTab` for gas addon management
- A full-featured `OrganisationLicensesTab` component already exists (with assign, add licenses, toggle, revoke) but is not currently used
- Gas addon licenses are managed separately in `OrganisationAddonsTab`

## Plan

### 1. Replace simple subscription card with full license management

**File: `src/components/organisation/OrganisationSettingsTab.tsx`**
- Remove the inline subscription card (lines 326-403)
- Import and embed `OrganisationLicensesTab` in its place, under the "Licenses & Subscriptions" heading
- Keep `OrganisationAddonsTab` below for the gas subscription card (subscribe/unsubscribe to the module)

### 2. Add Natural Gas checkbox to the license table

**File: `src/components/organisation/OrganisationLicensesTab.tsx`**
- Add a "Gas Add-on" column to the licenses table
- For each assigned (active) license row, show a `Checkbox` that indicates whether the user also has a Natural Gas addon license
- Fetch existing `addon_licenses` for the company and cross-reference by `user_id`
- When the checkbox is toggled ON: insert an `addon_licenses` row for that user (type `natural_gas`, status `active`)
- When toggled OFF: delete the `addon_licenses` row for that user
- Show the per-user cost next to the checkbox: "+£15/mo"
- Only show checkbox if the company has an active gas addon subscription (`companyHasAddon`)

### 3. Add Natural Gas checkbox to the Assign License dialog

**File: `src/components/organisation/OrganisationLicensesTab.tsx`**
- Add a checkbox in the assign dialog: "Include Natural Gas Compliance (+£15/user/month)"
- When assigning a license with the checkbox ticked, also insert an `addon_licenses` record
- Show a cost summary at the bottom of the dialog

### 4. Data fetching

**File: `src/components/organisation/OrganisationLicensesTab.tsx`**
- Import `useGasAddon` to check if company has active gas subscription
- Add a query to fetch all `addon_licenses` where `addon_type = 'natural_gas'` for the company
- Build a `Set<string>` of user IDs with gas licenses for quick lookup in the table

### UI Structure (license table)
```text
| User          | Type     | Gas Add-on | Status | Assigned    | Actions |
|---------------|----------|------------|--------|-------------|---------|
| John Smith    | Engineer | [x] +£15  | Active | 01 Mar 2026 | ...     |
| Jane Doe      | Manager  | [ ] +£15  | Active | 15 Feb 2026 | ...     |
```

### Files Modified
1. `src/components/organisation/OrganisationSettingsTab.tsx` -- swap simple card for `OrganisationLicensesTab`
2. `src/components/organisation/OrganisationLicensesTab.tsx` -- add gas addon checkbox column + assign dialog checkbox

No database or edge function changes needed. Uses existing `addon_licenses` table and `useGasAddon` hook.

