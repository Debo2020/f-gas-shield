-- Add token column to user_licenses for secure invitation acceptance
ALTER TABLE public.user_licenses 
ADD COLUMN IF NOT EXISTS token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_user_licenses_token ON public.user_licenses(token);