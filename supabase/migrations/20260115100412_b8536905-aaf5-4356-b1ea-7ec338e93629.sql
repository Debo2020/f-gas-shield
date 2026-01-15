-- Create AI credit usage tracking table
CREATE TABLE public.ai_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  request_type TEXT NOT NULL DEFAULT 'compliance_chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient monthly queries
CREATE INDEX idx_ai_credit_usage_company_month 
  ON public.ai_credit_usage(company_id, created_at);

-- Enable RLS
ALTER TABLE public.ai_credit_usage ENABLE ROW LEVEL SECURITY;

-- Company members can view their company's usage
CREATE POLICY "Company members can view usage"
  ON public.ai_credit_usage FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Service role can insert usage records (edge functions use service role)
CREATE POLICY "Service can insert usage"
  ON public.ai_credit_usage FOR INSERT
  WITH CHECK (true);