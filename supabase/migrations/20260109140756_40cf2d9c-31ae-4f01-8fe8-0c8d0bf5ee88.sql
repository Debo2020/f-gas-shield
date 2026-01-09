-- Create an atomic company setup RPC that bypasses RLS safely (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_company_for_current_user(
  company_name text,
  company_address text DEFAULT NULL,
  company_phone text DEFAULT NULL,
  company_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
  new_slug text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_create_company(auth.uid()) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  new_slug := public.generate_unique_slug(company_name);

  INSERT INTO public.companies (name, slug, address, phone, email)
  VALUES (company_name, new_slug, company_address, company_phone, company_email)
  RETURNING id INTO new_company_id;

  UPDATE public.profiles
  SET company_id = new_company_id
  WHERE user_id = auth.uid();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new_company_id;
END;
$$;

-- Lock down who can call it
REVOKE ALL ON FUNCTION public.create_company_for_current_user(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_for_current_user(text, text, text, text) TO authenticated;