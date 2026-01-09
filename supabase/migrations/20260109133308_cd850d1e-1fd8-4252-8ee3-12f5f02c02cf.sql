-- Clean up orphan role (user has owner role but no company)
DELETE FROM user_roles 
WHERE user_id IN (
  SELECT ur.user_id 
  FROM user_roles ur
  LEFT JOIN profiles p ON ur.user_id = p.user_id
  WHERE p.company_id IS NULL
);

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Recreate the policy to ensure it's active
DROP POLICY IF EXISTS "Authenticated users without company can create one" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies during registration" ON public.companies;

CREATE POLICY "Authenticated users without company can create one"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (public.user_can_create_company(auth.uid()));