-- ==============================================
-- MIGRATION: Organization Memberships & Helper Functions
-- ==============================================

-- Create organization_memberships for multi-org support
CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'engineer',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships(user_id);

-- Enable RLS
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user has membership in org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Helper function: get user's role in an org
CREATE OR REPLACE FUNCTION public.get_org_role(_user_id uuid, _org_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM organization_memberships
  WHERE user_id = _user_id AND org_id = _org_id
$$;

-- Helper function: check if user is admin-level in org (uses only existing roles)
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role 
  FROM organization_memberships
  WHERE user_id = _user_id AND org_id = _org_id;
  
  RETURN user_role IN ('owner', 'admin');
END;
$$;

-- ==============================================
-- AUDIT LOG
-- ==============================================

-- Create audit action enum
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'membership_created',
    'membership_updated', 
    'membership_deleted',
    'role_changed',
    'equipment_deleted',
    'site_deleted',
    'document_deleted',
    'export_generated',
    'settings_updated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log helper function
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _org_id uuid,
  _action audit_action,
  _target_table text,
  _target_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO audit_log (org_id, actor_user_id, action, target_table, target_id, metadata)
  VALUES (_org_id, auth.uid(), _action, _target_table, _target_id, _metadata)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- ==============================================
-- QUALIFICATIONS TABLE
-- ==============================================

-- Qualification type enum
DO $$ BEGIN
  CREATE TYPE qualification_type AS ENUM (
    'f_gas_category_1',
    'f_gas_category_2', 
    'f_gas_category_3',
    'f_gas_category_4',
    'acs',
    'city_guilds',
    'nvq',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Qualifications table
CREATE TABLE IF NOT EXISTS public.qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qualification_type qualification_type NOT NULL,
  certificate_number text NOT NULL,
  issuing_body text,
  issued_on date NOT NULL,
  expires_on date,
  document_url text,
  verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qualifications_org ON qualifications(org_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_user ON qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_expiry ON qualifications(expires_on);

-- Enable RLS
ALTER TABLE qualifications ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- LEAK CHECKS TABLE
-- ==============================================

-- Leak check result enum  
DO $$ BEGIN
  CREATE TYPE leak_check_result AS ENUM (
    'pass',
    'fail_leak_found',
    'fail_inaccessible',
    'pending',
    'overdue'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Leak checks table
CREATE TABLE IF NOT EXISTS public.leak_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  completed_date date,
  result leak_check_result NOT NULL DEFAULT 'pending',
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  leak_location text,
  leak_rate_kg_per_year numeric,
  repair_required boolean DEFAULT false,
  repair_completed boolean DEFAULT false,
  repair_date date,
  next_check_due date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leak_checks_org ON leak_checks(org_id);
CREATE INDEX IF NOT EXISTS idx_leak_checks_asset ON leak_checks(asset_id);
CREATE INDEX IF NOT EXISTS idx_leak_checks_due ON leak_checks(due_date);
CREATE INDEX IF NOT EXISTS idx_leak_checks_result ON leak_checks(result);

-- Enable RLS
ALTER TABLE leak_checks ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- SOFT DELETE & GWP ENHANCEMENTS
-- ==============================================

-- Add soft delete to sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Add soft delete to equipment  
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Add GWP column to equipment for reference
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS gwp integer;

-- Create trigger to auto-compute CO2e on equipment insert/update
CREATE OR REPLACE FUNCTION public.compute_equipment_co2e()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- GWP lookup table (UK F-Gas Regulation values)
  NEW.gwp := CASE NEW.refrigerant_type
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
  
  -- Calculate CO2e in tonnes: (charge_kg * gwp) / 1000
  NEW.co2_equivalent_tonnes := ROUND((NEW.refrigerant_charge_kg * NEW.gwp) / 1000, 3);
  
  RETURN NEW;
END;
$$;

-- Create/replace the trigger
DROP TRIGGER IF EXISTS equipment_compute_co2e ON equipment;
CREATE TRIGGER equipment_compute_co2e
  BEFORE INSERT OR UPDATE OF refrigerant_type, refrigerant_charge_kg ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION compute_equipment_co2e();

-- Constraint: no negative refrigerant quantities (only add if not exists)
DO $$ BEGIN
  ALTER TABLE equipment ADD CONSTRAINT check_positive_charge 
    CHECK (refrigerant_charge_kg >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE refrigerant_movements ADD CONSTRAINT check_positive_weight
    CHECK (weight_kg >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- Organization Memberships Policies
CREATE POLICY "Users can view org memberships"
ON organization_memberships FOR SELECT
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Admins can create memberships"
ON organization_memberships FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Admins can update memberships"
ON organization_memberships FOR UPDATE
USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Owners can delete memberships"
ON organization_memberships FOR DELETE
USING (get_org_role(auth.uid(), org_id) = 'owner');

-- Audit Log Policies
CREATE POLICY "Admins can view audit logs"
ON audit_log FOR SELECT
USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Members can insert audit logs"
ON audit_log FOR INSERT
WITH CHECK (is_org_member(auth.uid(), org_id));

-- Qualifications Policies
CREATE POLICY "Members can view qualifications"
ON qualifications FOR SELECT
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Users can create own qualifications"
ON qualifications FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

CREATE POLICY "Admins or owners can update qualifications"
ON qualifications FOR UPDATE
USING (is_org_admin(auth.uid(), org_id) OR user_id = auth.uid());

CREATE POLICY "Owners can delete qualifications"
ON qualifications FOR DELETE
USING (get_org_role(auth.uid(), org_id) = 'owner');

-- Leak Checks Policies
CREATE POLICY "Members can view leak checks"
ON leak_checks FOR SELECT
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can create leak checks"
ON leak_checks FOR INSERT
WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can update leak checks"
ON leak_checks FOR UPDATE
USING (is_org_admin(auth.uid(), org_id) OR checked_by = auth.uid());

CREATE POLICY "Owners can delete leak checks"
ON leak_checks FOR DELETE
USING (get_org_role(auth.uid(), org_id) = 'owner');

-- ==============================================
-- STORAGE BUCKETS
-- ==============================================

-- Asset photos bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-photos', 
  'asset-photos', 
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Audit exports bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-exports',
  'audit-exports',
  false,
  52428800,
  ARRAY['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for asset-photos
CREATE POLICY "Org members can view asset photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'asset-photos'
  AND is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Org members can upload asset photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'asset-photos'
  AND is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Admins can delete asset photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'asset-photos'
  AND is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Storage Policies for audit-exports
CREATE POLICY "Admins can view audit exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audit-exports'
  AND is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);