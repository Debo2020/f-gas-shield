-- Drop the existing SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view own profile or admins can view company profiles" ON public.profiles;

-- Create a more restrictive policy that ensures company isolation
-- Users can view their own profile (regardless of company)
-- OR users can view profiles of people in the SAME company (if they are owner/admin)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Owners and admins can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Must have a company_id set
  company_id IS NOT NULL 
  -- User must belong to the same company
  AND company_id = get_user_company_id(auth.uid())
  -- And must be owner or admin
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);