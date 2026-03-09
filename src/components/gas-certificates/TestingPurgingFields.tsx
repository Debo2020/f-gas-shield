import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface TestingPurgingData {
  // Strength Test
  strength_test_method: string;
  strength_installation_type: string;
  strength_components_isolated: boolean;
  strength_calculated_stp_mbar: string;
  strength_test_medium: string;
  strength_stabilisation_minutes: string;
  strength_test_duration_minutes: string;
  strength_permitted_drop_percent: string;
  strength_calculated_drop_mbar: string;
  strength_actual_drop_mbar: string;
  strength_test_result: string;

  // Tightness Test
  tightness_gas_type: string;
  tightness_installation_type: string;
  tightness_weather_affect: boolean;
  tightness_meter_type: string;
  tightness_meter_model: string;
  tightness_meter_bypass: boolean;
  tightness_gas_meter_volume: string;
  tightness_pipework_volume: string;
  tightness_total_volume: string;
  tightness_test_medium: string;
  tightness_test_pressure_mbar: string;
  tightness_gauge_type: string;
  tightness_mplr_or_mapd: string;
  tightness_letby_period: string;
  tightness_stabilisation_minutes: string;
  tightness_test_duration_minutes: string;
  tightness_inadequate_ventilation: boolean;
  tightness_barometric_correction: boolean;
  tightness_actual_leak_rate: string;
  tightness_actual_pressure_drop_mbar: string;
  tightness_ventilation_checked: boolean;
  tightness_test_result: string;

  // Purge
  purge_risk_assessment: boolean;
  purge_written_procedure: string;
  purge_no_smoking_signs: boolean;
  purge_persons_advised: boolean;
  purge_valves_labelled: boolean;
  purge_nitrogen_verified: boolean;
  purge_two_way_radios: boolean;
  purge_electrical_bonds: boolean;
  purge_gas_meter_volume: string;
  purge_pipework_volume: string;
  purge_total_volume: string;
  purge_detector_safe: boolean;
  purge_final_o2_percent: string;
  purge_result: string;

  // Work undertaken & declaration
  work_strength_test: boolean;
  work_tightness_test: boolean;
  work_purge: boolean;
  declaration_type: string;
  comments: string;
}

export const emptyTestingPurgingData: TestingPurgingData = {
  strength_test_method: "",
  strength_installation_type: "",
  strength_components_isolated: false,
  strength_calculated_stp_mbar: "",
  strength_test_medium: "",
  strength_stabilisation_minutes: "",
  strength_test_duration_minutes: "",
  strength_permitted_drop_percent: "",
  strength_calculated_drop_mbar: "",
  strength_actual_drop_mbar: "",
  strength_test_result: "",
  tightness_gas_type: "",
  tightness_installation_type: "",
  tightness_weather_affect: false,
  tightness_meter_type: "",
  tightness_meter_model: "",
  tightness_meter_bypass: false,
  tightness_gas_meter_volume: "",
  tightness_pipework_volume: "",
  tightness_total_volume: "",
  tightness_test_medium: "",
  tightness_test_pressure_mbar: "",
  tightness_gauge_type: "",
  tightness_mplr_or_mapd: "",
  tightness_letby_period: "",
  tightness_stabilisation_minutes: "",
  tightness_test_duration_minutes: "",
  tightness_inadequate_ventilation: false,
  tightness_barometric_correction: false,
  tightness_actual_leak_rate: "",
  tightness_actual_pressure_drop_mbar: "",
  tightness_ventilation_checked: false,
  tightness_test_result: "",
  purge_risk_assessment: false,
  purge_written_procedure: "",
  purge_no_smoking_signs: false,
  purge_persons_advised: false,
  purge_valves_labelled: false,
  purge_nitrogen_verified: false,
  purge_two_way_radios: false,
  purge_electrical_bonds: false,
  purge_gas_meter_volume: "",
  purge_pipework_volume: "",
  purge_total_volume: "",
  purge_detector_safe: false,
  purge_final_o2_percent: "",
  purge_result: "",
  work_strength_test: false,
  work_tightness_test: false,
  work_purge: false,
  declaration_type: "",
  comments: "",
};

interface TestingPurgingFieldsProps {
  data: TestingPurgingData;
  onChange: (field: string, value: string | boolean) => void;
  section?: "strength" | "tightness" | "purge" | "all";
}

