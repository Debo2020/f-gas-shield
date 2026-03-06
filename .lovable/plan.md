

# Show Up-to-Date Team Member List in Assign License Dialog

## Problem
The unlicensed members list is fetched once on component mount and only re-fetches when the `licenses` array changes. If team members were added recently (e.g. via the Team tab), the Assign License dialog may show a stale list.

## Solution

**File: `src/components/organisation/OrganisationLicensesTab.tsx`**

1. Extract `fetchUnlicensedMembers` into a standalone `useCallback` function (similar to `fetchGasAddonLicenses`)
2. Call it when the assign dialog opens (`assignDialogOpen` becomes `true`) in addition to the existing mount/license-change trigger
3. This ensures the dropdown always shows the latest team members

### Changes
- Move the fetch logic from the `useEffect` into a `useCallback` named `fetchUnlicensedMembers`
- Keep the existing `useEffect` calling it on mount and when `licenses` changes
- Add a second `useEffect` that triggers `fetchUnlicensedMembers()` when `assignDialogOpen` transitions to `true`

This is a small, targeted change -- no new components or database changes needed.

