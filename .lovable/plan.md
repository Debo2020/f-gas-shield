

# Redesign Assign License Dialog to Show All Active Members

## Problem
The current "Assign License" dialog only shows unlicensed members in a dropdown. The user wants to see all active team members with their current license and gas addon status, and be able to assign/update from one place.

## Approach

**File: `src/components/organisation/OrganisationLicensesTab.tsx`**

### 1. Fetch all company members (not just unlicensed)

Add a new `fetchAllMembers` callback that loads all profiles in the company (excluding owners), along with their license and gas addon status. This replaces the current `fetchUnlicensedMembers` call when the dialog opens.

Each member will have:
- `full_name`, `email`, `user_id`
- `hasLicense` (boolean) + `licenseType` if assigned
- `hasGasAddon` (boolean)

### 2. Redesign the dialog UI

Replace the current dropdown-based assign dialog with a scrollable table/list showing:

| Member | License Status | Gas Add-on | Action |
|--------|---------------|------------|--------|
| John Smith (john@...) | Active (Engineer) | ✓ Enabled | — |
| Jane Doe (jane@...) | Not Assigned | — | [Assign] button with type selector |
| Bob (bob@...) | Active (Manager) | ✗ Disabled | [Toggle gas] |

- Members with no license: show an "Assign" button that triggers inline license type selection (engineer/manager) and assigns immediately
- Members with a license: show their status badge and license type
- Gas Add-on column: show a checkbox toggle (same as main table) for licensed members, hidden for unlicensed
- Dialog title updated to "Manage Team Licenses"

### 3. Inline assignment flow

When clicking "Assign" for an unlicensed member:
- Show a small inline select for license type (engineer/manager)
- Include gas addon checkbox
- Call existing `assignLicense()` + gas addon insert logic
- Refresh the member list in-place after assignment

### Changes summary
- New state: `allMembers` array with enriched member data
- New `fetchAllMembers` callback combining profiles, licenses, and addon_licenses queries
- Replaced dialog content from dropdown to a scrollable list with status + actions
- Removed the old `unlicensedMembers` state and `fetchUnlicensedMembers` (no longer needed)
- Keep the "Assign License" button in the header; it now opens this enhanced dialog

No database changes needed. Single file edit.

