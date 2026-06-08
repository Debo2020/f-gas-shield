
-- 1) Restrict addon_licenses SELECT to owners/managers (emails exposure)
DROP POLICY IF EXISTS "Users can view company addon licenses" ON public.addon_licenses;

CREATE POLICY "Owners and managers can view addon licenses"
ON public.addon_licenses
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- 2) Remove permissive authenticated INSERT on health_check_log;
--    service role bypasses RLS and remains able to write.
DROP POLICY IF EXISTS "Authenticated users can insert health log entries" ON public.health_check_log;
