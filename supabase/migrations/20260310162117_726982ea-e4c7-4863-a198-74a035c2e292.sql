
-- Activation Events table
CREATE TABLE public.activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type)
);

ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company activation events"
  ON public.activation_events FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own activation events"
  ON public.activation_events FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());

-- Activation Scores table
CREATE TABLE public.activation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  total_score integer NOT NULL DEFAULT 0,
  is_activated boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company activation scores"
  ON public.activation_scores FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can upsert own activation scores"
  ON public.activation_scores FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own activation scores"
  ON public.activation_scores FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Onboarding Progress table
CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  step_create_site boolean NOT NULL DEFAULT false,
  step_add_equipment boolean NOT NULL DEFAULT false,
  step_first_inspection boolean NOT NULL DEFAULT false,
  step_first_certificate boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding progress"
  ON public.onboarding_progress FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own onboarding progress"
  ON public.onboarding_progress FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own onboarding progress"
  ON public.onboarding_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Onboarding Nudges table
CREATE TABLE public.onboarding_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nudge_type text NOT NULL,
  delivered_via text NOT NULL DEFAULT 'email',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, nudge_type)
);

ALTER TABLE public.onboarding_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nudges"
  ON public.onboarding_nudges FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own nudges"
  ON public.onboarding_nudges FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());

-- Trial Status table
CREATE TABLE public.trial_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  trial_start timestamptz NOT NULL DEFAULT now(),
  trial_end timestamptz NOT NULL,
  extended boolean NOT NULL DEFAULT false,
  extended_at timestamptz,
  extension_reason text,
  converted_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company trial status"
  ON public.trial_status FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Recalculate activation score function
CREATE OR REPLACE FUNCTION public.recalculate_activation_score(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total integer;
  _company_id uuid;
  _activated boolean;
BEGIN
  SELECT COALESCE(SUM(score), 0) INTO _total
  FROM activation_events WHERE user_id = _user_id;

  SELECT company_id INTO _company_id
  FROM profiles WHERE user_id = _user_id;

  _activated := _total >= 70;

  INSERT INTO activation_scores (user_id, company_id, total_score, is_activated, activated_at, updated_at)
  VALUES (
    _user_id,
    _company_id,
    _total,
    _activated,
    CASE WHEN _activated THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_score = EXCLUDED.total_score,
    is_activated = EXCLUDED.is_activated,
    activated_at = CASE 
      WHEN EXCLUDED.is_activated AND NOT activation_scores.is_activated THEN now()
      WHEN NOT EXCLUDED.is_activated THEN NULL
      ELSE activation_scores.activated_at
    END,
    updated_at = now();
END;
$$;
