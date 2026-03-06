

## Production Readiness: Security Scan Fixes

The security scan identified **4 errors** and **4 warnings**. Here's the plan to address them.

### Findings Summary

| # | Level | Issue | Action |
|---|-------|-------|--------|
| 1 | ERROR | Profiles SELECT policy uses `is_org_admin()` which checks empty `organization_memberships` table — team members can't see each other's profiles | **Fix: rewrite policy** |
| 2 | ERROR | `team_invitations.token` readable by all company members | **Fix: restrict SELECT** |
| 3 | ERROR | `user_licenses.token` readable by all company members | **Fix: restrict SELECT** |
| 4 | ERROR | `client_users.token` readable by all company members | **Fix: restrict SELECT** |
| 5 | WARN | Supplier contact info visible to all | **Accept**: engineers need supplier details for procurement |
| 6 | WARN | Client contact info visible to all | **Accept**: needed for job scheduling |
| 7 | WARN | Site contact info visible to all | **Accept**: engineers visit sites and need contact details |
| 8 | WARN | Gas cert customer data visible to all | **Accept**: team members collaborate on certificates |

### Database Migration

A single migration to fix findings 1-4:

**1. Fix profiles SELECT policy**
Replace `is_org_admin(auth.uid(), company_id)` with `get_user_company_id(auth.uid())` so company members can actually view colleagues' profiles:
```sql
-- Drop broken policy
DROP POLICY "Owners and admins can view company profiles" ON profiles;
-- New policy: all company members can view company profiles
CREATE POLICY "Users can view company profiles" ON profiles
  FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND company_id = get_user_company_id(auth.uid()));
```

**2. Restrict team_invitations SELECT** — only owners/managers see all invitations; invited user sees their own:
```sql
DROP POLICY "Users can view company invitations" ON team_invitations;
CREATE POLICY "Owners and managers can view company invitations" ON team_invitations
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Invited user can view own invitation" ON team_invitations
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM profiles WHERE user_id = auth.uid()));
```

**3. Restrict user_licenses SELECT** — owners/managers + assigned user:
```sql
DROP POLICY "Users can view company licenses" ON user_licenses;
CREATE POLICY "Owners and managers can view company licenses" ON user_licenses
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Users can view own license" ON user_licenses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

**4. Restrict client_users SELECT** — owners/managers only:
```sql
DROP POLICY "Users can view company client users" ON client_users;
CREATE POLICY "Owners and managers can view client users" ON client_users
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE company_id = get_user_company_id(auth.uid()))
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
```

### Warn-Level Findings

The 4 warnings about supplier/client/site/gas certificate contact info will be marked as accepted risk — field engineers need this data to perform their jobs (visit sites, contact clients, order from suppliers, collaborate on certificates).

### Build Error

The `dexie` TS1540 error — `skipLibCheck: true` is already set in `tsconfig.app.json`. If it persists, no further action is possible without removing the dexie dependency (which would break offline functionality).

### What This Does NOT Change
- All existing INSERT/UPDATE/DELETE policies remain unchanged
- Edge function authentication and rate limiting (already hardened)
- No frontend code changes needed — queries already select specific columns

