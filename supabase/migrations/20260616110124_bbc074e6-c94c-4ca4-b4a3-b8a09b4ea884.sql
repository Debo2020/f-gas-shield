
-- 1. Platform admins table
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  notes text
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view themselves"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Helper
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
$$;

-- 3. Rewrite RLS on partner tables
DROP POLICY IF EXISTS "Owners can view partners" ON public.partners;
DROP POLICY IF EXISTS "Owners can insert partners" ON public.partners;
DROP POLICY IF EXISTS "Owners can update partners" ON public.partners;
DROP POLICY IF EXISTS "Owners can delete partners" ON public.partners;

CREATE POLICY "Platform admins manage partners"
  ON public.partners
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Owners can view partner codes" ON public.partner_codes;
DROP POLICY IF EXISTS "Owners can insert partner codes" ON public.partner_codes;
DROP POLICY IF EXISTS "Owners can update partner codes" ON public.partner_codes;
DROP POLICY IF EXISTS "Owners can delete partner codes" ON public.partner_codes;

CREATE POLICY "Platform admins manage partner codes"
  ON public.partner_codes
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Owners can view partner redemptions" ON public.partner_redemptions;
DROP POLICY IF EXISTS "Owners can insert partner redemptions" ON public.partner_redemptions;
DROP POLICY IF EXISTS "Owners can update partner redemptions" ON public.partner_redemptions;

CREATE POLICY "Platform admins view partner redemptions"
  ON public.partner_redemptions
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 4. Seed Darren
INSERT INTO public.platform_admins (user_id, notes)
SELECT id, 'Initial FTrack platform owner'
FROM auth.users
WHERE lower(email) = 'd.allison@solusgsc.com'
ON CONFLICT (user_id) DO NOTHING;
