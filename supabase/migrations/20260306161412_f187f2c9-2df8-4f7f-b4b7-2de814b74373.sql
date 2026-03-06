
-- ============================================================
-- SECURITY HARDENING: Migrate all RLS policies from TO public to TO authenticated
-- This prevents unauthenticated users from hitting policy expressions
-- ============================================================

-- ========================
-- addon_licenses (4 policies)
-- ========================
DROP POLICY IF EXISTS "Owners and managers can create addon licenses" ON public.addon_licenses;
CREATE POLICY "Owners and managers can create addon licenses" ON public.addon_licenses
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners and managers can update addon licenses" ON public.addon_licenses;
CREATE POLICY "Owners and managers can update addon licenses" ON public.addon_licenses
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete addon licenses" ON public.addon_licenses;
CREATE POLICY "Owners can delete addon licenses" ON public.addon_licenses
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view company addon licenses" ON public.addon_licenses;
CREATE POLICY "Users can view company addon licenses" ON public.addon_licenses
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- ai_credit_usage (1 policy - SELECT only, INSERT already service_role)
-- ========================
DROP POLICY IF EXISTS "Company members can view usage" ON public.ai_credit_usage;
CREATE POLICY "Company members can view usage" ON public.ai_credit_usage
  FOR SELECT TO authenticated
  USING (company_id IN ( SELECT profiles.company_id FROM profiles WHERE (profiles.user_id = auth.uid())));

