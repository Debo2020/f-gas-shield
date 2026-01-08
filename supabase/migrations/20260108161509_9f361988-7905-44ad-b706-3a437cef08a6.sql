-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users without company can create one" ON public.companies;
DROP POLICY IF EXISTS "Owners can update their company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Authenticated users without company can create one"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id IS NOT NULL
  )
);

CREATE POLICY "Owners can update their company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Users can view their own company"
ON public.companies
FOR SELECT
TO authenticated
USING (id = get_user_company_id(auth.uid()));