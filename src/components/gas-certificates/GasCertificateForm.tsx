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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApplianceFields, ApplianceData, emptyAppliance } from "./ApplianceFields";
import { WarningNoticeFields, WarningNoticeData, emptyWarningData } from "./WarningNoticeFields";
import { WarningNoticePreview } from "./WarningNoticePreview";
import { TestingPurgingFields, TestingPurgingData, emptyTestingPurgingData } from "./TestingPurgingFields";
import { TestingPurgingPreview } from "./TestingPurgingPreview";
import { toast } from "sonner";
import { Loader2, Plus, ArrowLeft, ArrowRight, Save, Trash2, Eye } from "lucide-react";
import { CertificatePreview } from "./CertificatePreview";
import { LandlordCertificatePreview } from "./LandlordCertificatePreview";
import { SignaturePad } from "./SignaturePad";

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

const STEPS: Record<string, string[]> = {
  landlord_gas_safety: ["Company / Installer", "Job Details", "Gas Checks", "Appliances", "Defects", "Comments & Sign", "Preview"],
  homeowner_gas_safety: ["Company / Installer", "Job Details", "Gas Checks", "Appliances", "Defects", "Comments & Sign", "Preview"],
  nd_gas_safety: ["Company / Installer", "Job Details", "Gas Checks", "Appliances", "Defects", "Comments & Sign", "Preview"],
  nd_gas_testing_purging: ["Company / Installer", "Job Details", "Strength Test", "Tightness Test", "Purge & Declaration", "Comments & Sign", "Preview"],
  gas_warning_notice: ["Company / Installer", "Job Details", "Appliance / Installation", "Warning Details", "Comments & Sign", "Preview"],
};

