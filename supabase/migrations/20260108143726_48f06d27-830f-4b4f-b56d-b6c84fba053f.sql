-- Create sites table for company locations
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  postcode TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Users can view sites in their company
CREATE POLICY "Users can view company sites"
ON public.sites
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Owners and managers can create sites
CREATE POLICY "Owners and managers can create sites"
ON public.sites
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Owners and managers can update sites
CREATE POLICY "Owners and managers can update sites"
ON public.sites
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Owners can delete sites
CREATE POLICY "Owners can delete sites"
ON public.sites
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'owner')
);

-- Add trigger for updated_at
CREATE TRIGGER update_sites_updated_at
BEFORE UPDATE ON public.sites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_sites_company ON public.sites(company_id);
CREATE INDEX idx_sites_city ON public.sites(city);