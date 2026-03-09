import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export interface WarningNoticeData {
  classification: string;
  warning_location: string;
  warning_make: string;
  warning_type: string;
  warning_model: string;
  warning_serial_no: string;
  fault_details: string;
  actions_taken: string;
  actions_required: string;
  issue_gas_escape: string;
  issue_pipework: string;
  issue_ventilation: string;
  issue_meter: string;
  issue_chimney_flue: string;
  issue_other: string;
  issue_other_description: string;
  riddor_11_1_status: string;
  riddor_11_2_status: string;
}

export const emptyWarningData: WarningNoticeData = {
  classification: "",
  warning_location: "",
  warning_make: "",
  warning_type: "",
  warning_model: "",
  warning_serial_no: "",
  fault_details: "",
  actions_taken: "",
  actions_required: "",
  issue_gas_escape: "n/a",
  issue_pipework: "n/a",
  issue_ventilation: "n/a",
  issue_meter: "n/a",
  issue_chimney_flue: "n/a",
  issue_other: "n/a",
  issue_other_description: "",
  riddor_11_1_status: "n/a",
  riddor_11_2_status: "n/a",
};

interface WarningNoticeFieldsProps {
  data: WarningNoticeData;
  onChange: (field: string, value: string) => void;
  section: "appliance" | "details";
}

function YesNoNaSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <Label className="text-sm flex-1">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
          <SelectItem value="n/a">N/A</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function WarningNoticeFields({ data, onChange, section }: WarningNoticeFieldsProps) {
  if (section === "appliance") {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Gas Appliance / Installation Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Location (Position / Room)</Label>
                <Input value={data.warning_location} onChange={e => onChange("warning_location", e.target.value)} placeholder="e.g. Kitchen" />
              </div>
              <div>
                <Label>Make</Label>
                <Input value={data.warning_make} onChange={e => onChange("warning_make", e.target.value)} />
              </div>
              <div>
                <Label>Type</Label>
                <Input value={data.warning_type} onChange={e => onChange("warning_type", e.target.value)} placeholder="e.g. Boiler, Fire, Cooker" />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={data.warning_model} onChange={e => onChange("warning_model", e.target.value)} />
              </div>
              <div>
                <Label>Serial Number</Label>
                <Input value={data.warning_serial_no} onChange={e => onChange("warning_serial_no", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Classification</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup value={data.classification} onValueChange={v => onChange("classification", v)} className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="immediately_dangerous" />
                <div>
                  <p className="font-medium text-sm">ID – Immediately Dangerous</p>
                  <p className="text-xs text-muted-foreground">The appliance/installation presents an immediate danger</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="at_risk" />
                <div>
                  <p className="font-medium text-sm">AR – At Risk</p>
                  <p className="text-xs text-muted-foreground">The appliance/installation is at risk of becoming dangerous</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="not_to_current_standards" />
                <div>
                  <p className="font-medium text-sm">NCS – Not to Current Standards</p>
                  <p className="text-xs text-muted-foreground">The appliance/installation does not meet current standards</p>
                </div>
              </label>
            </RadioGroup>

            {data.classification === "immediately_dangerous" && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">
                  IMMEDIATELY DANGEROUS – The appliance(s) / installation has been classified as IMMEDIATELY DANGEROUS, disconnected from the gas supply and a 'DANGER DO NOT USE' label attached.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Issue Type</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <YesNoNaSelect label="Gas Escape" value={data.issue_gas_escape} onChange={v => onChange("issue_gas_escape", v)} />
            <YesNoNaSelect label="Pipework Issue" value={data.issue_pipework} onChange={v => onChange("issue_pipework", v)} />
            <YesNoNaSelect label="Ventilation Issue" value={data.issue_ventilation} onChange={v => onChange("issue_ventilation", v)} />
            <YesNoNaSelect label="Meter Issue" value={data.issue_meter} onChange={v => onChange("issue_meter", v)} />
            <YesNoNaSelect label="Chimney / Flue Issue" value={data.issue_chimney_flue} onChange={v => onChange("issue_chimney_flue", v)} />
            <YesNoNaSelect label="Other Issue" value={data.issue_other} onChange={v => onChange("issue_other", v)} />
            {data.issue_other === "yes" && (
              <div className="mt-2">
                <Label>Other Issue Description</Label>
                <Input value={data.issue_other_description} onChange={e => onChange("issue_other_description", e.target.value)} placeholder="Describe the other issue..." />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // section === "details"
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Details of Faults</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={data.fault_details} onChange={e => onChange("fault_details", e.target.value)} placeholder="Describe the unsafe condition or faults identified..." rows={4} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Actions Taken</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={data.actions_taken} onChange={e => onChange("actions_taken", e.target.value)} placeholder="Describe actions taken by the engineer..." rows={4} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Actions Required</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={data.actions_required} onChange={e => onChange("actions_required", e.target.value)} placeholder="Describe required remedial works..." rows={4} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">RIDDOR Reporting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <YesNoNaSelect label="Reported to HSE under RIDDOR 11(1) – Gas Incident" value={data.riddor_11_1_status} onChange={v => onChange("riddor_11_1_status", v)} />
          <YesNoNaSelect label="Reported to HSE under RIDDOR 11(2) – Dangerous Gas Fitting" value={data.riddor_11_2_status} onChange={v => onChange("riddor_11_2_status", v)} />
        </CardContent>
      </Card>
    </div>
  );
}
