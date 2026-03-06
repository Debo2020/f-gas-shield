

# Single Source of Truth for Team Members

## Problem
Both `OrganisationTeamTab` and `OrganisationLicensesTab` (inside Settings) independently fetch team members from the `profiles` table with separate queries. This leads to duplicated logic and potentially inconsistent data between the two views.

## Solution

Create a shared hook `useTeamMembers` that fetches and caches team member data once, then pass it down from the `Organisation` page to both tabs.

### 1. New hook: `src/hooks/useTeamMembers.ts`

A custom hook that:
- Fetches all company profiles (id, user_id, full_name, email, avatar_url)
- Fetches all user_roles for those members
- Fetches all user_licenses for the company
- Fetches all addon_licenses for the company
- Fetches pending team_invitations
- Exposes: `members`, `invitations`, `isLoading`, `refetch()`
- Each member includes: roles, licenseStatus, licenseType, licenseId, hasGasAddon

### 2. Update `Organisation.tsx`

- Call `useTeamMembers()` at the page level
- Pass the shared data down as props to `OrganisationTeamTab` and `OrganisationSettingsTab`

### 3. Update `OrganisationTeamTab`

- Remove internal `fetchTeamData` and all member/invitation state
- Accept `members`, `invitations`, `isLoading`, `refetch` as props
- Keep action handlers (invite, delete, toggle) but call `refetch` from props after mutations

### 4. Update `OrganisationLicensesTab`

- Remove `fetchAllMembers`, `allMembers`, `loadingMembers` state
- Accept shared members data as props
- Derive `TeamMemberWithLicense[]` from the shared data using `useMemo`
- Call `refetch` from props after license assignment/gas toggle

### 5. Update `OrganisationSettingsTab`

- Pass through the shared team data props to `OrganisationLicensesTab`

This ensures one fetch, one cache, consistent data across both views, and any mutation in either tab triggers a single shared refetch.