-- ========================
-- audit_log (2 policies)
-- ========================
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
CREATE POLICY "Admins can view audit logs" ON public.audit_log
  FOR SELECT TO authenticated
  USING (is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS "Members can insert audit logs" ON public.audit_log;
CREATE POLICY "Members can insert audit logs" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- ========================
-- client_users (4 policies)
-- ========================
DROP POLICY IF EXISTS "Owners and managers can create client users" ON public.client_users;
CREATE POLICY "Owners and managers can create client users" ON public.client_users
  FOR INSERT TO authenticated
  WITH CHECK ((client_id IN ( SELECT clients.id FROM clients WHERE (clients.company_id = get_user_company_id(auth.uid())))) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners and managers can update client users" ON public.client_users;
CREATE POLICY "Owners and managers can update client users" ON public.client_users
  FOR UPDATE TO authenticated
  USING ((client_id IN ( SELECT clients.id FROM clients WHERE (clients.company_id = get_user_company_id(auth.uid())))) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete client users" ON public.client_users;
CREATE POLICY "Owners can delete client users" ON public.client_users
  FOR DELETE TO authenticated
  USING ((client_id IN ( SELECT clients.id FROM clients WHERE (clients.company_id = get_user_company_id(auth.uid())))) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view company client users" ON public.client_users;
CREATE POLICY "Users can view company client users" ON public.client_users
  FOR SELECT TO authenticated
  USING (client_id IN ( SELECT clients.id FROM clients WHERE (clients.company_id = get_user_company_id(auth.uid()))));

-- ========================
-- clients (4 policies)
-- ========================
DROP POLICY IF EXISTS "Owners and managers can create clients" ON public.clients;
CREATE POLICY "Owners and managers can create clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners and managers can update clients" ON public.clients;
CREATE POLICY "Owners and managers can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete clients" ON public.clients;
CREATE POLICY "Owners can delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view company clients" ON public.clients;
CREATE POLICY "Users can view company clients" ON public.clients
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- company_certificates (4 policies)
-- ========================
DROP POLICY IF EXISTS "Owners and managers can create certificates" ON public.company_certificates;
CREATE POLICY "Owners and managers can create certificates" ON public.company_certificates
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners and managers can update certificates" ON public.company_certificates;
CREATE POLICY "Owners and managers can update certificates" ON public.company_certificates
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete certificates" ON public.company_certificates;
CREATE POLICY "Owners can delete certificates" ON public.company_certificates
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view company certificates" ON public.company_certificates;
CREATE POLICY "Users can view company certificates" ON public.company_certificates
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- company_subscriptions (3 policies)
-- ========================
DROP POLICY IF EXISTS "Owners can insert company subscription" ON public.company_subscriptions;
CREATE POLICY "Owners can insert company subscription" ON public.company_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners can update company subscription" ON public.company_subscriptions;
CREATE POLICY "Owners can update company subscription" ON public.company_subscriptions
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view their company subscription" ON public.company_subscriptions;
CREATE POLICY "Users can view their company subscription" ON public.company_subscriptions
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- documents (7 policies)
-- ========================
DROP POLICY IF EXISTS "Authenticated users can create documents" ON public.documents;
CREATE POLICY "Authenticated users can create documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Owners and managers can update documents" ON public.documents;
CREATE POLICY "Owners and managers can update documents" ON public.documents
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete documents" ON public.documents;
CREATE POLICY "Owners can delete documents" ON public.documents
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can create their own profile documents" ON public.documents;
CREATE POLICY "Users can create their own profile documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND ((profile_id IS NULL) OR (profile_id IN ( SELECT profiles.id FROM profiles WHERE (profiles.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Users can delete their own profile documents" ON public.documents;
CREATE POLICY "Users can delete their own profile documents" ON public.documents
  FOR DELETE TO authenticated
  USING (profile_id IN ( SELECT profiles.id FROM profiles WHERE (profiles.user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can view company documents" ON public.documents;
CREATE POLICY "Users can view company documents" ON public.documents
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own profile documents" ON public.documents;
CREATE POLICY "Users can view their own profile documents" ON public.documents
  FOR SELECT TO authenticated
  USING (profile_id IN ( SELECT profiles.id FROM profiles WHERE (profiles.user_id = auth.uid())));

-- ========================
-- equipment (4 policies)
-- ========================
DROP POLICY IF EXISTS "Owners and managers can create equipment" ON public.equipment;
CREATE POLICY "Owners and managers can create equipment" ON public.equipment
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners and managers can update equipment" ON public.equipment;
CREATE POLICY "Owners and managers can update equipment" ON public.equipment
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete equipment" ON public.equipment;
CREATE POLICY "Owners can delete equipment" ON public.equipment
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view company equipment" ON public.equipment;
CREATE POLICY "Users can view company equipment" ON public.equipment
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- inspections (4 policies)
-- ========================
DROP POLICY IF EXISTS "Authenticated users can create inspections" ON public.inspections;
CREATE POLICY "Authenticated users can create inspections" ON public.inspections
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Owners and managers can update inspections" ON public.inspections;
CREATE POLICY "Owners and managers can update inspections" ON public.inspections
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete inspections" ON public.inspections;
CREATE POLICY "Owners can delete inspections" ON public.inspections
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view company inspections" ON public.inspections;
CREATE POLICY "Users can view company inspections" ON public.inspections
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- leak_checks (4 policies)
-- ========================
DROP POLICY IF EXISTS "Members can create leak checks" ON public.leak_checks;
CREATE POLICY "Members can create leak checks" ON public.leak_checks
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Members can update leak checks" ON public.leak_checks;
CREATE POLICY "Members can update leak checks" ON public.leak_checks
  FOR UPDATE TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR (checked_by = auth.uid()));

DROP POLICY IF EXISTS "Members can view leak checks" ON public.leak_checks;
CREATE POLICY "Members can view leak checks" ON public.leak_checks
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Owners can delete leak checks" ON public.leak_checks;
CREATE POLICY "Owners can delete leak checks" ON public.leak_checks
  FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), org_id) = 'owner'::app_role);

-- ========================
-- organization_memberships (4 policies)
-- ========================
DROP POLICY IF EXISTS "Admins can create memberships" ON public.organization_memberships;
CREATE POLICY "Admins can create memberships" ON public.organization_memberships
  FOR INSERT TO authenticated
  WITH CHECK (is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can update memberships" ON public.organization_memberships;
CREATE POLICY "Admins can update memberships" ON public.organization_memberships
  FOR UPDATE TO authenticated
  USING (is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS "Owners can delete memberships" ON public.organization_memberships;
CREATE POLICY "Owners can delete memberships" ON public.organization_memberships
  FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), org_id) = 'owner'::app_role);

DROP POLICY IF EXISTS "Users can view org memberships" ON public.organization_memberships;
CREATE POLICY "Users can view org memberships" ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), org_id));

-- ========================
-- profiles (2 policies - INSERT/UPDATE already authenticated)
-- ========================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners and admins can view company profiles" ON public.profiles;
CREATE POLICY "Owners and admins can view company profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING ((company_id IS NOT NULL) AND is_org_admin(auth.uid(), company_id));

-- ========================
-- qualifications (4 policies)
-- ========================
DROP POLICY IF EXISTS "Users can create own qualifications" ON public.qualifications;
CREATE POLICY "Users can create own qualifications" ON public.qualifications
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()) AND is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins or owners can update qualifications" ON public.qualifications;
CREATE POLICY "Admins or owners can update qualifications" ON public.qualifications
  FOR UPDATE TO authenticated
  USING (is_org_admin(auth.uid(), org_id) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can view qualifications" ON public.qualifications;
CREATE POLICY "Members can view qualifications" ON public.qualifications
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), org_id));

DROP POLICY IF EXISTS "Owners can delete qualifications" ON public.qualifications;
CREATE POLICY "Owners can delete qualifications" ON public.qualifications
  FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), org_id) = 'owner'::app_role);

