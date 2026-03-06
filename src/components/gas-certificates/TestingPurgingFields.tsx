import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TestingPurgingFieldsProps {
  data: {
    test_method: string;
    test_pressure_mbar: string;
    stabilisation_period: string;
    test_duration: string;
    permitted_pressure_drop: string;
    actual_pressure_drop: string;
    strength_test_result: string;
    tightness_test_result: string;
    purge_completed: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export function TestingPurgingFields({ data, onChange }: TestingPurgingFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Test Method</Label>
          <Select value={data.test_method} onValueChange={v => onChange("test_method", v)}>
            <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pneumatic">Pneumatic (Air)</SelectItem>
              <SelectItem value="hydrostatic">Hydrostatic (Water)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Test Pressure (mbar)</Label>
          <Input type="number" value={data.test_pressure_mbar} onChange={e => onChange("test_pressure_mbar", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Stabilisation Period</Label>
          <Input value={data.stabilisation_period} onChange={e => onChange("stabilisation_period", e.target.value)} placeholder="e.g. 1 minute" />
        </div>
        <div>
          <Label>Test Duration</Label>
          <Input value={data.test_duration} onChange={e => onChange("test_duration", e.target.value)} placeholder="e.g. 2 minutes" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Permitted Pressure Drop (mbar)</Label>
          <Input type="number" value={data.permitted_pressure_drop} onChange={e => onChange("permitted_pressure_drop", e.target.value)} />
        </div>
        <div>
          <Label>Actual Pressure Drop (mbar)</Label>
          <Input type="number" value={data.actual_pressure_drop} onChange={e => onChange("actual_pressure_drop", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Strength Test Result</Label>
          <Select value={data.strength_test_result} onValueChange={v => onChange("strength_test_result", v)}>
            <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tightness Test Result</Label>
          <Select value={data.tightness_test_result} onValueChange={v => onChange("tightness_test_result", v)}>
            <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={data.purge_completed} onCheckedChange={v => onChange("purge_completed", !!v)} />
        Purge completed satisfactorily
      </label>
    </div>
  );
}
