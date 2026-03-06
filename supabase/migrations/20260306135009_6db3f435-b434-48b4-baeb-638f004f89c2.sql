
-- Fix 1: user_roles privilege escalation - replace INSERT policy
DROP POLICY IF EXISTS "Owners can insert roles" ON public.user_roles;

CREATE POLICY "Role insert via valid invitation or owner"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    -- Owners can assign roles to members of their own company
    (public.has_role(auth.uid(), 'owner'::app_role) AND
     user_id IN (
       SELECT p.user_id FROM profiles p
       WHERE p.company_id = get_user_company_id(auth.uid())
     ))
    OR
    -- Self-insert only when an active invitation exists for this user+role
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.team_invitations ti
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE ti.email = p.email
        AND ti.role::text = user_roles.role::text
        AND ti.accepted_at IS NULL
        AND ti.expires_at > now()
    ))
  );

-- Fix 2: ai_credit_usage unrestricted inserts - restrict to service_role
DROP POLICY IF EXISTS "Service can insert usage" ON public.ai_credit_usage;

CREATE POLICY "Service role can insert usage"
  ON public.ai_credit_usage FOR INSERT
  TO service_role
  WITH CHECK (true);
