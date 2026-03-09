
ALTER TABLE public.gas_certificates
  ADD COLUMN IF NOT EXISTS warning_location text,
  ADD COLUMN IF NOT EXISTS warning_make text,
  ADD COLUMN IF NOT EXISTS warning_type text,
  ADD COLUMN IF NOT EXISTS warning_model text,
  ADD COLUMN IF NOT EXISTS warning_serial_no text,
  ADD COLUMN IF NOT EXISTS fault_details text,
  ADD COLUMN IF NOT EXISTS customer_mobile text,
  ADD COLUMN IF NOT EXISTS issue_gas_escape text DEFAULT 'n/a',
  ADD COLUMN IF NOT EXISTS issue_pipework text DEFAULT 'n/a',
  ADD COLUMN IF NOT EXISTS issue_ventilation text DEFAULT 'n/a',
  ADD COLUMN IF NOT EXISTS issue_meter text DEFAULT 'n/a',
  ADD COLUMN IF NOT EXISTS issue_chimney_flue text DEFAULT 'n/a',
  ADD COLUMN IF NOT EXISTS issue_other text DEFAULT 'n/a',
  ADD COLUMN IF NOT EXISTS issue_other_description text,
  ADD COLUMN IF NOT EXISTS riddor_11_1_status text DEFAULT 'n/a',
  ADD COLUMN IF NOT EXISTS riddor_11_2_status text DEFAULT 'n/a';
