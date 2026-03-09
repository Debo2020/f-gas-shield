import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GasCertificateType } from "@/lib/gas-addons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplianceFields, ApplianceData, emptyAppliance } from "./ApplianceFields";
import { WarningNoticeFields } from "./WarningNoticeFields";
import { TestingPurgingFields } from "./TestingPurgingFields";
import { toast } from "sonner";
import { Loader2, Plus, ArrowLeft, ArrowRight, Save, Trash2, Eye } from "lucide-react";
import { CertificatePreview } from "./CertificatePreview";
import { LandlordCertificatePreview } from "./LandlordCertificatePreview";

interface GasCertificateFormProps {
  certificateType: GasCertificateType;
  onComplete: () => void;
  onCancel: () => void;
}

interface DefectRow {
  number: number;
  description: string;
  warning_labels_issued: boolean;
}

const STEPS = {
  landlord_gas_safety: ["Company / Installer", "Job Details", "Gas Checks", "Appliances", "Defects", "Comments & Sign", "Preview"],
  homeowner_gas_safety: ["Job Details", "Gas Checks", "Appliances", "Comments & Sign"],
  nd_gas_safety: ["Company / Installer", "Job Details", "Gas Checks", "Appliances", "Defects", "Comments & Sign", "Preview"],
  nd_gas_testing_purging: ["Job Details", "Testing & Purging", "Comments & Sign"],
  gas_warning_notice: ["Job Details", "Warning Details", "Comments & Sign"],
};

