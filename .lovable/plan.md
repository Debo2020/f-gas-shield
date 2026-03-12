

## Investigation Summary

I traced the full invitation flow and found **two root causes** for the accept-license page showing "Invalid or expired invitation":

### Root Cause 1: License invitation emails may link to the wrong domain

`send-license-invitation` (line 157) uses `origin || APP_URL || "https://ftrack.lovable.app"`. The `origin` comes from `window.location.origin`, which on the preview is `id-preview--0b33a0ab...lovable.app`. If the user sends an invitation while on the preview, the email contains a preview URL. The published domain is `https://f-gas-shield.lovable.app` and should always be used for invitation emails.

### Root Cause 2: Token mismatch between flows

There are **two separate invitation flows** using different tokens:
- **Team invitations** (`invite-member` → `team_invitations` table → `/set-password?token=...`)
- **License invitations** (`send-license-invitation` → `user_licenses` table → `/accept-license?token=...`)

If a user clicks a team invitation link but somehow lands on `/accept-license`, the token won't match any `user_license` row, showing "Invalid or expired."

### Root Cause 3: No diagnostic info in error state

The `AcceptLicense` page shows a generic "Invalid or expired invitation" for all failures -- token not found, query error, or network issue. This makes debugging impossible.

---

## Plan

### 1. Fix `send-license-invitation` to always use published URL

Replace the dynamic `origin` fallback with the published domain for emails. The link should always go to the production app, not the preview.

**File**: `supabase/functions/send-license-invitation/index.ts`
- Change: `const appUrl = "https://f-gas-shield.lovable.app";` (ignore `origin` parameter for email links)
- Redeploy function

### 2. Fix `invite-member` to always use published URL

Same issue -- use the published domain, not `APP_URL` fallback.

**File**: `supabase/functions/invite-member/index.ts`  
- Line 196: Change to `const appUrl = "https://f-gas-shield.lovable.app";`
- Redeploy function

### 3. Improve AcceptLicense error handling

**File**: `src/pages/AcceptLicense.tsx`
- Add `console.error` with the actual error details before showing the generic message
- If `licenseData` exists but status is not "pending", show a more specific message
- Add a fallback check: if token exists in `team_invitations` instead, redirect to `/set-password?token=...`

### 4. Add cross-flow token detection on SetPassword page

**File**: `src/pages/SetPassword.tsx`
- If the team_invitation query returns no data, check `user_licenses` by token and redirect to `/accept-license?token=...` if found

This ensures that regardless of which link format the user clicks, they end up on the correct page.

