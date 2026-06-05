
DO $$ BEGIN
  CREATE TYPE public.cylinder_identifier_source AS ENUM ('internal','boc','linde','a_gas','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.refrigerant_cylinders
  ADD COLUMN IF NOT EXISTS manufacturer_serial text,
  ADD COLUMN IF NOT EXISTS supplier_barcode text,
  ADD COLUMN IF NOT EXISTS rfid_tag text,
  ADD COLUMN IF NOT EXISTS identifier_source public.cylinder_identifier_source NOT NULL DEFAULT 'internal';

CREATE UNIQUE INDEX IF NOT EXISTS refrigerant_cylinders_company_serial_uniq
  ON public.refrigerant_cylinders (company_id, manufacturer_serial)
  WHERE manufacturer_serial IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refrigerant_cylinders_company_barcode_uniq
  ON public.refrigerant_cylinders (company_id, supplier_barcode)
  WHERE supplier_barcode IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refrigerant_cylinders_company_rfid_uniq
  ON public.refrigerant_cylinders (company_id, rfid_tag)
  WHERE rfid_tag IS NOT NULL;

ALTER TABLE public.refrigerant_movements
  ADD COLUMN IF NOT EXISTS identifier_used text,
  ADD COLUMN IF NOT EXISTS identifier_type text;