function YesNoSelect({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value ? "yes" : "no"} onValueChange={v => onChange(v === "yes")}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function TestingPurgingFields({ data, onChange, section = "all" }: TestingPurgingFieldsProps) {
  const showStrength = section === "all" || section === "strength";
  const showTightness = section === "all" || section === "tightness";
  const showPurge = section === "all" || section === "purge";

  return (
    <div className="space-y-6">
      {showStrength && (<>
      {/* ── STRENGTH TEST ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Strength Test Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">State Test Method</Label>
              <Select value={data.strength_test_method} onValueChange={v => onChange("strength_test_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pneumatic">Pneumatic</SelectItem>
                  <SelectItem value="hydrostatic">Hydrostatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Installation Type</Label>
              <Select value={data.strength_installation_type} onValueChange={v => onChange("strength_installation_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="new_extension">New Extension</SelectItem>
                  <SelectItem value="existing">Existing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <YesNoSelect
            label="Components unsuitable for strength testing removed or isolated?"
            value={data.strength_components_isolated}
            onChange={v => onChange("strength_components_isolated", v)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Calculated Strength Test Pressure (STP) mbar</Label>
              <Input type="number" value={data.strength_calculated_stp_mbar} onChange={e => onChange("strength_calculated_stp_mbar", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Test Medium</Label>
              <Select value={data.strength_test_medium} onValueChange={v => onChange("strength_test_medium", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="air">Air</SelectItem>
                  <SelectItem value="nitrogen">Nitrogen</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Stabilisation Period (minutes)</Label>
              <Input value={data.strength_stabilisation_minutes} onChange={e => onChange("strength_stabilisation_minutes", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Strength Test Duration (STD) minutes</Label>
              <Input value={data.strength_test_duration_minutes} onChange={e => onChange("strength_test_duration_minutes", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Permitted Pressure Drop (% STP)</Label>
              <Input value={data.strength_permitted_drop_percent} onChange={e => onChange("strength_permitted_drop_percent", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Calculated Pressure Drop (mbar)</Label>
              <Input type="number" value={data.strength_calculated_drop_mbar} onChange={e => onChange("strength_calculated_drop_mbar", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Findings: Actual Pressure Drop (mbar)</Label>
              <Input type="number" value={data.strength_actual_drop_mbar} onChange={e => onChange("strength_actual_drop_mbar", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Strength Test Result</Label>
              <Select value={data.strength_test_result} onValueChange={v => onChange("strength_test_result", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── TIGHTNESS TEST ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Tightness Test Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Gas Type</Label>
              <Select value={data.tightness_gas_type} onValueChange={v => onChange("tightness_gas_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural_gas">Natural Gas</SelectItem>
                  <SelectItem value="lpg">Liquefied Petroleum Gas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Installation Type</Label>
              <Select value={data.tightness_installation_type} onValueChange={v => onChange("tightness_installation_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="new_extension">New Extension</SelectItem>
                  <SelectItem value="existing">Existing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <YesNoSelect
              label="Could weather or temperature changes affect the test?"
              value={data.tightness_weather_affect}
              onChange={v => onChange("tightness_weather_affect", v)}
            />
            <YesNoSelect
              label="Meter Bypass Installed?"
              value={data.tightness_meter_bypass}
              onChange={v => onChange("tightness_meter_bypass", v)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Meter Type</Label>
              <Input value={data.tightness_meter_type} onChange={e => onChange("tightness_meter_type", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Meter Model</Label>
              <Input value={data.tightness_meter_model} onChange={e => onChange("tightness_meter_model", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Gas Meter Volume (m³)</Label>
              <Input value={data.tightness_gas_meter_volume} onChange={e => onChange("tightness_gas_meter_volume", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Installation Pipework Volume (m³)</Label>
              <Input value={data.tightness_pipework_volume} onChange={e => onChange("tightness_pipework_volume", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Total Installation Volume (m³)</Label>
              <Input value={data.tightness_total_volume} onChange={e => onChange("tightness_total_volume", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Test Medium</Label>
              <Select value={data.tightness_test_medium} onValueChange={v => onChange("tightness_test_medium", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel_gas">Fuel Gas</SelectItem>
                  <SelectItem value="air">Air</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tightness Test Pressure (mbar)</Label>
              <Input type="number" value={data.tightness_test_pressure_mbar} onChange={e => onChange("tightness_test_pressure_mbar", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pressure Gauge Type</Label>
              <Input value={data.tightness_gauge_type} onChange={e => onChange("tightness_gauge_type", e.target.value)} placeholder="e.g. Digital, Water, High SG" />
            </div>
            <div>
              <Label className="text-xs">MPLR or MAPD</Label>
              <Input value={data.tightness_mplr_or_mapd} onChange={e => onChange("tightness_mplr_or_mapd", e.target.value)} placeholder="Max Permitted Leak Rate / Max Allowable Pressure Drop" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Let-by Test Period (minutes)</Label>
              <Input value={data.tightness_letby_period} onChange={e => onChange("tightness_letby_period", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Stabilisation Period (minutes)</Label>
              <Input value={data.tightness_stabilisation_minutes} onChange={e => onChange("tightness_stabilisation_minutes", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Tightness Test Duration (minutes)</Label>
              <Input value={data.tightness_test_duration_minutes} onChange={e => onChange("tightness_test_duration_minutes", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <YesNoSelect
              label="Inadequately ventilated areas present?"
              value={data.tightness_inadequate_ventilation}
              onChange={v => onChange("tightness_inadequate_ventilation", v)}
            />
            <YesNoSelect
              label="Barometric Pressure Correction Required?"
              value={data.tightness_barometric_correction}
              onChange={v => onChange("tightness_barometric_correction", v)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Findings: Actual Leak Rate (m³/hr)</Label>
              <Input value={data.tightness_actual_leak_rate} onChange={e => onChange("tightness_actual_leak_rate", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Findings: Actual Pressure Drop (mbar)</Label>
              <Input type="number" value={data.tightness_actual_pressure_drop_mbar} onChange={e => onChange("tightness_actual_pressure_drop_mbar", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <YesNoSelect
              label="Have inadequately ventilated areas been checked?"
              value={data.tightness_ventilation_checked}
              onChange={v => onChange("tightness_ventilation_checked", v)}
            />
            <div>
              <Label className="text-xs">Tightness Test Result</Label>
              <Select value={data.tightness_test_result} onValueChange={v => onChange("tightness_test_result", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── PURGING PROCEDURE ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Purging Procedure Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <YesNoSelect label="Risk Assessment Carried Out?" value={data.purge_risk_assessment} onChange={v => onChange("purge_risk_assessment", v)} />
            <div>
              <Label className="text-xs">Written Purge Procedure Prepared?</Label>
              <Select value={data.purge_written_procedure} onValueChange={v => onChange("purge_written_procedure", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="na">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <YesNoSelect label='"No Smoking" Signs Displayed?' value={data.purge_no_smoking_signs} onChange={v => onChange("purge_no_smoking_signs", v)} />
            <YesNoSelect label="Have people in the vicinity been advised?" value={data.purge_persons_advised} onChange={v => onChange("purge_persons_advised", v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <YesNoSelect label="Have valves been labelled?" value={data.purge_valves_labelled} onChange={v => onChange("purge_valves_labelled", v)} />
            <YesNoSelect label="If Nitrogen Used — Cylinder Content Verified?" value={data.purge_nitrogen_verified} onChange={v => onChange("purge_nitrogen_verified", v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <YesNoSelect label="Two-Way Radios Available?" value={data.purge_two_way_radios} onChange={v => onChange("purge_two_way_radios", v)} />
            <YesNoSelect label="Electrical Bonds Fitted?" value={data.purge_electrical_bonds} onChange={v => onChange("purge_electrical_bonds", v)} />
          </div>

          <h4 className="text-xs font-semibold pt-2">Purge Volume Calculation</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Gas Meter Volume (m³)</Label>
              <Input value={data.purge_gas_meter_volume} onChange={e => onChange("purge_gas_meter_volume", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Installation Pipework Volume (m³)</Label>
              <Input value={data.purge_pipework_volume} onChange={e => onChange("purge_pipework_volume", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Total Purge Volume (m³)</Label>
              <Input value={data.purge_total_volume} onChange={e => onChange("purge_total_volume", e.target.value)} />
            </div>
          </div>

          <YesNoSelect label="Gas Detector / Oxygen Monitor Intrinsically Safe?" value={data.purge_detector_safe} onChange={v => onChange("purge_detector_safe", v)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Findings: Final O₂ Reading %</Label>
              <Input value={data.purge_final_o2_percent} onChange={e => onChange("purge_final_o2_percent", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Purge Result</Label>
              <Select value={data.purge_result} onValueChange={v => onChange("purge_result", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── WORK UNDERTAKEN ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Indicate Work Undertaken</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={data.work_strength_test} onCheckedChange={v => onChange("work_strength_test", !!v)} />
            Strength Test
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={data.work_tightness_test} onCheckedChange={v => onChange("work_tightness_test", !!v)} />
            Tightness Test
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={data.work_purge} onCheckedChange={v => onChange("work_purge", !!v)} />
            Purge
          </label>
        </CardContent>
      </Card>

      {/* ── DECLARATION ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Declaration</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={data.declaration_type} onValueChange={v => onChange("declaration_type", v)} className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <RadioGroupItem value="gas_safety" className="mt-0.5" />
              <span>Declaration of Gas Safety</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <RadioGroupItem value="unsafe_installation" className="mt-0.5" />
              <span>Notification of Unsafe Gas Installation</span>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* ── COMMENTS ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Engineer Comments</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={data.comments}
            onChange={e => onChange("comments", e.target.value)}
            placeholder="Enter any comments..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
