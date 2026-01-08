-- Create refrigerant types enum for common F-Gas refrigerants
CREATE TYPE public.refrigerant_type AS ENUM (
  'R-32',
  'R-134a',
  'R-404A',
  'R-407C',
  'R-410A',
  'R-422D',
  'R-448A',
  'R-449A',
  'R-452A',
  'R-454B',
  'R-507A',
  'R-744',
  'Other'
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  asset_tag TEXT,
  refrigerant_type refrigerant_type NOT NULL,
  refrigerant_charge_kg DECIMAL(10,3) NOT NULL,
  co2_equivalent_tonnes DECIMAL(10,3),
  installation_date DATE,
  last_inspection_date DATE,
  next_inspection_due DATE,
  inspection_frequency_months INTEGER DEFAULT 12,
  location_description TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Users can view equipment in their company
CREATE POLICY "Users can view company equipment"
ON public.equipment
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Owners and managers can create equipment
CREATE POLICY "Owners and managers can create equipment"
ON public.equipment
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Owners and managers can update equipment
CREATE POLICY "Owners and managers can update equipment"
ON public.equipment
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Owners can delete equipment
CREATE POLICY "Owners can delete equipment"
ON public.equipment
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'owner')
);

-- Add trigger for updated_at
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_equipment_company ON public.equipment(company_id);
CREATE INDEX idx_equipment_site ON public.equipment(site_id);
CREATE INDEX idx_equipment_next_inspection ON public.equipment(next_inspection_due);
CREATE INDEX idx_equipment_refrigerant ON public.equipment(refrigerant_type);

-- Create function to calculate CO2 equivalent based on refrigerant GWP values
CREATE OR REPLACE FUNCTION public.calculate_co2_equivalent(
  _refrigerant refrigerant_type,
  _charge_kg DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  gwp INTEGER;
BEGIN
  -- GWP values based on EU F-Gas Regulation
  gwp := CASE _refrigerant
    WHEN 'R-32' THEN 675
    WHEN 'R-134a' THEN 1430
    WHEN 'R-404A' THEN 3922
    WHEN 'R-407C' THEN 1774
    WHEN 'R-410A' THEN 2088
    WHEN 'R-422D' THEN 2729
    WHEN 'R-448A' THEN 1387
    WHEN 'R-449A' THEN 1397
    WHEN 'R-452A' THEN 2140
    WHEN 'R-454B' THEN 466
    WHEN 'R-507A' THEN 3985
    WHEN 'R-744' THEN 1
    ELSE 0
  END;
  
  RETURN ROUND((_charge_kg * gwp) / 1000, 3);
END;
$$;

-- Create trigger to auto-calculate CO2 equivalent
CREATE OR REPLACE FUNCTION public.equipment_calculate_co2()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.co2_equivalent_tonnes := calculate_co2_equivalent(NEW.refrigerant_type, NEW.refrigerant_charge_kg);
  RETURN NEW;
END;
$$;

CREATE TRIGGER equipment_co2_calculation
BEFORE INSERT OR UPDATE OF refrigerant_type, refrigerant_charge_kg ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.equipment_calculate_co2();