-- Create movement type enum
CREATE TYPE public.movement_type AS ENUM ('book_out', 'book_in', 'recovered');

-- Create refrigerant movements table
CREATE TABLE public.refrigerant_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  engineer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engineer_name text NOT NULL,
  movement_type movement_type NOT NULL,
  refrigerant_type public.refrigerant_type NOT NULL,
  weight_kg numeric NOT NULL CHECK (weight_kg > 0),
  cylinder_reference text,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
  source text,
  notes text,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refrigerant_movements ENABLE ROW LEVEL SECURITY;

-- Engineers can view their own movements
CREATE POLICY "Engineers can view own movements"
ON public.refrigerant_movements
FOR SELECT
USING (engineer_id = auth.uid());

-- Managers/Owners can view all company movements
CREATE POLICY "Managers and owners can view all company movements"
ON public.refrigerant_movements
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- All authenticated users in company can insert movements
CREATE POLICY "Users can insert own movements"
ON public.refrigerant_movements
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND engineer_id = auth.uid()
);

-- Managers/Owners can update company movements
CREATE POLICY "Managers and owners can update company movements"
ON public.refrigerant_movements
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Owners can delete company movements
CREATE POLICY "Owners can delete company movements"
ON public.refrigerant_movements
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Add updated_at trigger
CREATE TRIGGER update_refrigerant_movements_updated_at
BEFORE UPDATE ON public.refrigerant_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();