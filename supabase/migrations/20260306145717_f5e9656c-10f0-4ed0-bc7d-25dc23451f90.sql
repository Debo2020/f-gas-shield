-- Allow the invited user to stamp accepted_at on their own invitation
CREATE POLICY "Invited user can accept invitation"
ON public.team_invitations FOR UPDATE
TO authenticated
USING (
  email = (SELECT email FROM profiles WHERE user_id = auth.uid())
  AND accepted_at IS NULL
  AND expires_at > now()
)
WITH CHECK (
  accepted_at IS NOT NULL
);