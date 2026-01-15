-- Add Stripe tracking columns to ai_credit_usage
ALTER TABLE public.ai_credit_usage 
ADD COLUMN IF NOT EXISTS stripe_meter_event_id TEXT,
ADD COLUMN IF NOT EXISTS reported_to_stripe BOOLEAN DEFAULT false;

-- Add metered subscription item ID to company_subscriptions
ALTER TABLE public.company_subscriptions
ADD COLUMN IF NOT EXISTS metered_subscription_item_id TEXT;

-- Create index for unreported usage (for batch reporting job)
CREATE INDEX IF NOT EXISTS idx_ai_credit_usage_unreported 
ON public.ai_credit_usage (company_id, reported_to_stripe) 
WHERE reported_to_stripe = false;