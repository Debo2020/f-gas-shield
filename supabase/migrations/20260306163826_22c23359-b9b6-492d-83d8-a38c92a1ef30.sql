
-- Add Gas Safe Registration Number to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS gas_safe_reg_no text;

-- Add Gas Safe ID Card Number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gas_safe_id_card_no text;

-- Add new columns to gas_certificate_appliances
ALTER TABLE public.gas_certificate_appliances ADD COLUMN IF NOT EXISTS landlord_appliance boolean DEFAULT false;
ALTER TABLE public.gas_certificate_appliances ADD COLUMN IF NOT EXISTS appliance_serviced boolean DEFAULT false;
ALTER TABLE public.gas_certificate_appliances ADD COLUMN IF NOT EXISTS high_co_ratio numeric;
ALTER TABLE public.gas_certificate_appliances ADD COLUMN IF NOT EXISTS low_co_ratio numeric;
ALTER TABLE public.gas_certificate_appliances ADD COLUMN IF NOT EXISTS flue_performance_test text;
