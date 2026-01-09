-- Create company_subscriptions table to track subscription details
CREATE TABLE public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'premium', 'enterprise')),
  license_count INTEGER NOT NULL DEFAULT 1 CHECK (license_count >= 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_licenses table to track individual license assignments
CREATE TABLE public.user_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'pending')),
  license_type TEXT NOT NULL DEFAULT 'engineer' CHECK (license_type IN ('owner', 'manager', 'engineer')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_company_user UNIQUE (company_id, user_id),
  CONSTRAINT unique_company_email UNIQUE (company_id, email),
  CONSTRAINT user_or_email_required CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_subscriptions
CREATE POLICY "Users can view their company subscription"
  ON public.company_subscriptions FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners can insert company subscription"
  ON public.company_subscriptions FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update company subscription"
  ON public.company_subscriptions FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for user_licenses
CREATE POLICY "Users can view company licenses"
  ON public.user_licenses FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Owners and managers can create licenses"
  ON public.user_licenses FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Owners and managers can update licenses"
  ON public.user_licenses FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Owners can delete licenses"
  ON public.user_licenses FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND has_role(auth.uid(), 'owner'::app_role)
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_company_subscriptions_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_licenses_updated_at
  BEFORE UPDATE ON public.user_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get license count for a company
CREATE OR REPLACE FUNCTION public.get_company_license_count(company_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_licenses
  WHERE company_id = company_uuid AND status IN ('active', 'pending');
$$;

-- Create function to check if company has available licenses
CREATE OR REPLACE FUNCTION public.has_available_license(company_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT license_count FROM public.company_subscriptions WHERE company_id = company_uuid
  ) > (
    SELECT COUNT(*) FROM public.user_licenses WHERE company_id = company_uuid AND status IN ('active', 'pending')
  );
$$;