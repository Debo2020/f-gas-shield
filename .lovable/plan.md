

## Fix: Stripe Checkout Flow — Profile & License Issues

### Root Cause Analysis

From the network logs, the Stripe checkout **does** return a valid URL and redirects to Stripe. The actual issues are upstream:

1. **Profile row doesn't exist** — The `create_company_for_current_user` RPC does `UPDATE profiles SET company_id = ... WHERE user_id = auth.uid()`, but no profile row exists for the newly signed-up user. The UPDATE silently affects 0 rows. This means `get_user_company_id()` returns NULL for this user.

2. **Owner license insert fails with 403** — Because the profile has no `company_id` (step 1 failed), the RLS check `company_id = get_user_company_id(auth.uid())` evaluates to `company_id = NULL`, which always fails.

3. **Downstream effects** — Without a profile or license, the user appears unsubscribed and may hit errors after returning from Stripe.

### Fix

**1. Update `create_company_for_current_user` DB function** (migration)

Add profile creation + owner license creation inside the SECURITY DEFINER function so it all happens atomically, bypassing RLS:

- Before updating profiles, INSERT the profile row if it doesn't exist (using auth metadata for `full_name`, `email`)
- After creating the company, also insert the owner license into `user_licenses`
- This eliminates the client-side `user_licenses` insert that fails on RLS

**2. Update `src/pages/SetupCompany.tsx`**

- Remove the client-side `user_licenses` insert (lines 95-102) — now handled by the RPC
- Remove the `refreshProfile` call failure path — the RPC now guarantees the profile exists

### Files

| Action | File |
|--------|------|
| Create | Migration SQL — update `create_company_for_current_user` to upsert profile + create owner license |
| Modify | `src/pages/SetupCompany.tsx` — remove client-side license insert |

