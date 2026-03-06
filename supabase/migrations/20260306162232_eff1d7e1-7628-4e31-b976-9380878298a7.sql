
-- Fix 1: Profiles SELECT policy - replace broken is_org_admin check
DROP POLICY IF EXISTS "Owners and admins can view company profiles" ON public.profiles;
CREATE POLICY "Users can view company profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND company_id = get_user_company_id(auth.uid()));

-- Ensure users can still view their own profile (even if company_id is null during onboarding)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Fix 2: Restrict team_invitations SELECT - token exposure
DROP POLICY IF EXISTS "Users can view company invitations" ON public.team_invitations;
CREATE POLICY "Owners and managers can view company invitations" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Invited user can view own invitation" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM public.profiles WHERE user_id = auth.uid()));

-- Fix 3: Restrict user_licenses SELECT - token exposure
DROP POLICY IF EXISTS "Users can view company licenses" ON public.user_licenses;
CREATE POLICY "Owners and managers can view company licenses" ON public.user_licenses
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Users can view own license" ON public.user_licenses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Fix 4: Restrict client_users SELECT - token exposure
DROP POLICY IF EXISTS "Users can view company client users" ON public.client_users;
CREATE POLICY "Owners and managers can view client users" ON public.client_users
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE company_id = get_user_company_id(auth.uid()))
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
