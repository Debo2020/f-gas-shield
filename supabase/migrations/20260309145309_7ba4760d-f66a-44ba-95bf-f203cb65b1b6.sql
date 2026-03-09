
-- Drop the permissive INSERT policy that lacks company_id restriction
-- This policy allows any authenticated user to set arbitrary company_id
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
