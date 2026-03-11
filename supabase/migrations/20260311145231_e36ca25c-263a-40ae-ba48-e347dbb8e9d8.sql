
-- Add anon SELECT policy on companies for invitation page joins
CREATE POLICY "Anon can view company name by id"
  ON public.companies FOR SELECT TO anon
  USING (true);

-- Tighten team_invitations anon policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.team_invitations;
CREATE POLICY "Anon can view invitation by token"
  ON public.team_invitations FOR SELECT TO anon
  USING (token IS NOT NULL);

-- Tighten user_licenses anon policy
DROP POLICY IF EXISTS "Anyone can view license by token" ON public.user_licenses;
CREATE POLICY "Anon can view license by token"
  ON public.user_licenses FOR SELECT TO anon
  USING (token IS NOT NULL);