export function GasCertificateForm({ certificateType, onComplete, onCancel }: GasCertificateFormProps) {
  const { profile, user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const steps = STEPS[certificateType];

  // Company/Installer info (auto-populated, read-only for ND)
  const [companyInfo, setCompanyInfo] = useState({
    company_name: "", company_address: "", company_phone: "",
    gas_safe_reg_no: "", engineer_name: "", gas_safe_id_card_no: "",
  });

  // Fetch company & profile details for ND Gas Safety
  useEffect(() => {
    if (!["nd_gas_safety", "landlord_gas_safety"].includes(certificateType) || !profile?.company_id) return;
    const fetchCompanyInfo = async () => {
      const { data: company } = await supabase
        .from("companies")
        .select("name, address, phone, gas_safe_reg_no")
        .eq("id", profile.company_id!)
        .single();

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, gas_safe_id_card_no")
        .eq("user_id", user!.id)
        .single();

      setCompanyInfo({
        company_name: company?.name || "",
        company_address: company?.address || "",
        company_phone: company?.phone || "",
        gas_safe_reg_no: (company as any)?.gas_safe_reg_no || "",
        engineer_name: prof?.full_name || "",
        gas_safe_id_card_no: (prof as any)?.gas_safe_id_card_no || "",
      });
    };
    fetchCompanyInfo();
  }, [certificateType, profile?.company_id, user?.id]);

  // Form state
  const [jobDetails, setJobDetails] = useState({
    job_address_name: "", job_address: "", job_postcode: "", job_phone: "",
    customer_name: "", customer_company: "", customer_address: "", customer_postcode: "", customer_phone: "",
    inspection_date: new Date().toISOString().split("T")[0],
    next_inspection_due: "",
  });

  const [gasChecks, setGasChecks] = useState({
    emergency_control_accessible: false, gas_tightness_satisfactory: false,
    pipework_visual_satisfactory: false, equipotential_bonding: false,
    co_alarm_present: false, co_alarm_fitted: false, co_alarm_satisfactory: false,
  });

  const [appliances, setAppliances] = useState<ApplianceData[]>([{ ...emptyAppliance }]);

  const [defects, setDefects] = useState<DefectRow[]>([]);

  const [warningData, setWarningData] = useState({
    classification: "", issue_type: "",
    actions_taken: "", actions_required: "",
    riddor_reported_11_1: false, riddor_reported_11_2: false,
  });

  const [testingData, setTestingData] = useState({
    test_method: "", test_pressure_mbar: "", stabilisation_period: "",
    test_duration: "", permitted_pressure_drop: "", actual_pressure_drop: "",
    strength_test_result: "", tightness_test_result: "", purge_completed: false,
  });

  const [comments, setComments] = useState("");
  const [issuedByName, setIssuedByName] = useState(profile?.full_name || "");
  const [receivedByName, setReceivedByName] = useState("");

  const handleApplianceChange = (index: number, data: ApplianceData) => {
    const updated = [...appliances];
    updated[index] = data;
    setAppliances(updated);
  };

  const handleSave = async (status: "draft" | "issued") => {
    if (!user || !profile?.company_id) return;
    setSaving(true);

    try {
      const certData: Record<string, unknown> = {
        company_id: profile.company_id,
        engineer_id: user.id,
        certificate_type: certificateType,
        certificate_number: "", // Auto-generated by trigger
        status,
        ...jobDetails,
        inspection_date: jobDetails.inspection_date || new Date().toISOString().split("T")[0],
        next_inspection_due: jobDetails.next_inspection_due || null,
        comments,
        issued_by_name: issuedByName,
      };

      // Add type-specific fields
      if (["landlord_gas_safety", "homeowner_gas_safety", "nd_gas_safety"].includes(certificateType)) {
        Object.assign(certData, gasChecks);
      }

      // ND + Landlord: defects + received_by
      if (["nd_gas_safety", "landlord_gas_safety"].includes(certificateType)) {
        certData.defects = defects.length > 0 ? defects : [];
        certData.received_by_name = receivedByName || null;
      }

      if (certificateType === "gas_warning_notice") {
        Object.assign(certData, warningData);
      }
      if (certificateType === "nd_gas_testing_purging") {
        Object.assign(certData, {
          test_method: testingData.test_method || null,
          test_pressure_mbar: testingData.test_pressure_mbar ? Number(testingData.test_pressure_mbar) : null,
          stabilisation_period: testingData.stabilisation_period || null,
          test_duration: testingData.test_duration || null,
          permitted_pressure_drop: testingData.permitted_pressure_drop ? Number(testingData.permitted_pressure_drop) : null,
          actual_pressure_drop: testingData.actual_pressure_drop ? Number(testingData.actual_pressure_drop) : null,
          strength_test_result: testingData.strength_test_result || null,
          tightness_test_result: testingData.tightness_test_result || null,
          purge_completed: testingData.purge_completed,
        });
      }

      const { data: cert, error } = await supabase
        .from("gas_certificates")
        .insert(certData as any)
        .select()
        .single();

      if (error) throw error;

      // Insert appliances if applicable
      if (["landlord_gas_safety", "homeowner_gas_safety", "nd_gas_safety"].includes(certificateType) && appliances.length > 0) {
        const applianceRows = appliances.map((a, i) => ({
          certificate_id: cert.id,
          position: i + 1,
          location: a.location || null,
          appliance_type: a.appliance_type || null,
          make: a.make || null,
          model: a.model || null,
          flue_type: a.flue_type || null,
          landlord_appliance: a.landlord_appliance,
          appliance_inspected: a.appliance_inspected,
          operating_pressure_mbar: a.operating_pressure_mbar ? Number(a.operating_pressure_mbar) : null,
          heat_input_kw: a.heat_input_kw ? Number(a.heat_input_kw) : null,
          high_co_ratio: a.high_co_ratio ? Number(a.high_co_ratio) : null,
          high_co_ppm: a.high_co_ppm ? Number(a.high_co_ppm) : null,
          high_co2_percent: a.high_co2_percent ? Number(a.high_co2_percent) : null,
          low_co_ratio: a.low_co_ratio ? Number(a.low_co_ratio) : null,
          low_co_ppm: a.low_co_ppm ? Number(a.low_co_ppm) : null,
          low_co2_percent: a.low_co2_percent ? Number(a.low_co2_percent) : null,
          safety_devices_correct: a.safety_devices_correct,
          ventilation_satisfactory: a.ventilation_satisfactory,
          visual_condition_satisfactory: a.visual_condition_satisfactory,
          flue_performance_test: a.flue_performance_test || null,
          appliance_serviced: a.appliance_serviced,
          appliance_safe_to_use: a.appliance_safe_to_use,
        }));

        const { error: appError } = await supabase
          .from("gas_certificate_appliances")
          .insert(applianceRows);
        if (appError) throw appError;
      }

      toast.success(status === "issued" ? "Certificate issued successfully" : "Draft saved");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to save certificate");
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    const currentStepName = steps[step];

    if (currentStepName === "Company / Installer") {
      return (
        <Card>
          <CardHeader><CardTitle className="text-base">Company / Installer Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Auto-populated from your company and profile settings. Update via Settings if needed.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Engineer Name</Label><Input value={companyInfo.engineer_name} readOnly className="bg-muted" /></div>
              <div><Label className="text-xs">Company Name</Label><Input value={companyInfo.company_name} readOnly className="bg-muted" /></div>
              <div className="md:col-span-2"><Label className="text-xs">Company Address</Label><Input value={companyInfo.company_address} readOnly className="bg-muted" /></div>
              <div><Label className="text-xs">Telephone</Label><Input value={companyInfo.company_phone} readOnly className="bg-muted" /></div>
              <div><Label className="text-xs">Gas Safe Registration No.</Label><Input value={companyInfo.gas_safe_reg_no} readOnly className="bg-muted" /></div>
              <div><Label className="text-xs">ID Card Number</Label><Input value={companyInfo.gas_safe_id_card_no} readOnly className="bg-muted" /></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentStepName === "Job Details") {
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Property / Job Address</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={jobDetails.job_address_name} onChange={e => setJobDetails(d => ({ ...d, job_address_name: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={jobDetails.job_phone} onChange={e => setJobDetails(d => ({ ...d, job_phone: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label>Address</Label><Input value={jobDetails.job_address} onChange={e => setJobDetails(d => ({ ...d, job_address: e.target.value }))} /></div>
              <div><Label>Postcode</Label><Input value={jobDetails.job_postcode} onChange={e => setJobDetails(d => ({ ...d, job_postcode: e.target.value }))} /></div>
              <div><Label>Inspection Date</Label><Input type="date" value={jobDetails.inspection_date} onChange={e => setJobDetails(d => ({ ...d, inspection_date: e.target.value }))} /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Customer / Landlord Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={jobDetails.customer_name} onChange={e => setJobDetails(d => ({ ...d, customer_name: e.target.value }))} /></div>
              <div><Label>Company</Label><Input value={jobDetails.customer_company} onChange={e => setJobDetails(d => ({ ...d, customer_company: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label>Address</Label><Input value={jobDetails.customer_address} onChange={e => setJobDetails(d => ({ ...d, customer_address: e.target.value }))} /></div>
              <div><Label>Postcode</Label><Input value={jobDetails.customer_postcode} onChange={e => setJobDetails(d => ({ ...d, customer_postcode: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={jobDetails.customer_phone} onChange={e => setJobDetails(d => ({ ...d, customer_phone: e.target.value }))} /></div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (currentStepName === "Gas Checks") {
      return (
        <Card>
          <CardHeader><CardTitle className="text-base">Gas Installation Safety Checks</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ["emergency_control_accessible", "Emergency control valve accessible"],
              ["gas_tightness_satisfactory", "Gas tightness test satisfactory"],
              ["pipework_visual_satisfactory", "Visual inspection of pipework satisfactory"],
              ["equipotential_bonding", "Equipotential bonding satisfactory"],
              ["co_alarm_present", "CO alarm present"],
              ["co_alarm_fitted", "CO alarm fitted to current standards"],
              ["co_alarm_satisfactory", "CO alarm in satisfactory condition"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={(gasChecks as any)[key]}
                  onCheckedChange={v => setGasChecks(g => ({ ...g, [key]: !!v }))}
                />
                {label}
              </label>
            ))}
          </CardContent>
        </Card>
      );
    }

    if (currentStepName === "Appliances") {
      return (
        <div className="space-y-4">
          {appliances.map((a, i) => (
            <ApplianceFields
              key={i}
              index={i}
              data={a}
              onChange={handleApplianceChange}
              onRemove={(idx) => setAppliances(prev => prev.filter((_, j) => j !== idx))}
              canRemove={appliances.length > 1}
            />
          ))}
          <Button variant="outline" onClick={() => setAppliances(prev => [...prev, { ...emptyAppliance }])}>
            <Plus className="h-4 w-4 mr-2" /> Add Appliance
          </Button>
        </div>
      );
    }

    if (currentStepName === "Defects") {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Defects Identified</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {defects.length === 0 && (
              <p className="text-sm text-muted-foreground">No defects recorded. Add one if applicable.</p>
            )}
            {defects.map((d, i) => (
              <div key={i} className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Defect {d.number}</Label>
                  <Button variant="ghost" size="icon" onClick={() => setDefects(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={d.description}
                    onChange={e => {
                      const updated = [...defects];
                      updated[i] = { ...updated[i], description: e.target.value };
                      setDefects(updated);
                    }}
                    rows={2}
                    placeholder="Describe the defect..."
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={d.warning_labels_issued}
                    onCheckedChange={v => {
                      const updated = [...defects];
                      updated[i] = { ...updated[i], warning_labels_issued: !!v };
                      setDefects(updated);
                    }}
                  />
                  Warning labels issued
                </label>
              </div>
            ))}
            <Button variant="outline" onClick={() => setDefects(prev => [...prev, { number: prev.length + 1, description: "", warning_labels_issued: false }])}>
              <Plus className="h-4 w-4 mr-2" /> Add Defect
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (currentStepName === "Warning Details") {
      return (
        <Card>
          <CardHeader><CardTitle className="text-base">Warning Notice Details</CardTitle></CardHeader>
          <CardContent>
            <WarningNoticeFields data={warningData} onChange={(f, v) => setWarningData(d => ({ ...d, [f]: v }))} />
          </CardContent>
        </Card>
      );
    }

    if (currentStepName === "Testing & Purging") {
      return (
        <Card>
          <CardHeader><CardTitle className="text-base">Testing & Purging</CardTitle></CardHeader>
          <CardContent>
            <TestingPurgingFields data={testingData} onChange={(f, v) => setTestingData(d => ({ ...d, [f]: v }))} />
          </CardContent>
        </Card>
      );
    }

    if (currentStepName === "Comments & Sign") {
      return (
        <Card>
          <CardHeader><CardTitle className="text-base">Comments & Signatures</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Comments</Label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Enter any comments..." rows={4} />
            </div>
            {certificateType !== "gas_warning_notice" && (
              <div>
                <Label>Next Inspection Due</Label>
                <Input type="date" value={jobDetails.next_inspection_due} onChange={e => setJobDetails(d => ({ ...d, next_inspection_due: e.target.value }))} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Engineer Name (Issued By)</Label>
                <Input value={issuedByName} onChange={e => setIssuedByName(e.target.value)} />
              </div>
              {["nd_gas_safety", "landlord_gas_safety"].includes(certificateType) && (
                <div>
                  <Label>Customer / Representative Name (Received By)</Label>
                  <Input value={receivedByName} onChange={e => setReceivedByName(e.target.value)} placeholder="Name of person receiving certificate" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentStepName === "Preview") {
      const PreviewComponent = certificateType === "landlord_gas_safety" ? LandlordCertificatePreview : CertificatePreview;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            Review the certificate below before issuing. Go back to make changes.
          </div>
          <PreviewComponent
            companyInfo={companyInfo}
            jobDetails={jobDetails}
            gasChecks={gasChecks}
            appliances={appliances}
            defects={defects}
            comments={comments}
            issuedByName={issuedByName}
            receivedByName={receivedByName}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        {steps.map((s, i) => (
          <span key={s} className={i === step ? "text-foreground font-medium" : ""}>
            {i > 0 && <span className="mx-1">›</span>}
            {s}
          </span>
        ))}
      </div>

      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
        <div className="flex gap-2">
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> Save Draft
              </Button>
              <Button onClick={() => handleSave("issued")} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Issue Certificate
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
