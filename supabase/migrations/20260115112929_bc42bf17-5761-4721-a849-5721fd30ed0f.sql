-- Create new storage buckets for different document types
INSERT INTO storage.buckets (id, name, public) VALUES
  ('certificates', 'certificates', false),
  ('site-photos', 'site-photos', false),
  ('equipment-photos', 'equipment-photos', false),
  ('compliance-reports', 'compliance-reports', false),
  ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Add bucket_id column to documents table to track which bucket stores each file
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS bucket_id TEXT DEFAULT 'compliance-documents';

-- Create index for faster lookups by bucket
CREATE INDEX IF NOT EXISTS idx_documents_bucket ON public.documents(bucket_id);

-- RLS Policies for certificates bucket
CREATE POLICY "Company members can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificates' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can view certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can delete certificates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'certificates' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text AND
  has_role(auth.uid(), 'owner'::app_role)
);

-- RLS Policies for site-photos bucket
CREATE POLICY "Company members can upload site-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'site-photos' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can view site-photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'site-photos' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can delete site-photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'site-photos' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text AND
  has_role(auth.uid(), 'owner'::app_role)
);

-- RLS Policies for equipment-photos bucket
CREATE POLICY "Company members can upload equipment-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'equipment-photos' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can view equipment-photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'equipment-photos' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can delete equipment-photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'equipment-photos' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text AND
  has_role(auth.uid(), 'owner'::app_role)
);

-- RLS Policies for compliance-reports bucket
CREATE POLICY "Company members can upload compliance-reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'compliance-reports' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can view compliance-reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'compliance-reports' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can delete compliance-reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'compliance-reports' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text AND
  has_role(auth.uid(), 'owner'::app_role)
);

-- RLS Policies for invoices bucket
CREATE POLICY "Company members can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can view invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can delete invoices"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices' AND 
  (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text AND
  has_role(auth.uid(), 'owner'::app_role)
);