import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WarningNoticeFieldsProps {
  data: {
    classification: string;
    issue_type: string;
    actions_taken: string;
    actions_required: string;
    riddor_reported_11_1: boolean;
    riddor_reported_11_2: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export function WarningNoticeFields({ data, onChange }: WarningNoticeFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Classification</Label>
          <Select value={data.classification} onValueChange={v => onChange("classification", v)}>
            <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediately_dangerous">Immediately Dangerous (ID)</SelectItem>
              <SelectItem value="at_risk">At Risk (AR)</SelectItem>
              <SelectItem value="not_to_current_standards">Not to Current Standards (NCS)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Issue Type</Label>
          <Select value={data.issue_type} onValueChange={v => onChange("issue_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gas_escape">Gas Escape</SelectItem>
              <SelectItem value="pipework">Pipework</SelectItem>
              <SelectItem value="ventilation">Ventilation</SelectItem>
              <SelectItem value="chimney">Chimney/Flue</SelectItem>
              <SelectItem value="meter">Meter</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Actions Taken</Label>
        <Textarea value={data.actions_taken} onChange={e => onChange("actions_taken", e.target.value)} placeholder="Describe actions taken..." />
      </div>
      <div>
        <Label>Actions Required</Label>
        <Textarea value={data.actions_required} onChange={e => onChange("actions_required", e.target.value)} placeholder="Describe actions required..." />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={data.riddor_reported_11_1} onCheckedChange={v => onChange("riddor_reported_11_1", !!v)} />
          RIDDOR Reg 11(1) reported
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={data.riddor_reported_11_2} onCheckedChange={v => onChange("riddor_reported_11_2", !!v)} />
          RIDDOR Reg 11(2) reported
        </label>
      </div>
    </div>
  );
}
