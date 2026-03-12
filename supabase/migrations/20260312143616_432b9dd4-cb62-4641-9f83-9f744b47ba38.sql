-- Allow engineers to update inspections they performed (inspector_id = their user ID)
CREATE POLICY "Engineers can update own inspections"
ON public.inspections
FOR UPDATE
TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND (inspector_id = auth.uid())
)
WITH CHECK (
  (company_id = get_user_company_id(auth.uid()))
  AND (inspector_id = auth.uid())
);