

## Problem

Two parallel invitation systems exist:
- `invite-member` edge function → emails link to `/set-password?token=...` → `SetPassword.tsx` (fixed, works without session)
- `send-license-invitation` edge function → generates magic link → redirects to `/accept-license?token=...` → `AcceptLicense.tsx` (broken, requires session from expired magic link)

The user clicked an email from the `send-license-invitation` flow. The magic link expired (1-hour Supabase default), so `AcceptLicense.tsx` sees no session and shows the error.

## Solution

Unify the flows: make `send-license-invitation` use the same pattern as the fixed `invite-member` -- direct token URLs, no magic links. Rewrite `AcceptLicense.tsx` to work like `SetPassword.tsx` (no session required, fetch license by token, call `accept-invitation` edge function).

### Changes

**1. `supabase/functions/send-license-invitation/index.ts`** (modify)
- Remove magic link generation (`generateLink` calls on lines 158-206)
- Create auth user with `createUser` + `email_confirm: true` (if not exists) instead of `generateLink`
- Build direct URL: `${appUrl}/set-password?token=TEAM_INVITATION_TOKEN` (not the license token)
- Before sending email, look up or create a matching `team_invitations` record for this license so the `/set-password` flow handles everything
- Alternatively, keep using `/accept-license` but make it work without a session (option B below)

**Option B (simpler, chosen):** Keep `/accept-license` route but update both the edge function and page to not require magic links:

**1. `supabase/functions/send-license-invitation/index.ts`** (modify)
- Remove magic link generation entirely
- Create user with `adminClient.auth.admin.createUser` + `email_confirm: true` if not exists
- Use direct URL: `${appUrl}/accept-license?token=${license.token}` (the license token, no magic link)
- Send branded email with this direct link

**2. `src/pages/AcceptLicense.tsx`** (rewrite)
- Remove session requirement (lines 48-71)
- On mount: fetch license details by token using anon key (needs RLS policy)
- Show company name, role, and password form (no session needed)
- On submit: call `accept-invitation` edge function OR a new `accept-license` function
- Since the existing `accept-invitation` edge function works with `team_invitations` tokens, we need to either:
  - (a) Create a matching team_invitation when sending license invitations, OR
  - (b) Extend `accept-invitation` to also handle license tokens

**Chosen approach:** Extend `accept-invitation` edge function to accept a `license_token` parameter alongside the existing `token` parameter. When `license_token` is provided, validate against `user_licenses` instead of `team_invitations`.

### Detailed changes:

**1. `supabase/functions/accept-invitation/index.ts`** (modify)
- Accept either `{ token, password }` (team invitation) or `{ license_token, password }` (license invitation)
- When `license_token` is provided: look up `user_licenses` by token, validate status is "pending", find auth user by email, set password, update profile company_id, insert roles/memberships, mark license as "active" with user_id

**2. `supabase/functions/send-license-invitation/index.ts`** (modify)
- Remove all `generateLink` / magic link logic
- Create auth user with `createUser({ email, email_confirm: true })` if not exists
- Use direct URL: `${appUrl}/accept-license?token=${token}` (license token)
- Keep the same branded email HTML but with direct link

**3. `src/pages/AcceptLicense.tsx`** (rewrite)
- Remove session check (lines 48-71)
- Fetch license by token using anon query (no session needed)
- Show password form directly
- On submit: call `accept-invitation` with `{ license_token: token, password }`
- On success: sign in with returned email + password, redirect to dashboard

**4. Database migration**
- Add RLS policy on `user_licenses` for anon SELECT by token (similar to team_invitations policy)
- Policy: allow anon to SELECT where token matches (limited columns for security)

