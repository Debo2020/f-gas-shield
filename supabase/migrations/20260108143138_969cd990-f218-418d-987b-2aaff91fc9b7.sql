-- Create team_invitations table for managing pending invitations
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'engineer',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations for their company
CREATE POLICY "Users can view company invitations"
ON public.team_invitations
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Owners and managers can create invitations
CREATE POLICY "Owners and managers can create invitations"
ON public.team_invitations
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Owners can delete pending invitations
CREATE POLICY "Owners can delete pending invitations"
ON public.team_invitations
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
  AND accepted_at IS NULL
);

-- Create index for faster token lookups
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_company ON public.team_invitations(company_id);