export function GasCertificateForm({ certificateType, onComplete, onCancel }: GasCertificateFormProps) {
  const { profile, user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Client / Site selection state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  const companyId = profile?.company_id;

  // Fetch clients
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setClients(data || []));
  }, [companyId]);

  // Fetch sites filtered by selected client
  useEffect(() => {
    setSites([]);
    setSelectedSiteId("");
    if (!selectedClientId || selectedClientId === "manual") return;
    supabase
      .from("sites")
      .select("*")
      .eq("client_id", selectedClientId)
      .eq("is_deleted", false)
      .order("name")
      .then(({ data }) => setSites(data || []));
  }, [selectedClientId]);

  // Auto-populate from client selection
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === "manual" || !clientId) {
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setJobDetails(d => ({
        ...d,
        customer_name: client.contact_name || "",
        customer_company: client.name || "",
        customer_address: client.address || "",
        customer_phone: client.contact_phone || "",
      }));
    }
  };

  // Auto-populate from site selection
  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    if (siteId === "manual" || !siteId) return;
    const site = sites.find(s => s.id === siteId);
    if (site) {
      setJobDetails(d => ({
        ...d,
        job_address_name: site.name || "",
        job_address: site.address || "",
        job_postcode: site.postcode || "",
        job_phone: site.contact_phone || "",
      }));
    }
  };

  const steps = STEPS[certificateType] || STEPS.gas_warning_notice;

  // Company/Installer info
  const [companyInfo, setCompanyInfo] = useState({
    company_name: "", company_address: "", company_phone: "",
    gas_safe_reg_no: "", engineer_name: "", gas_safe_id_card_no: "",
  });

  useEffect(() => {
    if (!["nd_gas_safety", "landlord_gas_safety", "homeowner_gas_safety", "nd_gas_testing_purging", "gas_warning_notice"].includes(certificateType) || !profile?.company_id) return;
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

  const [warningData, setWarningData] = useState<WarningNoticeData>({ ...emptyWarningData });

  const [testingData, setTestingData] = useState<TestingPurgingData>({ ...emptyTestingPurgingData });

  const [comments, setComments] = useState("");
  const [issuedByName, setIssuedByName] = useState(profile?.full_name || "");
  const [receivedByName, setReceivedByName] = useState("");
  const [issuedBySignature, setIssuedBySignature] = useState("");
  const [receivedBySignature, setReceivedBySignature] = useState("");

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
        certificate_number: "",
        status,
        ...jobDetails,
        inspection_date: jobDetails.inspection_date || new Date().toISOString().split("T")[0],
        next_inspection_due: jobDetails.next_inspection_due || null,
        issued_by_name: issuedByName,
        issued_by_signature: issuedBySignature || null,
        received_by_signature: receivedBySignature || null,
      };

      if (["landlord_gas_safety", "homeowner_gas_safety", "nd_gas_safety"].includes(certificateType)) {
        Object.assign(certData, gasChecks);
      }

      if (["nd_gas_safety", "landlord_gas_safety", "homeowner_gas_safety"].includes(certificateType)) {
        certData.defects = defects.length > 0 ? defects : [];
        certData.received_by_name = receivedByName || null;
        certData.comments = comments;
      }

      if (certificateType === "gas_warning_notice") {
        certData.classification = warningData.classification || null;
        certData.warning_location = warningData.warning_location || null;
        certData.warning_make = warningData.warning_make || null;
        certData.warning_type = warningData.warning_type || null;
        certData.warning_model = warningData.warning_model || null;
        certData.warning_serial_no = warningData.warning_serial_no || null;
        certData.fault_details = warningData.fault_details || null;
        certData.actions_taken = warningData.actions_taken || null;
        certData.actions_required = warningData.actions_required || null;
        certData.issue_gas_escape = warningData.issue_gas_escape || "n/a";
        certData.issue_pipework = warningData.issue_pipework || "n/a";
        certData.issue_ventilation = warningData.issue_ventilation || "n/a";
        certData.issue_meter = warningData.issue_meter || "n/a";
        certData.issue_chimney_flue = warningData.issue_chimney_flue || "n/a";
        certData.issue_other = warningData.issue_other || "n/a";
        certData.issue_other_description = warningData.issue_other_description || null;
        certData.riddor_11_1_status = warningData.riddor_11_1_status || "n/a";
        certData.riddor_11_2_status = warningData.riddor_11_2_status || "n/a";
        certData.customer_mobile = (jobDetails as any).customer_mobile || null;
        certData.received_by_name = receivedByName || null;
        certData.comments = comments;
      }

      if (certificateType === "nd_gas_testing_purging") {
        // Map all T&P fields
        certData.comments = testingData.comments;
        certData.received_by_name = receivedByName || null;
        certData.strength_test_result = testingData.strength_test_result || null;
        certData.tightness_test_result = testingData.tightness_test_result || null;
        certData.purge_completed = testingData.purge_result === "pass";

        // Strength
        certData.strength_test_method = testingData.strength_test_method || null;
        certData.strength_installation_type = testingData.strength_installation_type || null;
        certData.strength_components_isolated = testingData.strength_components_isolated;
        certData.strength_calculated_stp_mbar = testingData.strength_calculated_stp_mbar ? Number(testingData.strength_calculated_stp_mbar) : null;
        certData.strength_test_medium = testingData.strength_test_medium || null;
        certData.strength_stabilisation_minutes = testingData.strength_stabilisation_minutes || null;
        certData.strength_test_duration_minutes = testingData.strength_test_duration_minutes || null;
        certData.strength_permitted_drop_percent = testingData.strength_permitted_drop_percent || null;
        certData.strength_calculated_drop_mbar = testingData.strength_calculated_drop_mbar ? Number(testingData.strength_calculated_drop_mbar) : null;
        certData.strength_actual_drop_mbar = testingData.strength_actual_drop_mbar ? Number(testingData.strength_actual_drop_mbar) : null;

        // Tightness
        certData.tightness_gas_type = testingData.tightness_gas_type || null;
        certData.tightness_installation_type = testingData.tightness_installation_type || null;
        certData.tightness_weather_affect = testingData.tightness_weather_affect;
        certData.tightness_meter_type = testingData.tightness_meter_type || null;
        certData.tightness_meter_model = testingData.tightness_meter_model || null;
        certData.tightness_meter_bypass = testingData.tightness_meter_bypass;
        certData.tightness_gas_meter_volume = testingData.tightness_gas_meter_volume || null;
        certData.tightness_pipework_volume = testingData.tightness_pipework_volume || null;
        certData.tightness_total_volume = testingData.tightness_total_volume || null;
        certData.tightness_test_medium = testingData.tightness_test_medium || null;
        certData.tightness_test_pressure_mbar = testingData.tightness_test_pressure_mbar ? Number(testingData.tightness_test_pressure_mbar) : null;
        certData.tightness_gauge_type = testingData.tightness_gauge_type || null;
        certData.tightness_mplr_or_mapd = testingData.tightness_mplr_or_mapd || null;
        certData.tightness_letby_period = testingData.tightness_letby_period || null;
        certData.tightness_stabilisation_minutes = testingData.tightness_stabilisation_minutes || null;
        certData.tightness_test_duration_minutes = testingData.tightness_test_duration_minutes || null;
        certData.tightness_inadequate_ventilation = testingData.tightness_inadequate_ventilation;
        certData.tightness_barometric_correction = testingData.tightness_barometric_correction;
        certData.tightness_actual_leak_rate = testingData.tightness_actual_leak_rate || null;
        certData.tightness_actual_pressure_drop_mbar = testingData.tightness_actual_pressure_drop_mbar ? Number(testingData.tightness_actual_pressure_drop_mbar) : null;
        certData.tightness_ventilation_checked = testingData.tightness_ventilation_checked;

        // Purge
        certData.purge_risk_assessment = testingData.purge_risk_assessment;
        certData.purge_written_procedure = testingData.purge_written_procedure || null;
        certData.purge_no_smoking_signs = testingData.purge_no_smoking_signs;
        certData.purge_persons_advised = testingData.purge_persons_advised;
        certData.purge_valves_labelled = testingData.purge_valves_labelled;
        certData.purge_nitrogen_verified = testingData.purge_nitrogen_verified;
        certData.purge_two_way_radios = testingData.purge_two_way_radios;
        certData.purge_electrical_bonds = testingData.purge_electrical_bonds;
        certData.purge_gas_meter_volume = testingData.purge_gas_meter_volume || null;
        certData.purge_pipework_volume = testingData.purge_pipework_volume || null;
        certData.purge_total_volume = testingData.purge_total_volume || null;
        certData.purge_detector_safe = testingData.purge_detector_safe;
        certData.purge_final_o2_percent = testingData.purge_final_o2_percent || null;
        certData.purge_result = testingData.purge_result || null;

        // Work undertaken & declaration
        certData.work_strength_test = testingData.work_strength_test;
        certData.work_tightness_test = testingData.work_tightness_test;
        certData.work_purge = testingData.work_purge;
        certData.declaration_type = testingData.declaration_type || null;

        // Legacy compat
        certData.test_method = testingData.strength_test_method || null;
        certData.test_pressure_mbar = testingData.tightness_test_pressure_mbar ? Number(testingData.tightness_test_pressure_mbar) : null;
        certData.actual_pressure_drop = testingData.strength_actual_drop_mbar ? Number(testingData.strength_actual_drop_mbar) : null;
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
            <CardHeader><CardTitle className="text-base">Client / Landlord Details</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Defects Identified</CardTitle></CardHeader>
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

    if (currentStepName === "Appliance / Installation") {
      return (
        <WarningNoticeFields data={warningData} onChange={(f, v) => setWarningData(d => ({ ...d, [f]: v as any }))} section="appliance" />
      );
    }

    if (currentStepName === "Warning Details") {
      return (
        <WarningNoticeFields data={warningData} onChange={(f, v) => setWarningData(d => ({ ...d, [f]: v as any }))} section="details" />
      );
    }

    // T&P split steps
    if (currentStepName === "Strength Test") {
      return (
        <TestingPurgingFields
          data={testingData}
          onChange={(f, v) => setTestingData(d => ({ ...d, [f]: v }))}
          section="strength"
        />
      );
    }

    if (currentStepName === "Tightness Test") {
      return (
        <TestingPurgingFields
          data={testingData}
          onChange={(f, v) => setTestingData(d => ({ ...d, [f]: v }))}
          section="tightness"
        />
      );
    }

    if (currentStepName === "Purge & Declaration") {
      return (
        <TestingPurgingFields
          data={testingData}
          onChange={(f, v) => setTestingData(d => ({ ...d, [f]: v }))}
          section="purge"
        />
      );
    }

    if (currentStepName === "Comments & Sign") {
      const isTP = certificateType === "nd_gas_testing_purging";
      return (
        <Card>
          <CardHeader><CardTitle className="text-base">Comments & Signatures</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!isTP && (
              <div>
                <Label>Comments</Label>
                <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Enter any comments..." rows={4} />
              </div>
            )}
            {certificateType !== "gas_warning_notice" && certificateType !== "nd_gas_testing_purging" && (
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
              {["nd_gas_safety", "landlord_gas_safety", "homeowner_gas_safety", "nd_gas_testing_purging", "gas_warning_notice"].includes(certificateType) && (
                <div>
                  <Label>Client / Representative Name (Received By)</Label>
                  <Input value={receivedByName} onChange={e => setReceivedByName(e.target.value)} placeholder="Name of person receiving certificate" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <SignaturePad label="Engineer Signature" value={issuedBySignature} onChange={setIssuedBySignature} />
              <SignaturePad label="Client / Recipient Signature" value={receivedBySignature} onChange={setReceivedBySignature} />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentStepName === "Preview") {
      if (certificateType === "gas_warning_notice") {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Review the warning notice below before issuing. Go back to make changes.
            </div>
            <WarningNoticePreview
              companyInfo={companyInfo}
              jobDetails={jobDetails}
              warningData={warningData}
              comments={comments}
              issuedByName={issuedByName}
              receivedByName={receivedByName}
              issuedBySignature={issuedBySignature}
              receivedBySignature={receivedBySignature}
            />
          </div>
        );
      }

      if (certificateType === "nd_gas_testing_purging") {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Review the certificate below before issuing. Go back to make changes.
            </div>
            <TestingPurgingPreview
              companyInfo={companyInfo}
              jobDetails={jobDetails}
              testingData={testingData}
              issuedByName={issuedByName}
              receivedByName={receivedByName}
              issuedBySignature={issuedBySignature}
              receivedBySignature={receivedBySignature}
            />
          </div>
        );
      }

      const previewTitle = certificateType === "homeowner_gas_safety" ? "Homeowner Gas Safety Record" : certificateType === "landlord_gas_safety" ? "Landlord Gas Safety Record" : undefined;
      const PreviewComponent = ["landlord_gas_safety", "homeowner_gas_safety"].includes(certificateType) ? LandlordCertificatePreview : CertificatePreview;
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
            issuedBySignature={issuedBySignature}
            receivedBySignature={receivedBySignature}
            {...(previewTitle ? { title: previewTitle } : {})}
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
