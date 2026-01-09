-- Create function to calculate required inspection frequency based on CO2e thresholds
-- Per UK F-Gas Regulation:
-- >= 500 tonnes CO2e: 3 months (quarterly)
-- >= 50 tonnes CO2e: 6 months (bi-annual)
-- >= 5 tonnes CO2e: 12 months (annual)
-- < 5 tonnes CO2e: No mandatory leak check (but we default to 12 months)

CREATE OR REPLACE FUNCTION public.get_required_inspection_frequency(co2e_tonnes NUMERIC)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF co2e_tonnes >= 500 THEN
    RETURN 3;  -- Quarterly checks for very high charge
  ELSIF co2e_tonnes >= 50 THEN
    RETURN 6;  -- Bi-annual checks for high charge
  ELSIF co2e_tonnes >= 5 THEN
    RETURN 12; -- Annual checks for medium charge
  ELSE
    RETURN 12; -- Default annual for below threshold (voluntary)
  END IF;
END;
$$;

-- Update the equipment CO2 calculation trigger to also set inspection frequency
CREATE OR REPLACE FUNCTION public.equipment_calculate_co2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  calculated_co2e NUMERIC;
  required_frequency INTEGER;
BEGIN
  -- Calculate CO2 equivalent
  calculated_co2e := calculate_co2_equivalent(NEW.refrigerant_type, NEW.refrigerant_charge_kg);
  NEW.co2_equivalent_tonnes := calculated_co2e;
  
  -- Calculate required inspection frequency based on CO2e
  required_frequency := get_required_inspection_frequency(calculated_co2e);
  
  -- Only update inspection_frequency_months if it's not manually set to a stricter schedule
  -- or if it's a new record (no existing value)
  IF NEW.inspection_frequency_months IS NULL OR NEW.inspection_frequency_months > required_frequency THEN
    NEW.inspection_frequency_months := required_frequency;
  END IF;
  
  -- Recalculate next inspection due if we have a last inspection date
  IF NEW.last_inspection_date IS NOT NULL THEN
    NEW.next_inspection_due := NEW.last_inspection_date + (NEW.inspection_frequency_months || ' months')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist (it should already exist, but ensure it's there)
DROP TRIGGER IF EXISTS equipment_co2_trigger ON public.equipment;
CREATE TRIGGER equipment_co2_trigger
  BEFORE INSERT OR UPDATE OF refrigerant_type, refrigerant_charge_kg, inspection_frequency_months
  ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.equipment_calculate_co2();