-- Create a SECURITY DEFINER helper function to check if user can create a company
CREATE OR REPLACE FUNCTION public.user_can_create_company(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id 
    AND company_id IS NOT NULL
  )
$$;

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users without company can create one" ON public.companies;

-- Create new policy using the helper function
CREATE POLICY "Authenticated users without company can create one"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (public.user_can_create_company(auth.uid()));