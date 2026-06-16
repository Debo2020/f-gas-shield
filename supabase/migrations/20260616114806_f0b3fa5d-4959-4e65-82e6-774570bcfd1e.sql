CREATE POLICY "Owners and managers can update certificates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);