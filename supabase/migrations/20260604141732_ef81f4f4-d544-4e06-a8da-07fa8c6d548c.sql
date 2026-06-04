CREATE TABLE public.health_check_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('ok','degraded','error')),
  http_status integer,
  latency_ms integer,
  db text,
  error text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_check_log_checked_at ON public.health_check_log (checked_at DESC);

GRANT SELECT, INSERT ON public.health_check_log TO authenticated;
GRANT ALL ON public.health_check_log TO service_role;

ALTER TABLE public.health_check_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read recent health log"
  ON public.health_check_log
  FOR SELECT
  TO authenticated
  USING (checked_at > now() - interval '7 days');

CREATE POLICY "Authenticated users can insert health log entries"
  ON public.health_check_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);