

## Replace "Add Site" with "Add Client" on Dashboard

**File:** `src/pages/Dashboard.tsx`

### Change
- Line 197-200: Replace the "Add Site" button with an "Add Client" button that navigates to `/organisation?tab=clients&action=new`
- Update the icon import if needed (currently uses `Plus` which is fine)

Single-line change, no new dependencies.

