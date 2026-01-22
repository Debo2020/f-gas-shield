
-- Create clients table
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add client_id to sites table
ALTER TABLE public.sites ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create client_users table for portal access
CREATE TABLE public.client_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  invited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_clients_company_id ON public.clients(company_id);
CREATE INDEX idx_sites_client_id ON public.sites(client_id);
CREATE INDEX idx_client_users_client_id ON public.client_users(client_id);
CREATE INDEX idx_client_users_user_id ON public.client_users(user_id);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Users can view company clients"
  ON public.clients FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners and managers can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND 
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Owners and managers can update clients"
  ON public.clients FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid()) AND 
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Owners can delete clients"
  ON public.clients FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid()) AND 
    has_role(auth.uid(), 'owner'::app_role)
  );

-- RLS Policies for client_users table
CREATE POLICY "Users can view company client users"
  ON public.client_users FOR SELECT
  USING (
    client_id IN (SELECT id FROM public.clients WHERE company_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Owners and managers can create client users"
  ON public.client_users FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE company_id = get_user_company_id(auth.uid())
    ) AND 
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Owners and managers can update client users"
  ON public.client_users FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE company_id = get_user_company_id(auth.uid())
    ) AND 
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Owners can delete client users"
  ON public.client_users FOR DELETE
  USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE company_id = get_user_company_id(auth.uid())
    ) AND 
    has_role(auth.uid(), 'owner'::app_role)
  );

-- Client users can view their own client's sites
CREATE POLICY "Client users can view their allocated sites"
  ON public.sites FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_users_updated_at
  BEFORE UPDATE ON public.client_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
