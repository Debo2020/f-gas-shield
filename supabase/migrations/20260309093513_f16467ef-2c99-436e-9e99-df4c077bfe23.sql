
-- Add comprehensive Testing & Purging fields to gas_certificates table
ALTER TABLE public.gas_certificates
  -- Strength Test fields
  ADD COLUMN IF NOT EXISTS strength_test_method text,
  ADD COLUMN IF NOT EXISTS strength_installation_type text,
  ADD COLUMN IF NOT EXISTS strength_components_isolated boolean,
  ADD COLUMN IF NOT EXISTS strength_calculated_stp_mbar numeric,
  ADD COLUMN IF NOT EXISTS strength_test_medium text,
  ADD COLUMN IF NOT EXISTS strength_stabilisation_minutes text,
  ADD COLUMN IF NOT EXISTS strength_test_duration_minutes text,
  ADD COLUMN IF NOT EXISTS strength_permitted_drop_percent text,
  ADD COLUMN IF NOT EXISTS strength_calculated_drop_mbar numeric,
  ADD COLUMN IF NOT EXISTS strength_actual_drop_mbar numeric,
  
  -- Tightness Test fields
  ADD COLUMN IF NOT EXISTS tightness_gas_type text,
  ADD COLUMN IF NOT EXISTS tightness_installation_type text,
  ADD COLUMN IF NOT EXISTS tightness_weather_affect boolean,
  ADD COLUMN IF NOT EXISTS tightness_meter_type text,
  ADD COLUMN IF NOT EXISTS tightness_meter_model text,
  ADD COLUMN IF NOT EXISTS tightness_meter_bypass boolean,
  ADD COLUMN IF NOT EXISTS tightness_gas_meter_volume text,
  ADD COLUMN IF NOT EXISTS tightness_pipework_volume text,
  ADD COLUMN IF NOT EXISTS tightness_total_volume text,
  ADD COLUMN IF NOT EXISTS tightness_test_medium text,
  ADD COLUMN IF NOT EXISTS tightness_test_pressure_mbar numeric,
  ADD COLUMN IF NOT EXISTS tightness_gauge_type text,
  ADD COLUMN IF NOT EXISTS tightness_mplr_or_mapd text,
  ADD COLUMN IF NOT EXISTS tightness_letby_period text,
  ADD COLUMN IF NOT EXISTS tightness_stabilisation_minutes text,
  ADD COLUMN IF NOT EXISTS tightness_test_duration_minutes text,
  ADD COLUMN IF NOT EXISTS tightness_inadequate_ventilation boolean,
  ADD COLUMN IF NOT EXISTS tightness_barometric_correction boolean,
  ADD COLUMN IF NOT EXISTS tightness_actual_leak_rate text,
  ADD COLUMN IF NOT EXISTS tightness_actual_pressure_drop_mbar numeric,
  ADD COLUMN IF NOT EXISTS tightness_ventilation_checked boolean,
  
  -- Purge fields
  ADD COLUMN IF NOT EXISTS purge_risk_assessment boolean,
  ADD COLUMN IF NOT EXISTS purge_written_procedure text,
  ADD COLUMN IF NOT EXISTS purge_no_smoking_signs boolean,
  ADD COLUMN IF NOT EXISTS purge_persons_advised boolean,
  ADD COLUMN IF NOT EXISTS purge_valves_labelled boolean,
  ADD COLUMN IF NOT EXISTS purge_nitrogen_verified boolean,
  ADD COLUMN IF NOT EXISTS purge_two_way_radios boolean,
  ADD COLUMN IF NOT EXISTS purge_electrical_bonds boolean,
  ADD COLUMN IF NOT EXISTS purge_gas_meter_volume text,
  ADD COLUMN IF NOT EXISTS purge_pipework_volume text,
  ADD COLUMN IF NOT EXISTS purge_total_volume text,
  ADD COLUMN IF NOT EXISTS purge_detector_safe boolean,
  ADD COLUMN IF NOT EXISTS purge_final_o2_percent text,
  ADD COLUMN IF NOT EXISTS purge_result text,
  
  -- Work undertaken & declaration
  ADD COLUMN IF NOT EXISTS work_strength_test boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS work_tightness_test boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS work_purge boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS declaration_type text;
