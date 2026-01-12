-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

-- Create a more restrictive policy: only profile owner OR company admins/owners can view
CREATE POLICY "Users can view own profile or admins can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (user_id = auth.uid()) 
  OR (
    (company_id = get_user_company_id(auth.uid())) 
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);