
-- =====================================================================
-- 1. SECURE LOOKUP RPCS (replace broad anon SELECT policies)
-- =====================================================================

-- Look up a single team invitation by its token (used by /accept-invite, /set-password)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', ti.id,
    'email', ti.email,
    'role', ti.role,
    'expires_at', ti.expires_at,
    'accepted_at', ti.accepted_at,
    'company_id', ti.company_id,
    'company_name', c.name
  )
  INTO result
  FROM public.team_invitations ti
  LEFT JOIN public.companies c ON c.id = ti.company_id
  WHERE ti.token = _token
  LIMIT 1;

  RETURN result;
END;
$$;

-- Look up a single user license by its token (used by /accept-license)
CREATE OR REPLACE FUNCTION public.get_license_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', ul.id,
    'email', ul.email,
    'license_type', ul.license_type,
    'status', ul.status,
    'token', ul.token,
    'company_id', ul.company_id,
    'company_name', c.name
  )
  INTO result
  FROM public.user_licenses ul
  LEFT JOIN public.companies c ON c.id = ul.company_id
  WHERE ul.token = _token
  LIMIT 1;

  RETURN result;
END;
$$;

-- Cross-flow detection: which table does this token belong to?
CREATE OR REPLACE FUNCTION public.lookup_token_type(_token text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.team_invitations WHERE token = _token) THEN
    RETURN 'invitation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_licenses WHERE token = _token) THEN
    RETURN 'license';
  END IF;
  RETURN NULL;
END;
$$;

-- Grant execute to anon + authenticated (these are the only ways tokens are resolved without a session)
REVOKE ALL ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_license_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_token_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_license_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_token_type(text) TO anon, authenticated;

-- =====================================================================
-- 2. DROP ANONYMOUS SELECT POLICIES ON SENSITIVE TABLES
-- =====================================================================

DROP POLICY IF EXISTS "Anon can view company name by id" ON public.companies;
DROP POLICY IF EXISTS "Anon can view invitation by token" ON public.team_invitations;
DROP POLICY IF EXISTS "Anon can view license by token"   ON public.user_licenses;

-- =====================================================================
-- 3. SUPPORT ATTACHMENTS — per-user folder isolation
-- =====================================================================

DROP POLICY IF EXISTS "Authenticated users can upload support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own support attachments" ON storage.objects;

CREATE POLICY "Users can upload to their own support folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own support attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================================
-- 4. LOCK DOWN INTERNAL SECURITY DEFINER FUNCTIONS
-- These should never be callable by anonymous visitors.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.create_company_for_current_user(text, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_activation_score(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, audit_action, text, uuid, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_org_role(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_create_company(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_available_license(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_company_license_count(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_profile_for_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_profile_status(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_profile_config_for_role(app_role) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_create_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_available_license(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_license_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_profile_for_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_config_for_role(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_for_current_user(text, text, text, text) TO authenticated;
