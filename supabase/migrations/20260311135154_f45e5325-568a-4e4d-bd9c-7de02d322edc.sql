-- Allow anonymous users to read team_invitations by token (for set-password page)
CREATE POLICY "Anyone can view invitation by token"
ON public.team_invitations
FOR SELECT
TO anon
USING (true);