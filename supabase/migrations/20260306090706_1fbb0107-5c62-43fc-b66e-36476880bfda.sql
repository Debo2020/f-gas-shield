
-- Create addon_licenses table for per-user add-on license tracking
CREATE TABLE public.addon_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  addon_type public.addon_type NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL DEFAULT 'active',
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, addon_type, user_id)
);

-- Enable RLS
ALTER TABLE public.addon_licenses ENABLE ROW LEVEL SECURITY;

-- RLS policies (mirrors user_licenses pattern)
CREATE POLICY "Users can view company addon licenses"
  ON public.addon_licenses FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners and managers can create addon licenses"
  ON public.addon_licenses FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Owners and managers can update addon licenses"
  ON public.addon_licenses FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Owners can delete addon licenses"
  ON public.addon_licenses FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'owner')
  );

-- Updated_at trigger
CREATE TRIGGER update_addon_licenses_updated_at
  BEFORE UPDATE ON public.addon_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
