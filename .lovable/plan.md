

## Problem

The edge function logs show the exact error repeatedly:

```
[ACCEPT-INVITATION] ERROR: Failed to update user password - {"error":"Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};':\"|<>?,./`~."}
```

Supabase Auth has a built-in password policy that requires special characters from a **specific set**: `!@#$%^&*()_+-=[]{};':"|<>?,./`~`

The edge function validates special characters with `/[^A-Za-z0-9]/`, which accepts **any** non-alphanumeric character (e.g. spaces, `£`, `€`, Unicode). If the user's "special character" is outside Supabase's allowed set, the edge function validation passes but Supabase Auth rejects it.

The edge function then returns HTTP 500 with the generic message "Failed to set password", which the frontend displays as "returns a non-2xx status code."

## Plan

### 1. Fix `accept-invitation` edge function error handling

**File**: `supabase/functions/accept-invitation/index.ts`

In both `handleLicenseInvitation` and `handleTeamInvitation`, change the password update error response to **forward the actual Supabase Auth error message** instead of the generic "Failed to set password":

```typescript
// Before:
return new Response(JSON.stringify({ error: "Failed to set password" }), {
  status: 500, ...

// After:
return new Response(JSON.stringify({ error: updateError.message }), {
  status: 400, ...
```

Use status 400 (not 500) since it's a validation failure, not a server error.

### 2. Update client-side special character validation

**Files**: `src/pages/AcceptLicense.tsx`, `src/pages/SetPassword.tsx`

Update the special character regex and hint text to match Supabase's allowed set:

```typescript
// Before:
if (!/[^A-Za-z0-9]/.test(password))

// After:
if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(password))
```

Update the hint text to say: "Must include uppercase, lowercase, number, and a special character (!@#$%^&* etc.)"

### 3. Redeploy the `accept-invitation` edge function

This ensures:
- Users get a clear error message if their password is rejected
- Client-side validation catches invalid special characters before submission
- The specific allowed characters are communicated in the UI

