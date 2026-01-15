-- Add new document types to enum
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'waste_transfer_note';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'consignment_note';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'purchase_invoice';

-- Create enum for movement reasons
CREATE TYPE public.movement_reason AS ENUM (
  'commissioning',
  'leak_repair',
  'top_up',
  'recovery',
  'disposal',
  'transfer'
);

-- Create enum for disposal methods
CREATE TYPE public.disposal_method AS ENUM (
  'returned_to_supplier',
  'sent_for_destruction',
  'reclaimed'
);

-- Create enum for company certificate types
CREATE TYPE public.company_certificate_type AS ENUM (
  'refcom',
  'quidos',
  'fgas_company',
  'other'
);

-- Extend refrigerant_movements table
ALTER TABLE public.refrigerant_movements
ADD COLUMN IF NOT EXISTS reason public.movement_reason,
ADD COLUMN IF NOT EXISTS waste_transfer_note_id uuid REFERENCES public.documents(id),
ADD COLUMN IF NOT EXISTS job_reference text;

-- Extend refrigerant_cylinders table
ALTER TABLE public.refrigerant_cylinders
ADD COLUMN IF NOT EXISTS is_recovery_cylinder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS purchase_invoice_id uuid REFERENCES public.documents(id),
ADD COLUMN IF NOT EXISTS disposal_method public.disposal_method,
ADD COLUMN IF NOT EXISTS disposal_date date,
ADD COLUMN IF NOT EXISTS disposal_reference text,
ADD COLUMN IF NOT EXISTS consignment_note_id uuid REFERENCES public.documents(id);

-- Create company_certificates table
CREATE TABLE IF NOT EXISTS public.company_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  certificate_type public.company_certificate_type NOT NULL,
  certificate_number text NOT NULL,
  issued_date date NOT NULL,
  expiry_date date,
  document_id uuid REFERENCES public.documents(id),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add updated_at trigger for company_certificates
CREATE TRIGGER update_company_certificates_updated_at
  BEFORE UPDATE ON public.company_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on company_certificates
ALTER TABLE public.company_certificates ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_certificates
CREATE POLICY "Users can view company certificates"
  ON public.company_certificates
  FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners and managers can create certificates"
  ON public.company_certificates
  FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Owners and managers can update certificates"
  ON public.company_certificates
  FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Owners can delete certificates"
  ON public.company_certificates
  FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND has_role(auth.uid(), 'owner')
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_company_certificates_company_id ON public.company_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_company_certificates_expiry ON public.company_certificates(expiry_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_refrigerant_movements_equipment ON public.refrigerant_movements(equipment_id);
CREATE INDEX IF NOT EXISTS idx_refrigerant_cylinders_recovery ON public.refrigerant_cylinders(is_recovery_cylinder) WHERE is_recovery_cylinder = true;