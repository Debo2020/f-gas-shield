REVOKE SELECT (token) ON public.team_invitations FROM authenticated, anon, PUBLIC;
REVOKE SELECT (token) ON public.client_users      FROM authenticated, anon, PUBLIC;
REVOKE SELECT (token) ON public.user_licenses     FROM authenticated, anon, PUBLIC;