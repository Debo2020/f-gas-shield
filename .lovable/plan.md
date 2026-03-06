

## Production Readiness Security Fix Plan

### Problem
The security scan found that **all RLS policies across every table** default to `TO public` role instead of `TO authenticated`. This means unauthenticated users could theoretically query these tables via the Supabase REST API, though `auth.uid()` checks in the policy expressions would return NULL and block most access. However, this is a defense-in-depth issue — policies should explicitly restrict to authenticated users only.

Additionally, there is a pre-existing TypeScript build error from the `dexie` package (`TS1540: namespace vs module keyword`), which needs suppression since we cannot modify third-party code.

### Changes

#### 1. Database Migration: Restrict All RLS Policies to `authenticated` Role

A single migration will drop and recreate every RLS policy across all tables, changing from `TO public` (implicit default) to `TO authenticated`. This affects **~70 policies** across these tables:

- `profiles`, `user_roles`, `companies`, `company_subscriptions`, `company_certificates`, `company_addons`
- `team_invitations`, `user_licenses`, `addon_licenses`
- `sites`, `equipment`, `inspections`, `documents`
- `clients`, `client_users`
- `suppliers`, `refrigerant_cylinders`, `refrigerant_movements`
- `gas_certificates`, `gas_certificate_appliances`
- `leak_checks`, `organization_memberships`, `audit_log`, `ai_credit_usage`
- `qualification_documents`

The `contact_rate_limits` table already has correct restrictive policies and the `profile_type_config` SELECT policy (`USING (true)`) intentionally allows public reads for role configuration lookups — this will remain as-is since it contains no PII.

The `ai_credit_usage` INSERT policy (`WITH CHECK (true)`) is used by the service role from edge functions — this will be changed to `TO authenticated` but the service role bypasses RLS anyway, so it remains functional.

#### 2. Fix Dexie TypeScript Build Error

Add `skipLibCheck: true` to `tsconfig.app.json` (it's already in the root `tsconfig.json` but needs to be in the app config that actually compiles `src/`). This suppresses the third-party `dexie` type declaration error without affecting our own type safety.

### Impact Assessment
- **No functional changes** — all policy logic (USING/WITH CHECK expressions) remains identical
- **Security improvement** — unauthenticated REST API calls will be rejected at the role level before policy expressions are even evaluated
- **Edge functions unaffected** — they use `service_role` key which bypasses RLS entirely

### Technical Details

The migration pattern for each policy:
```sql
DROP POLICY IF EXISTS "Policy Name" ON public.table_name;
CREATE POLICY "Policy Name" ON public.table_name
  FOR <command> TO authenticated
  USING (<same expression>)
  WITH CHECK (<same expression>);
```

