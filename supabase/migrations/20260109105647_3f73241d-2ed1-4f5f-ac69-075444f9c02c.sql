-- Create document type enum
CREATE TYPE public.document_type AS ENUM ('certificate', 'invoice', 'photo', 'declaration', 'label', 'report', 'other');

-- Create documents table for storing file references
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  document_type document_type NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
CREATE POLICY "Users can view company documents"
  ON public.documents FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Authenticated users can create documents"
  ON public.documents FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners and managers can update documents"
  ON public.documents FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Owners can delete documents"
  ON public.documents FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

-- Create updated_at trigger
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for compliance documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for compliance-documents bucket
CREATE POLICY "Users can view company documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Owners and managers can update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE id = get_user_company_id(auth.uid())
  ) AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))
  ));

CREATE POLICY "Owners can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE id = get_user_company_id(auth.uid())
  ) AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner')
  ));

-- Add index for faster lookups
CREATE INDEX idx_documents_company_id ON public.documents(company_id);
CREATE INDEX idx_documents_equipment_id ON public.documents(equipment_id);
CREATE INDEX idx_documents_inspection_id ON public.documents(inspection_id);
CREATE INDEX idx_documents_site_id ON public.documents(site_id);