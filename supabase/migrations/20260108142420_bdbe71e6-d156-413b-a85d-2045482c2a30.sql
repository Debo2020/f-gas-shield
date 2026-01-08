-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can create companies during registration" ON public.companies;

-- Create a more specific policy that allows company creation only once per user
-- (when they don't already have a company_id set)
CREATE POLICY "Users without company can create one"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND company_id IS NOT NULL
    )
  );