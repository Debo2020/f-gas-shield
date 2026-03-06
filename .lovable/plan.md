

## Fix: Team Members Not Showing in Gas Add-on License Dropdown

### Root Cause

The dropdown only queries the `profiles` table for registered users. The current company only has the owner as a registered user. The two team members (`darren@mysolus.co.uk`, `dev@email.com`) are still **pending invitations** — they haven't accepted yet, so they have no profile records. After filtering out owners, the dropdown is correctly empty from a code perspective, but wrong from a UX perspective.

### Fix

Update the `unlicensedMembers` query in `OrganisationAddonsTab.tsx` to also include pending invitations (from `team_invitations` where `accepted_at IS NULL`), so managers can pre-assign gas add-on licenses by email — matching the same pattern already used for `user_licenses` pre-assignment.

Update the `handleAssignLicense` function to handle two cases:
1. **Registered member selected** — insert with `user_id` (existing behavior)
2. **Pending invitation selected** — insert with `email` only, `user_id = null`

Update the `Select` dropdown to visually distinguish between registered members and pending invitations (using the same amber styling pattern from the Licenses tab).

### Changes

**File: `src/components/organisation/OrganisationAddonsTab.tsx`**
- Modify the `unlicensedMembers` query to also fetch pending invitations from `team_invitations` and merge them into the selectable list
- Add a `type` field (`"member"` or `"invitation"`) to distinguish selection types
- Update `handleAssignLicense` to insert with `email` only when assigning to a pending invitation
- Update the `SelectItem` rendering to show "(Invited)" badge for pending invitations

No database changes needed — `addon_licenses` already supports `user_id = null` with `email` set.

