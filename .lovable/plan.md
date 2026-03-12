

## Problem

The "Set Password & Join" button fails with a non-2xx status code. Edge function logs from today still show:

```
Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};':"|<>?,./`~.
```

This means either:
1. The edge function wasn't properly redeployed with the latest code, so the old permissive regex (`/[^A-Za-z0-9]/`) is still running -- it accepts spaces/unicode as "special characters" but Supabase Auth rejects them
2. The backtick character in the regex template literal causes parsing issues in the Deno runtime

## Root Cause

The Supabase project has a strict password policy enabled that requires characters from all four categories. The edge function's server-side validation and Supabase Auth's policy must align perfectly. The safest fix is to **remove the redundant server-side regex check** in the edge function (let Supabase Auth be the authority) and properly surface the Auth error to the user.

## Plan

### 1. Simplify edge function password validation
**File**: `supabase/functions/accept-invitation/index.ts` (lines 36-48)

Remove the complex regex validation and keep only the length check. Let Supabase Auth handle the character-class validation -- its error message is already being forwarded (from the previous fix). This eliminates any regex mismatch issues:

```typescript
// Keep only length check
if (password.length < 12) {
  return new Response(JSON.stringify({ error: "Password must be at least 12 characters" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
// Remove the regex check entirely -- Supabase Auth enforces its own policy
```

### 2. Improve client-side error display
**Files**: `src/pages/AcceptLicense.tsx`, `src/pages/SetPassword.tsx`

When the edge function returns an error, show the actual error message from the response instead of a generic fallback. The `supabase.functions.invoke` call wraps non-2xx responses, so we need to parse the response body:

- In `AcceptLicense.tsx` (line 160-166): Parse `fnError.context` or response body to extract the actual error message
- In `SetPassword.tsx` (line 166-172): Same treatment

### 3. Redeploy the `accept-invitation` edge function
Ensure the latest code is deployed so the fix takes effect.

### 4. Verify existing pending invitations still have valid tokens
Query shows 2 pending licenses (`dev@email.com` and `darren.allison@build-iq.co.uk`). These should still work with the fix since the tokens exist.

## Technical Notes
- RLS policies are correct: both `user_licenses` and `team_invitations` have anon SELECT policies for token-based lookups
- The `invite-member` and `send-license-invitation` functions correctly use the production URL (`https://f-gas-shield.lovable.app`)
- The cross-flow token detection (redirect between `/accept-license` and `/set-password`) is in place

