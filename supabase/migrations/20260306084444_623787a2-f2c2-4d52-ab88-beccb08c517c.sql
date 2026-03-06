
-- Enum for gas certificate types
CREATE TYPE public.gas_certificate_type AS ENUM (
  'landlord_gas_safety',
  'homeowner_gas_safety',
  'nd_gas_safety',
  'nd_gas_testing_purging',
  'gas_warning_notice'
);

-- Enum for gas certificate status
CREATE TYPE public.gas_certificate_status AS ENUM ('draft', 'issued');

-- Enum for warning classification
CREATE TYPE public.gas_warning_classification AS ENUM ('immediately_dangerous', 'at_risk', 'not_to_current_standards');

-- Enum for addon types
CREATE TYPE public.addon_type AS ENUM ('natural_gas');

-- Company add-ons table
CREATE TABLE public.company_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  addon_type public.addon_type NOT NULL,
  stripe_subscription_id text,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, addon_type)
);

ALTER TABLE public.company_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company addons" ON public.company_addons
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners can insert addons" ON public.company_addons
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update addons" ON public.company_addons
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Gas certificates table
CREATE TABLE public.gas_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id),
  engineer_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  certificate_type public.gas_certificate_type NOT NULL,
  certificate_number text NOT NULL,
  status public.gas_certificate_status NOT NULL DEFAULT 'draft',
  
  -- Job/property details
  job_address_name text,
  job_address text,
  job_postcode text,
  job_phone text,
  
  -- Customer details
  customer_name text,
  customer_company text,
  customer_address text,
  customer_postcode text,
  customer_phone text,
  
  -- Dates
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  next_inspection_due date,
  
  -- Gas safety checks
  emergency_control_accessible boolean,
  gas_tightness_satisfactory boolean,
  pipework_visual_satisfactory boolean,
  equipotential_bonding boolean,
  
  -- CO alarm
  co_alarm_present boolean,
  co_alarm_fitted boolean,
  co_alarm_satisfactory boolean,
  
  -- Defects and comments
  defects jsonb DEFAULT '[]'::jsonb,
  comments text,
  actions_taken text,
  actions_required text,
  
  -- Warning notice fields
  classification public.gas_warning_classification,
  issue_type text,
  riddor_reported_11_1 boolean,
  riddor_reported_11_2 boolean,
  
  -- Testing & purging fields
  test_method text,
  test_pressure_mbar numeric,
  stabilisation_period text,
  test_duration text,
  permitted_pressure_drop numeric,
  actual_pressure_drop numeric,
  strength_test_result text,
  tightness_test_result text,
  purge_completed boolean,
  
  -- Signatures
  issued_by_name text,
  issued_by_signature text,
  received_by_name text,
  received_by_signature text,
  
  -- Generated PDF
  pdf_url text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gas_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company gas certificates" ON public.gas_certificates
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create gas certificates" ON public.gas_certificates
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners and managers can update gas certificates" ON public.gas_certificates
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR engineer_id = auth.uid()));

CREATE POLICY "Owners can delete gas certificates" ON public.gas_certificates
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Gas certificate appliances table
CREATE TABLE public.gas_certificate_appliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.gas_certificates(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  
  location text,
  appliance_type text,
  make text,
  model text,
  flue_type text,
  
  appliance_inspected boolean DEFAULT true,
  operating_pressure_mbar numeric,
  heat_input_kw numeric,
  
  -- Combustion readings
  high_co_ppm numeric,
  high_co2_percent numeric,
  low_co_ppm numeric,
  low_co2_percent numeric,
  
  -- Results
  safety_devices_correct boolean,
  ventilation_satisfactory boolean,
  visual_condition_satisfactory boolean,
  performance_test_result text,
  appliance_safe_to_use boolean,
  
  -- Warning notice specific
  warning_notice_issued boolean DEFAULT false,
  warning_label_attached boolean DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gas_certificate_appliances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view appliances via certificate" ON public.gas_certificate_appliances
  FOR SELECT TO authenticated
  USING (certificate_id IN (SELECT id FROM public.gas_certificates WHERE company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Members can create appliances" ON public.gas_certificate_appliances
  FOR INSERT TO authenticated
  WITH CHECK (certificate_id IN (SELECT id FROM public.gas_certificates WHERE company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Members can update appliances" ON public.gas_certificate_appliances
  FOR UPDATE TO authenticated
  USING (certificate_id IN (SELECT id FROM public.gas_certificates WHERE company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Owners can delete appliances" ON public.gas_certificate_appliances
  FOR DELETE TO authenticated
  USING (certificate_id IN (SELECT id FROM public.gas_certificates WHERE company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role)));

-- Auto-generate certificate numbers per company
CREATE OR REPLACE FUNCTION public.generate_gas_certificate_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prefix text;
  next_num integer;
BEGIN
  prefix := CASE NEW.certificate_type
    WHEN 'landlord_gas_safety' THEN 'LGSR'
    WHEN 'homeowner_gas_safety' THEN 'HGSR'
    WHEN 'nd_gas_safety' THEN 'NDGS'
    WHEN 'nd_gas_testing_purging' THEN 'NDTP'
    WHEN 'gas_warning_notice' THEN 'GWN'
  END;
  
  SELECT COALESCE(MAX(
    CASE WHEN certificate_number ~ ('^' || prefix || '-[0-9]+$')
    THEN CAST(SUBSTRING(certificate_number FROM prefix || '-([0-9]+)$') AS integer)
    ELSE 0 END
  ), 0) + 1
  INTO next_num
  FROM gas_certificates
  WHERE company_id = NEW.company_id AND certificate_type = NEW.certificate_type;
  
  NEW.certificate_number := prefix || '-' || LPAD(next_num::text, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_gas_certificate_number
  BEFORE INSERT ON public.gas_certificates
  FOR EACH ROW
  WHEN (NEW.certificate_number IS NULL OR NEW.certificate_number = '')
  EXECUTE FUNCTION public.generate_gas_certificate_number();
