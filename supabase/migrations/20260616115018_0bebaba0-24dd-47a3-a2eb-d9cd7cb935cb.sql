
-- UPDATE policies for storage buckets (owners + managers, same company)
CREATE POLICY "Owners and managers can update compliance-reports"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'compliance-reports'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  bucket_id = 'compliance-reports'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Owners and managers can update equipment-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'equipment-photos'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  bucket_id = 'equipment-photos'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Owners and managers can update invoices"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Owners and managers can update site-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'site-photos'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  bucket_id = 'site-photos'
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Tighten compliance-documents DELETE: remove broad member-delete (owner-only policy already exists)
DROP POLICY IF EXISTS "Company members can delete their documents" ON storage.objects;
