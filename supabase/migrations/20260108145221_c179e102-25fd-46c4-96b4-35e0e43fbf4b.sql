-- Drop and recreate the companies INSERT policy to be more permissive for new users
DROP POLICY IF EXISTS "Users without company can create one" ON public.companies;

CREATE POLICY "Authenticated users without company can create one" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id IS NOT NULL
  )
);