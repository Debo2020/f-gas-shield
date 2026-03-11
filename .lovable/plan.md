

## Problem

The `companies` table has **no anon SELECT policy**. When an unauthenticated user (the invited person) opens the invitation link, the Supabase client queries `team_invitations` or `user_licenses` with a join to `companies`. The main table query succeeds (anon policies exist), but the `companies` join returns `null` because RLS blocks anon access.

In **SetPassword.tsx line 87**, `companyData` is `null`, and accessing `companyData.id` throws an uncaught error. The catch block on line 99 sets the generic error "Failed to load invitation details."

In **AcceptLicense.tsx line 84**, optional chaining (`?.name`) prevents a crash, but the same underlying issue exists.

Additionally, the **anon SELECT policies** on `team_invitations` and `user_licenses` are overly broad (`qual: true`), exposing all rows to unauthenticated users. These should be scoped to only allow lookups by token.

## Solution

### 1. Database migration -- scoped anon policies

**Add a limited anon SELECT policy on `companies`** so the join resolves:
```sql
CREATE POLICY "Anon can view company name by id"
  ON public.companies FOR SELECT TO anon
  USING (true);
```
(Acceptable because `companies` only contains business names/addresses, not sensitive data. Alternatively, scope to companies with pending invitations, but that adds complexity.)

**Tighten the existing overly-broad anon policies:**
```sql
-- Drop and recreate team_invitations anon policy
DROP POLICY "Anyone can view invitation by token" ON public.team_invitations;
CREATE POLICY "Anon can view invitation by token"
  ON public.team_invitations FOR SELECT TO anon
  USING (token IS NOT NULL);

-- Drop and recreate user_licenses anon policy  
DROP POLICY "Anyone can view license by token" ON public.user_licenses;
CREATE POLICY "Anon can view license by token"
  ON public.user_licenses FOR SELECT TO anon
  USING (token IS NOT NULL);
```
(Note: PostgREST requires the policy to allow reading the row for `.eq("token", value)` to work. The policy can't filter by a specific token value since the user provides it as a query parameter. Keeping `token IS NOT NULL` is reasonable -- rows without tokens won't be exposed.)

### 2. SetPassword.tsx -- add null safety for company join

Line 87-98: handle `companyData` being `null`:
```typescript
const companyData = data.companies as unknown as { id: string; name: string } | null;

setInvitation({
  id: data.id,
  email: data.email,
  role: data.role as AppRole,
  expires_at: data.expires_at,
  company: {
    id: companyData?.id || "",
    name: companyData?.name || "Your Organization",
  },
});
```

### 3. AcceptLicense.tsx -- already handles null (no change needed)

Line 84 uses `?.name` so it already defaults to "Unknown Company" gracefully.