-- ========================
-- refrigerant_cylinders (5 policies)
-- ========================
DROP POLICY IF EXISTS "Engineers can check out/in cylinders" ON public.refrigerant_cylinders;
CREATE POLICY "Engineers can check out/in cylinders" ON public.refrigerant_cylinders
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Owners can delete cylinders" ON public.refrigerant_cylinders;
CREATE POLICY "Owners can delete cylinders" ON public.refrigerant_cylinders
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners managers and stores managers can create cylinders" ON public.refrigerant_cylinders;
CREATE POLICY "Owners managers and stores managers can create cylinders" ON public.refrigerant_cylinders
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'stores_manager'::app_role)));

DROP POLICY IF EXISTS "Owners managers and stores managers can update cylinders" ON public.refrigerant_cylinders;
CREATE POLICY "Owners managers and stores managers can update cylinders" ON public.refrigerant_cylinders
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'stores_manager'::app_role)));

DROP POLICY IF EXISTS "Users can view company cylinders" ON public.refrigerant_cylinders;
CREATE POLICY "Users can view company cylinders" ON public.refrigerant_cylinders
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- refrigerant_movements (5 policies)
-- ========================
DROP POLICY IF EXISTS "Engineers can view own movements" ON public.refrigerant_movements;
CREATE POLICY "Engineers can view own movements" ON public.refrigerant_movements
  FOR SELECT TO authenticated
  USING ((engineer_id = auth.uid()) AND (company_id = get_user_company_id(auth.uid())));

DROP POLICY IF EXISTS "Managers and owners can update company movements" ON public.refrigerant_movements;
CREATE POLICY "Managers and owners can update company movements" ON public.refrigerant_movements
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Managers and owners can view all company movements" ON public.refrigerant_movements;
CREATE POLICY "Managers and owners can view all company movements" ON public.refrigerant_movements
  FOR SELECT TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete company movements" ON public.refrigerant_movements;
CREATE POLICY "Owners can delete company movements" ON public.refrigerant_movements
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can insert own movements" ON public.refrigerant_movements;
CREATE POLICY "Users can insert own movements" ON public.refrigerant_movements
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (engineer_id = auth.uid()));

-- ========================
-- sites (5 policies)
-- ========================
DROP POLICY IF EXISTS "Client users can view their allocated sites" ON public.sites;
CREATE POLICY "Client users can view their allocated sites" ON public.sites
  FOR SELECT TO authenticated
  USING (client_id IN ( SELECT client_users.client_id FROM client_users WHERE ((client_users.user_id = auth.uid()) AND (client_users.status = 'active'::text))));

DROP POLICY IF EXISTS "Owners and managers can create sites" ON public.sites;
CREATE POLICY "Owners and managers can create sites" ON public.sites
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners and managers can update sites" ON public.sites;
CREATE POLICY "Owners and managers can update sites" ON public.sites
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete sites" ON public.sites;
CREATE POLICY "Owners can delete sites" ON public.sites
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view company sites" ON public.sites;
CREATE POLICY "Users can view company sites" ON public.sites
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- suppliers (4 policies)
-- ========================
DROP POLICY IF EXISTS "Owners can delete suppliers" ON public.suppliers;
CREATE POLICY "Owners can delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners managers and stores managers can create suppliers" ON public.suppliers;
CREATE POLICY "Owners managers and stores managers can create suppliers" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'stores_manager'::app_role)));

DROP POLICY IF EXISTS "Owners managers and stores managers can update suppliers" ON public.suppliers;
CREATE POLICY "Owners managers and stores managers can update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'stores_manager'::app_role)));

DROP POLICY IF EXISTS "Users can view company suppliers" ON public.suppliers;
CREATE POLICY "Users can view company suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- team_invitations (3 policies - UPDATE already authenticated)
-- ========================
DROP POLICY IF EXISTS "Owners and managers can create invitations" ON public.team_invitations;
CREATE POLICY "Owners and managers can create invitations" ON public.team_invitations
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete pending invitations" ON public.team_invitations;
CREATE POLICY "Owners can delete pending invitations" ON public.team_invitations
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role) AND (accepted_at IS NULL));

DROP POLICY IF EXISTS "Users can view company invitations" ON public.team_invitations;
CREATE POLICY "Users can view company invitations" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ========================
-- user_licenses (4 policies)
-- ========================
DROP POLICY IF EXISTS "Owners and managers can create licenses" ON public.user_licenses;
CREATE POLICY "Owners and managers can create licenses" ON public.user_licenses
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners and managers can update licenses" ON public.user_licenses;
CREATE POLICY "Owners and managers can update licenses" ON public.user_licenses
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY IF EXISTS "Owners can delete licenses" ON public.user_licenses;
CREATE POLICY "Owners can delete licenses" ON public.user_licenses
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can view company licenses" ON public.user_licenses;
CREATE POLICY "Users can view company licenses" ON public.user_licenses
  FOR SELECT TO authenticated
  USING ((company_id = get_user_company_id(auth.uid())) OR (user_id = auth.uid()));
