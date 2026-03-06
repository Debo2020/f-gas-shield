import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

export interface ApplianceData {
  location: string;
  appliance_type: string;
  make: string;
  model: string;
  flue_type: string;
  appliance_inspected: boolean;
  operating_pressure_mbar: string;
  heat_input_kw: string;
  high_co_ppm: string;
  high_co2_percent: string;
  low_co_ppm: string;
  low_co2_percent: string;
  safety_devices_correct: boolean;
  ventilation_satisfactory: boolean;
  visual_condition_satisfactory: boolean;
  performance_test_result: string;
  appliance_safe_to_use: boolean;
}

export const emptyAppliance: ApplianceData = {
  location: "", appliance_type: "", make: "", model: "", flue_type: "",
  appliance_inspected: true, operating_pressure_mbar: "", heat_input_kw: "",
  high_co_ppm: "", high_co2_percent: "", low_co_ppm: "", low_co2_percent: "",
  safety_devices_correct: false, ventilation_satisfactory: false,
  visual_condition_satisfactory: false, performance_test_result: "",
  appliance_safe_to_use: false,
};

interface ApplianceFieldsProps {
  index: number;
  data: ApplianceData;
  onChange: (index: number, data: ApplianceData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export function ApplianceFields({ index, data, onChange, onRemove, canRemove }: ApplianceFieldsProps) {
  const update = (field: keyof ApplianceData, value: string | boolean) => {
    onChange(index, { ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Appliance {index + 1}</CardTitle>
        {canRemove && (
          <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Location</Label><Input value={data.location} onChange={e => update("location", e.target.value)} placeholder="e.g. Kitchen" /></div>
          <div><Label className="text-xs">Type</Label><Input value={data.appliance_type} onChange={e => update("appliance_type", e.target.value)} placeholder="e.g. Boiler" /></div>
          <div><Label className="text-xs">Make</Label><Input value={data.make} onChange={e => update("make", e.target.value)} /></div>
          <div><Label className="text-xs">Model</Label><Input value={data.model} onChange={e => update("model", e.target.value)} /></div>
          <div><Label className="text-xs">Flue Type</Label><Input value={data.flue_type} onChange={e => update("flue_type", e.target.value)} placeholder="e.g. Room Sealed" /></div>
          <div><Label className="text-xs">Op. Pressure (mbar)</Label><Input type="number" value={data.operating_pressure_mbar} onChange={e => update("operating_pressure_mbar", e.target.value)} /></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">CO High (ppm)</Label><Input type="number" value={data.high_co_ppm} onChange={e => update("high_co_ppm", e.target.value)} /></div>
          <div><Label className="text-xs">CO₂ High (%)</Label><Input type="number" value={data.high_co2_percent} onChange={e => update("high_co2_percent", e.target.value)} /></div>
          <div><Label className="text-xs">CO Low (ppm)</Label><Input type="number" value={data.low_co_ppm} onChange={e => update("low_co_ppm", e.target.value)} /></div>
          <div><Label className="text-xs">CO₂ Low (%)</Label><Input type="number" value={data.low_co2_percent} onChange={e => update("low_co2_percent", e.target.value)} /></div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={data.safety_devices_correct} onCheckedChange={v => update("safety_devices_correct", !!v)} />
            Safety devices correct
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={data.ventilation_satisfactory} onCheckedChange={v => update("ventilation_satisfactory", !!v)} />
            Ventilation satisfactory
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={data.visual_condition_satisfactory} onCheckedChange={v => update("visual_condition_satisfactory", !!v)} />
            Visual condition OK
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={data.appliance_safe_to_use} onCheckedChange={v => update("appliance_safe_to_use", !!v)} />
            Safe to use
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
