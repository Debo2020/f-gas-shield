-- Create profile type configuration table
CREATE TABLE public.profile_type_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Field requirements (required, optional, hidden)
  phone_required BOOLEAN DEFAULT false,
  f_gas_certificate_required BOOLEAN DEFAULT false,
  avatar_required BOOLEAN DEFAULT false,
  
  -- Feature flags
  can_log_gas_movements BOOLEAN DEFAULT false,
  can_perform_inspections BOOLEAN DEFAULT false,
  can_manage_stock BOOLEAN DEFAULT false,
  can_manage_sites BOOLEAN DEFAULT false,
  can_manage_equipment BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  can_invite_members BOOLEAN DEFAULT false,
  
  -- Onboarding settings
  requires_qualification_verification BOOLEAN DEFAULT false,
  onboarding_steps JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_type_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read config
CREATE POLICY "Anyone can view profile type config"
ON public.profile_type_config FOR SELECT
TO authenticated
USING (true);

-- Seed default configuration for each role
INSERT INTO public.profile_type_config (role, display_name, description, phone_required, f_gas_certificate_required, can_log_gas_movements, can_perform_inspections, can_manage_stock, can_manage_sites, can_manage_equipment, can_view_reports, can_invite_members, requires_qualification_verification)
VALUES
  ('owner', 'Owner', 'Company owner with full access', false, false, true, true, true, true, true, true, true, false),
  ('manager', 'Manager', 'Can manage sites, equipment, and team', false, false, true, true, true, true, true, true, true, false),
  ('stores_manager', 'Gas Stores Manager', 'Manages refrigerant stock and issuance', false, false, false, false, true, false, false, true, false, false),
  ('engineer', 'Engineer', 'Performs inspections and logs gas movements', false, true, true, true, false, false, false, false, false, true),
  ('admin', 'Administrator', 'System administrator', false, false, false, false, false, true, true, true, true, false),
  ('auditor', 'Auditor', 'Read-only access for compliance audits', false, false, false, false, false, false, false, true, false, false),
  ('read_only', 'Read Only', 'View-only access', false, false, false, false, false, false, false, true, false, false);

-- Function to get profile config for a role
CREATE OR REPLACE FUNCTION public.get_profile_config_for_role(_role app_role)
RETURNS SETOF profile_type_config
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM profile_type_config WHERE role = _role LIMIT 1
$$;

-- Function to validate profile completeness for a role
CREATE OR REPLACE FUNCTION public.validate_profile_for_role(_user_id uuid, _role app_role)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config profile_type_config;
  user_profile profiles;
  missing_fields text[] := '{}';
  is_complete boolean := true;
BEGIN
  SELECT * INTO config FROM profile_type_config WHERE role = _role;
  SELECT * INTO user_profile FROM profiles WHERE user_id = _user_id;
  
  IF config IS NULL THEN
    RETURN jsonb_build_object('is_complete', false, 'error', 'Config not found for role');
  END IF;
  
  IF user_profile IS NULL THEN
    RETURN jsonb_build_object('is_complete', false, 'error', 'Profile not found');
  END IF;
  
  -- Check F-Gas certificate requirement
  IF config.f_gas_certificate_required AND (user_profile.f_gas_certificate_number IS NULL OR user_profile.f_gas_certificate_number = '') THEN
    missing_fields := array_append(missing_fields, 'f_gas_certificate_number');
    is_complete := false;
  END IF;
  
  -- Check phone requirement
  IF config.phone_required AND (user_profile.phone IS NULL OR user_profile.phone = '') THEN
    missing_fields := array_append(missing_fields, 'phone');
    is_complete := false;
  END IF;
  
  -- Check avatar requirement
  IF config.avatar_required AND (user_profile.avatar_url IS NULL OR user_profile.avatar_url = '') THEN
    missing_fields := array_append(missing_fields, 'avatar_url');
    is_complete := false;
  END IF;
  
  RETURN jsonb_build_object(
    'is_complete', is_complete,
    'missing_fields', to_jsonb(missing_fields),
    'role', _role::text,
    'display_name', config.display_name
  );
END;
$$;

-- Function to get overall profile status for a user
CREATE OR REPLACE FUNCTION public.get_user_profile_status(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_arr app_role[];
  role_status jsonb := '[]';
  current_role app_role;
  validation_result jsonb;
  all_complete boolean := true;
BEGIN
  -- Get all roles for user
  SELECT array_agg(role) INTO user_roles_arr
  FROM user_roles WHERE user_id = _user_id;
  
  IF user_roles_arr IS NULL THEN
    RETURN jsonb_build_object('has_roles', false, 'is_complete', false, 'roles', '[]'::jsonb);
  END IF;
  
  -- Validate each role
  FOREACH current_role IN ARRAY user_roles_arr
  LOOP
    validation_result := validate_profile_for_role(_user_id, current_role);
    role_status := role_status || jsonb_build_array(validation_result);
    
    IF NOT (validation_result->>'is_complete')::boolean THEN
      all_complete := false;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'has_roles', true,
    'is_complete', all_complete,
    'roles', role_status
  );
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_profile_type_config_updated_at
BEFORE UPDATE ON public.profile_type_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();