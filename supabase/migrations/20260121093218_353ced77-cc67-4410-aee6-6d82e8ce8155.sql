-- Create suppliers/merchants table for tracking refrigerant sources
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  account_number TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS policies for suppliers
CREATE POLICY "Users can view company suppliers"
ON public.suppliers FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners managers and stores managers can create suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'stores_manager'::app_role)
  )
);

CREATE POLICY "Owners managers and stores managers can update suppliers"
ON public.suppliers FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'stores_manager'::app_role)
  )
);

CREATE POLICY "Owners can delete suppliers"
ON public.suppliers FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner'::app_role)
);

-- Add supplier tracking columns to refrigerant_cylinders
ALTER TABLE public.refrigerant_cylinders 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS purchase_order_number TEXT,
ADD COLUMN IF NOT EXISTS delivery_note_reference TEXT;

-- Add stores manager tracking to refrigerant_movements
ALTER TABLE public.refrigerant_movements
ADD COLUMN IF NOT EXISTS issued_to_engineer_id UUID,
ADD COLUMN IF NOT EXISTS issued_by_user_id UUID,
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Update RLS for refrigerant_cylinders to allow stores_manager
DROP POLICY IF EXISTS "Owners and managers can create cylinders" ON public.refrigerant_cylinders;
CREATE POLICY "Owners managers and stores managers can create cylinders"
ON public.refrigerant_cylinders FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'stores_manager'::app_role)
  )
);

DROP POLICY IF EXISTS "Owners and managers can update cylinders" ON public.refrigerant_cylinders;
CREATE POLICY "Owners managers and stores managers can update cylinders"
ON public.refrigerant_cylinders FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'stores_manager'::app_role)
  )
);

-- Create trigger for updated_at on suppliers
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();