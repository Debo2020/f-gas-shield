
-- Trigger function to enforce single owner per company
CREATE OR REPLACE FUNCTION public.enforce_single_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    IF EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.role = 'owner'
        AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = NEW.user_id)
        AND ur.user_id != NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Only one owner is allowed per company';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_single_owner
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_owner();
