
-- Create error_logs table
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  error_message text NOT NULL,
  error_stack text,
  component_name text,
  url text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Service-role-only insert (client inserts blocked; edge function uses service role)
CREATE POLICY "Service role only insert" ON public.error_logs FOR INSERT TO authenticated WITH CHECK (false);

-- Admins can SELECT error logs for their company
CREATE POLICY "Admins can view company error logs" ON public.error_logs FOR SELECT TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Indexes
CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at);
CREATE INDEX idx_error_logs_company_id ON public.error_logs (company_id);
