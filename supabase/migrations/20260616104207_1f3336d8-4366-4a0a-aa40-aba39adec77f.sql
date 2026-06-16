
-- Partners
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text,
  logo_url text,
  commission_pct numeric(5,2) DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view partners" ON public.partners
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can insert partners" ON public.partners
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update partners" ON public.partners
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete partners" ON public.partners
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Partner codes
CREATE TABLE public.partner_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  stripe_coupon_id text,
  stripe_promotion_code_id text,
  max_redemptions integer,
  redemptions_used integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_codes_partner_id_idx ON public.partner_codes(partner_id);
CREATE INDEX partner_codes_stripe_promo_idx ON public.partner_codes(stripe_promotion_code_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_codes TO authenticated;
GRANT ALL ON public.partner_codes TO service_role;
ALTER TABLE public.partner_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view partner codes" ON public.partner_codes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can insert partner codes" ON public.partner_codes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update partner codes" ON public.partner_codes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete partner codes" ON public.partner_codes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER partner_codes_updated_at BEFORE UPDATE ON public.partner_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Partner redemptions
CREATE TABLE public.partner_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code_id uuid NOT NULL REFERENCES public.partner_codes(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  tier text,
  plan_interval text,
  mrr_pennies integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_subscription_id)
);
CREATE INDEX partner_redemptions_partner_idx ON public.partner_redemptions(partner_id);
CREATE INDEX partner_redemptions_code_idx ON public.partner_redemptions(partner_code_id);
CREATE INDEX partner_redemptions_company_idx ON public.partner_redemptions(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_redemptions TO authenticated;
GRANT ALL ON public.partner_redemptions TO service_role;
ALTER TABLE public.partner_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view partner redemptions" ON public.partner_redemptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can insert partner redemptions" ON public.partner_redemptions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update partner redemptions" ON public.partner_redemptions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER partner_redemptions_updated_at BEFORE UPDATE ON public.partner_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
