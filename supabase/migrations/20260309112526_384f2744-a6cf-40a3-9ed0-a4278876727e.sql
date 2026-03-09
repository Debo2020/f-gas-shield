
-- Fix 1: Prevent users from self-assigning arbitrary company_id on profiles
-- Drop existing INSERT policy and replace with one that prevents company_id manipulation
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id IS NULL
  );

-- Drop existing UPDATE policy and replace with one that prevents company_id changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- company_id must stay the same as the current value
      company_id IS NOT DISTINCT FROM get_user_company_id(auth.uid())
    )
  );

-- Fix 2: Prevent managers from creating invitations with owner role
-- Drop existing INSERT policy and replace with role-restricted version
DROP POLICY IF EXISTS "Owners and managers can create invitations" ON public.team_invitations;
CREATE POLICY "Owners and managers can create invitations"
  ON public.team_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND (
      -- Owners can invite any role
      (has_role(auth.uid(), 'owner'::app_role))
      OR
      -- Managers can invite any role EXCEPT owner
      (has_role(auth.uid(), 'manager'::app_role) AND role != 'owner'::app_role)
    )
  );

-- Also add company_id check to user_roles INSERT via invitation path
-- Ensure the invitation's company matches the user's company
DROP POLICY IF EXISTS "Role insert via valid invitation or owner" ON public.user_roles;
CREATE POLICY "Role insert via valid invitation or owner"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owner path: can assign roles to users in their company
    (has_role(auth.uid(), 'owner'::app_role) AND (user_id IN (
      SELECT p.user_id FROM profiles p
      WHERE p.company_id = get_user_company_id(auth.uid())
    )))
    OR
    -- Self-insert via valid invitation: invitation must match user's email, role, AND company
    (user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM team_invitations ti
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE ti.email = p.email
        AND ti.role::text = user_roles.role::text
        AND ti.company_id = p.company_id
        AND ti.accepted_at IS NULL
        AND ti.expires_at > now()
    ))
  );
