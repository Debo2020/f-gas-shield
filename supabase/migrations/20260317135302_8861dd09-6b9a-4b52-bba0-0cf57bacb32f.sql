
-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_ref text NOT NULL,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  user_role text,
  org_name text,
  issue_type text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  affected_module text,
  description text NOT NULL,
  steps_to_reproduce text,
  is_recurring boolean DEFAULT false,
  page_url text,
  browser_info text,
  app_version text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Support ticket attachments table
CREATE TABLE public.support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate ticket_ref
CREATE OR REPLACE FUNCTION public.generate_ticket_ref()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN ticket_ref ~ '^FT-[0-9]+$'
    THEN CAST(SUBSTRING(ticket_ref FROM 'FT-([0-9]+)$') AS integer)
    ELSE 0 END
  ), 0) + 1
  INTO next_num
  FROM support_tickets;

  NEW.ticket_ref := 'FT-' || LPAD(next_num::text, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_ticket_ref
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_ref();

-- Updated_at trigger
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Users can insert tickets for themselves
CREATE POLICY "Users can insert own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id(auth.uid()));

-- Users can view own tickets
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owners/managers can view all company tickets
CREATE POLICY "Owners managers can view company tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Attachments: users can insert for own tickets
CREATE POLICY "Users can insert own ticket attachments"
  ON public.support_ticket_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );

-- Attachments: users can view own ticket attachments
CREATE POLICY "Users can view own ticket attachments"
  ON public.support_ticket_attachments FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );

-- Owners/managers can view all company ticket attachments
CREATE POLICY "Owners managers can view company ticket attachments"
  ON public.support_ticket_attachments FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to support-attachments
CREATE POLICY "Authenticated users can upload support attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'support-attachments');

CREATE POLICY "Users can view own support attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'support-attachments');
