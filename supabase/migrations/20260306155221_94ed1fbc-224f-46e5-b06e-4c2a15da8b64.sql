
CREATE TABLE public.contact_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- No RLS needed - only accessed by edge function via service role
ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;

-- Index for efficient lookups
CREATE INDEX idx_contact_rate_limits_ip_created ON public.contact_rate_limits (ip_hash, created_at);
