-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_gas_certificates_company_type ON public.gas_certificates (company_id, certificate_type);
CREATE INDEX IF NOT EXISTS idx_gas_certificates_company_date ON public.gas_certificates (company_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_equipment_date ON public.inspections (equipment_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_company_date ON public.inspections (company_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_company_site ON public.equipment (company_id, site_id);
CREATE INDEX IF NOT EXISTS idx_refrigerant_movements_company_date ON public.refrigerant_movements (company_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_refrigerant_movements_engineer ON public.refrigerant_movements (engineer_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_refrigerant_cylinders_company_status ON public.refrigerant_cylinders (company_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_company_type ON public.documents (company_id, document_type);
CREATE INDEX IF NOT EXISTS idx_sites_company ON public.sites (company_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_user_licenses_company_status ON public.user_licenses (company_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_company_email ON public.team_invitations (company_id, email);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_action ON public.audit_log (org_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leak_checks_org_site ON public.leak_checks (org_id, site_id);