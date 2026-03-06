-- Add restrictive RLS policies to contact_rate_limits
-- Only service_role (used by edge function) can insert; no client access needed
CREATE POLICY "Service role only insert"
ON public.contact_rate_limits FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Service role only select"
ON public.contact_rate_limits FOR SELECT
TO authenticated
USING (false);