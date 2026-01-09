-- Create cylinder status enum
CREATE TYPE public.cylinder_status AS ENUM ('in_stock', 'checked_out', 'empty', 'disposed');

-- Create refrigerant_cylinders table for inventory tracking
CREATE TABLE public.refrigerant_cylinders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cylinder_code text NOT NULL,
  refrigerant_type public.refrigerant_type NOT NULL,
  initial_weight_kg numeric NOT NULL,
  current_weight_kg numeric NOT NULL,
  tare_weight_kg numeric DEFAULT 0,
  status public.cylinder_status NOT NULL DEFAULT 'in_stock',
  checked_out_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_out_at timestamp with time zone,
  supplier text,
  batch_number text,
  purchase_date date,
  expiry_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, cylinder_code)
);

-- Enable RLS
ALTER TABLE public.refrigerant_cylinders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view company cylinders"
  ON public.refrigerant_cylinders FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners and managers can create cylinders"
  ON public.refrigerant_cylinders FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Owners and managers can update cylinders"
  ON public.refrigerant_cylinders FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Engineers can check out/in cylinders"
  ON public.refrigerant_cylinders FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners can delete cylinders"
  ON public.refrigerant_cylinders FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND has_role(auth.uid(), 'owner')
  );

-- Add cylinder_id to refrigerant_movements for linking
ALTER TABLE public.refrigerant_movements 
ADD COLUMN cylinder_id uuid REFERENCES public.refrigerant_cylinders(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_cylinders_updated_at
  BEFORE UPDATE ON public.refrigerant_cylinders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();