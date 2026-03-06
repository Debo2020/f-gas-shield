

# Show Pending Invitations in Manage Team Licenses Dialog

## Problem
The "Manage Team Licenses" dialog only shows registered team members (profiles). Pending invitations (people invited but who haven't accepted yet) are invisible, preventing owners from pre-assigning license types.

## Approach

### 1. Pass invitations to OrganisationLicensesTab

**`OrganisationLicensesTab.tsx`**: Add `invitations` to the props interface (from `PendingInvitation[]`).

**`OrganisationSettingsTab.tsx`**: Pass invitations through to the licenses tab.

**`Organisation.tsx`**: Already passes `teamData.invitations` to team tab; also pass to settings tab.

### 2. Show pending invitations in the dialog table

After the registered members list, render a section for pending invitations that don't already have a license record. Each row shows:
- **Member column**: Email + "Invited as [role]" badge
- **License column**: Either "Not Assigned" or show pre-assigned license info if a `user_licenses` record with matching email exists in the `licenses` array
- **Gas Add-on column**: Disabled (not applicable until accepted)
- **Action column**: License type selector + "Pre-assign" button for invitations without a license

### 3. Pre-assign license for pending invitation

Use the existing `assignLicense(email, type, false)` flow (the email-based path) which creates a `user_licenses` record with status "pending" and the chosen email. This already exists in `useLicenses`.

Cross-reference invitations against `licenses` (from `useLicenses`) by email to determine which invitations already have a pre-assigned license.

### Files changed
- `src/components/organisation/OrganisationLicensesTab.tsx` — accept invitations prop, render them in dialog
- `src/components/organisation/OrganisationSettingsTab.tsx` — pass invitations prop through
- `src/pages/Organisation.tsx` — pass invitations to settings tab (if not already)

