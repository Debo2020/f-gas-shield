

## Problem

The invitation email contains a Supabase **magic link** URL (generated via `adminClient.auth.admin.generateLink`). Magic links expire after **1 hour** (Supabase default). The invitation record has a 7-day expiry, but the actual clickable link dies after 60 minutes -- so most users see "link expired."

The SetPassword page also requires an active session (from the magic link) before showing the password form. If the magic link expired, there's no session, and the user sees an error with no way to proceed.

## Solution

Remove the dependency on magic links entirely. Instead:

1. **Email links go directly to `/set-password?token=INVITATION_TOKEN`** (not through Supabase's magic link URL)
2. **New edge function `accept-invitation`** handles everything server-side: validates the invitation token, sets the user's password, assigns company/role, marks invitation accepted, and returns the user's email for client-side sign-in
3. **SetPassword page** no longer requires a pre-existing session -- it shows the password form immediately based on the invitation token, then calls the edge function and signs the user in

### Changes Required

**1. Edge Function: `supabase/functions/accept-invitation/index.ts`** (new)
- Accepts `{ token, password }`
- Validates invitation token (exists, not expired, not accepted)
- Finds or confirms the auth user by email
- Sets password via `adminClient.auth.admin.updateUserById`
- Confirms email via admin API if not confirmed
- Updates profile `company_id`, inserts `user_roles`, inserts `organization_memberships`, creates `user_licenses` record
- Marks invitation `accepted_at`
- Returns `{ email }` for client sign-in

**2. `supabase/config.toml`** -- add `[functions.accept-invitation]` with `verify_jwt = false`

**3. `supabase/functions/invite-member/index.ts`** (modify)
- Remove the `generateLink` magic link logic (lines 200-204, 228-242)
- Set `email_confirm: true` in `createUser` so account is pre-verified
- Use the direct URL `${appUrl}/set-password?token=${invitation.token}` as `actionUrl` instead of the magic link

**4. `src/pages/SetPassword.tsx`** (rewrite)
- Remove session check -- no session needed
- On mount: fetch invitation details via public query using the token (already works since RLS allows reading by token)
- Show company name, role, and password form immediately
- On submit: call `supabase.functions.invoke("accept-invitation", { body: { token, password } })`
- On success: sign in with `supabase.auth.signInWithPassword({ email, password })` and redirect to `/dashboard`

### Security
- The `accept-invitation` function uses service role to perform privileged operations
- Invitation token is a 32-byte hex string (cryptographically secure)
- Token is single-use (marked accepted after use)
- 7-day expiry is enforced server-side
- Password validation happens both client-side and server-side

