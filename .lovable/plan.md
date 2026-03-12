

# Role-Based Access Control: Single Owner + Role-Driven Permissions

## Summary

Enforce single-owner policy, remove the "Admin" role option from invitations, and ensure all team members have permissions strictly based on their assigned role. Add ownership transfer capability.

## Current State

- **Roles in enum**: owner, manager, engineer, stores_manager, admin, auditor, read_only
- **Invite dialog offers**: Admin, Manager, Stores Manager, Engineer
- **Backend RLS**: Already correctly restricts master data (suppliers, clients, sites, equipment) to owner/manager for write operations; engineers are read-only
- **Frontend**: Most pages already check `hasRole("owner")` / `hasRole("manager")` for edit actions
- **Gap**: "Admin" role has no distinct backend permissions; no enforcement of single owner; no ownership transfer

## Plan

### 1. Database: Enforce Single Owner Constraint

Create a migration with a trigger that prevents:
- Inserting a second "owner" role for the same company
- Assigning "owner" via team invitations

```sql
-- Trigger function to enforce single owner per company
CREATE OR REPLACE FUNCTION enforce_single_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    IF EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.role = 'owner'
        AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = NEW.user_id)
        AND ur.user_id != NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Only one owner is allowed per company';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_owner
BEFORE INSERT ON user_roles
FOR EACH ROW EXECUTE FUNCTION enforce_single_owner();
```

### 2. Database: Add Ownership Transfer Function

Create a security-definer function that atomically:
- Changes the current owner's role to "manager"
- Assigns "owner" role to the target user
- Logs an audit event

```sql
CREATE OR REPLACE FUNCTION transfer_ownership(_new_owner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _company_id uuid;
  _current_owner_id uuid;
BEGIN
  -- Get current user's company
  SELECT company_id INTO _company_id FROM profiles WHERE user_id = auth.uid();
  
  -- Verify caller is owner
  IF NOT has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only the owner can transfer ownership';
  END IF;
  
  -- Verify target is in same company
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = _new_owner_id AND company_id = _company_id) THEN
    RAISE EXCEPTION 'Target user is not in your company';
  END IF;
  
  _current_owner_id := auth.uid();
  
  -- Disable the trigger temporarily for the swap
  -- Remove old owner role, add manager
  DELETE FROM user_roles WHERE user_id = _current_owner_id AND role = 'owner';
  INSERT INTO user_roles (user_id, role) VALUES (_current_owner_id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Remove any existing roles for new owner, add owner
  DELETE FROM user_roles WHERE user_id = _new_owner_id AND role IN ('manager', 'engineer', 'stores_manager', 'admin');
  -- Temporarily disable trigger for the swap
  ALTER TABLE user_roles DISABLE TRIGGER trg_enforce_single_owner;
  INSERT INTO user_roles (user_id, role) VALUES (_new_owner_id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  ALTER TABLE user_roles ENABLE TRIGGER trg_enforce_single_owner;
  
  -- Update organization_memberships
  UPDATE organization_memberships SET role = 'manager' WHERE user_id = _current_owner_id AND org_id = _company_id;
  UPDATE organization_memberships SET role = 'owner' WHERE user_id = _new_owner_id AND org_id = _company_id;
  
  -- Update user_licenses
  UPDATE user_licenses SET license_type = 'manager' WHERE user_id = _current_owner_id AND company_id = _company_id;
  UPDATE user_licenses SET license_type = 'owner' WHERE user_id = _new_owner_id AND company_id = _company_id;
END;
$$;
```

*Note: Since SECURITY DEFINER functions can't use `ALTER TABLE`, I'll implement this as an edge function using the service role instead, which provides the same atomic guarantees.*

### 3. Frontend: Remove "Admin" Role from Invite Dialog

**File**: `src/components/team/InviteMemberDialog.tsx`
- Remove the "Admin" `<SelectItem>` from the role dropdown (line 186-193)
- Update the zod schema to remove "admin" from the enum

### 4. Frontend: Add "Transfer Ownership" Option to Team Management

**File**: `src/components/organisation/OrganisationTeamTab.tsx`
- Add a "Transfer Ownership" menu item in the dropdown for team members (visible only to the current owner)
- Add a confirmation dialog warning that the action is irreversible
- Call the transfer function via an edge function or RPC

**File**: `src/components/team/TeamMemberList.tsx`
- Add "Transfer Ownership" dropdown item for owners viewing non-owner members

### 5. Edge Function: Transfer Ownership

**File**: `supabase/functions/transfer-ownership/index.ts`
- Verify caller is owner via JWT + role check
- Atomically swap roles using adminClient (service role)
- Update `user_roles`, `organization_memberships`, and `user_licenses`
- Log audit event

### 6. Frontend: Enforce Role-Based UI Guards (Verification Pass)

Verify and fix any gaps in these files:
- **Sites page** (`src/pages/Sites.tsx`): Ensure "Add Site" button is hidden for engineers/stores_managers
- **Equipment page** (`src/pages/Equipment.tsx`): Already done -- engineers see read-only actions
- **Suppliers tab** (`OrganisationSuppliersTab.tsx`): Already uses `canManageSuppliers` check
- **Clients tab** (`OrganisationClientsTab.tsx`): Already uses `canManageClients` check
- **Organisation tabs** (`Organisation.tsx`): Already filters tabs by role

### 7. Backend: Prevent "Admin" Role Assignment in Edge Functions

**File**: `supabase/functions/invite-member/index.ts`
- Remove "admin" from the `validRoles` array (line 129) so it cannot be assigned server-side
- Remove "owner" from `validRoles` as well -- owner should only exist via transfer

**File**: `supabase/functions/accept-invitation/index.ts`
- Ensure `roleToAssign` mapping doesn't accept "admin" or "owner"

## Permission Matrix (Unchanged, Enforced)

| Area | Owner | Manager | Stores Manager | Engineer |
|------|-------|---------|----------------|----------|
| Suppliers | Full CRUD | Create/Edit | Create/Edit | Read |
| Clients | Full CRUD | Create/Edit | Read | Read |
| Sites | Full CRUD | Create/Edit | Read | Read |
| Equipment | Full CRUD | Create/Edit | Read | Read |
| Inspections | Full CRUD | Full CRUD | Read | Create + Edit Own |
| Gas Certificates | Full CRUD | Full CRUD | Read | Create + Edit Own |
| Team Management | Full | Invite (non-owner) | -- | -- |
| Settings | Full | -- | -- | -- |
| Transfer Ownership | Yes | -- | -- | -- |

## Files to Change

1. **New migration SQL** -- single-owner trigger
2. **New edge function** `supabase/functions/transfer-ownership/index.ts`
3. `src/components/team/InviteMemberDialog.tsx` -- remove Admin role
4. `src/components/team/TeamMemberList.tsx` -- add Transfer Ownership action
5. `src/components/organisation/OrganisationTeamTab.tsx` -- transfer ownership handler + confirmation dialog
6. `supabase/functions/invite-member/index.ts` -- remove admin/owner from valid roles
7. `supabase/functions/accept-invitation/index.ts` -- ensure no admin/owner assignment

