-- Create inspection result enum
CREATE TYPE public.inspection_result AS ENUM (
  'pass',
  'pass_with_observations',
  'fail',
  'deferred'
);

-- Create inspections table
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  inspector_id UUID REFERENCES auth.users(id),
  inspector_name TEXT NOT NULL,
  inspector_certificate_number TEXT,
  result inspection_result NOT NULL,
  leak_check_performed BOOLEAN NOT NULL DEFAULT true,
  leak_detected BOOLEAN NOT NULL DEFAULT false,
  leak_location TEXT,
  leak_repaired BOOLEAN,
  refrigerant_added_kg DECIMAL(10,3),
  refrigerant_recovered_kg DECIMAL(10,3),
  findings TEXT,
  recommendations TEXT,
  next_inspection_due DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Users can view inspections in their company
CREATE POLICY "Users can view company inspections"
ON public.inspections
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- All authenticated users can create inspections (engineers perform inspections)
CREATE POLICY "Authenticated users can create inspections"
ON public.inspections
FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Owners and managers can update inspections
CREATE POLICY "Owners and managers can update inspections"
ON public.inspections
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Owners can delete inspections
CREATE POLICY "Owners can delete inspections"
ON public.inspections
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'owner')
);

-- Add trigger for updated_at
CREATE TRIGGER update_inspections_updated_at
BEFORE UPDATE ON public.inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update equipment inspection dates
CREATE OR REPLACE FUNCTION public.update_equipment_inspection_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  freq_months INTEGER;
BEGIN
  -- Get equipment inspection frequency
  SELECT inspection_frequency_months INTO freq_months
  FROM equipment
  WHERE id = NEW.equipment_id;
  
  -- Calculate next inspection due date
  NEW.next_inspection_due := NEW.inspection_date + (COALESCE(freq_months, 12) || ' months')::INTERVAL;
  
  -- Update equipment record
  UPDATE equipment
  SET 
    last_inspection_date = NEW.inspection_date,
    next_inspection_due = NEW.next_inspection_due
  WHERE id = NEW.equipment_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update equipment dates
CREATE TRIGGER inspection_update_equipment
BEFORE INSERT ON public.inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_equipment_inspection_dates();

-- Create indexes
CREATE INDEX idx_inspections_company ON public.inspections(company_id);
CREATE INDEX idx_inspections_equipment ON public.inspections(equipment_id);
CREATE INDEX idx_inspections_date ON public.inspections(inspection_date DESC);
CREATE INDEX idx_inspections_result ON public.inspections(result);