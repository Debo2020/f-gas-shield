-- Drop the existing engineer SELECT policy
DROP POLICY IF EXISTS "Engineers can view own movements" ON public.refrigerant_movements;

-- Create a more secure policy that verifies both engineer_id AND company membership
CREATE POLICY "Engineers can view own movements" 
ON public.refrigerant_movements 
FOR SELECT 
USING (
  (engineer_id = auth.uid()) 
  AND (company_id = get_user_company_id(auth.uid()))
);