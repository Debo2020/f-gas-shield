
CREATE OR REPLACE FUNCTION public.create_company_for_current_user(company_name text, company_address text DEFAULT NULL::text, company_phone text DEFAULT NULL::text, company_email text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id uuid;
  new_slug text;
  _user_id uuid;
  _user_email text;
  _full_name text;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_create_company(_user_id) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  -- Get user metadata for profile creation
  SELECT 
    COALESCE(raw_user_meta_data->>'full_name', email),
    email
  INTO _full_name, _user_email
  FROM auth.users
  WHERE id = _user_id;

  -- Upsert profile row so UPDATE below always finds a row
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (_user_id, _full_name, _user_email)
  ON CONFLICT (user_id) DO NOTHING;

  new_slug := public.generate_unique_slug(company_name);

  INSERT INTO public.companies (name, slug, address, phone, email)
  VALUES (company_name, new_slug, company_address, company_phone, company_email)
  RETURNING id INTO new_company_id;

  UPDATE public.profiles
  SET company_id = new_company_id
  WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create owner license atomically
  INSERT INTO public.user_licenses (company_id, user_id, email, status, license_type, assigned_by)
  VALUES (new_company_id, _user_id, _user_email, 'active', 'owner', _user_id);

  -- Create organization membership
  INSERT INTO public.organization_memberships (org_id, user_id, role)
  VALUES (new_company_id, _user_id, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN new_company_id;
END;
$function$;
