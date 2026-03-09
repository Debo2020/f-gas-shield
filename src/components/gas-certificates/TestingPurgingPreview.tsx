import { TestingPurgingData } from "./TestingPurgingFields";

const yn = (v?: boolean | null) => (v ? "Yes" : "No");
const ynna = (v?: string | null) => v === "yes" ? "Yes" : v === "no" ? "No" : v === "na" ? "N/A" : "—";
const result = (v?: string | null) => v === "pass" ? "PASS" : v === "fail" ? "FAIL" : "—";

interface TPPreviewProps {
  companyInfo: {
    company_name: string;
    company_address: string;
    company_phone: string;
    gas_safe_reg_no: string;
    engineer_name: string;
    gas_safe_id_card_no: string;
  };
  jobDetails: {
    job_address_name: string;
    job_address: string;
    job_postcode: string;
    job_phone: string;
    customer_name: string;
    customer_company: string;
    customer_address: string;
    customer_postcode: string;
    customer_phone: string;
    inspection_date: string;
  };
  testingData: TestingPurgingData;
  issuedByName: string;
  receivedByName: string;
}

export function TestingPurgingPreview({
  companyInfo,
  jobDetails,
  testingData: d,
  issuedByName,
  receivedByName,
}: TPPreviewProps) {
  const installLabel = (v: string) => v === "new" ? "New" : v === "new_extension" ? "New Extension" : v === "existing" ? "Existing" : "—";

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg mx-auto max-w-[1100px] aspect-[1.414/1] p-4 flex flex-col text-foreground text-[8px] leading-tight overflow-hidden">
      {/* Header */}
      <div className="text-center border-b border-border pb-1 mb-1">
        <h2 className="text-xs font-bold tracking-tight">Non-Domestic Gas Testing and Purging Certificate</h2>
      </div>

      {/* Company / Job / Client — 3-column */}
      <div className="grid grid-cols-3 gap-1 mb-1">
        <MiniCard title="Company / Installer">
          <F label="Engineer" value={companyInfo.engineer_name} />
          <F label="Company" value={companyInfo.company_name} />
          <F label="Address" value={companyInfo.company_address} />
          <F label="Telephone" value={companyInfo.company_phone} />
          <F label="Gas Safe Reg." value={companyInfo.gas_safe_reg_no} />
          <F label="ID Card No." value={companyInfo.gas_safe_id_card_no} />
        </MiniCard>
        <MiniCard title="Job Address">
          <F label="Name" value={jobDetails.job_address_name} />
          <F label="Address" value={jobDetails.job_address} />
          <F label="Post Code" value={jobDetails.job_postcode} />
          <F label="Telephone" value={jobDetails.job_phone} />
        </MiniCard>
        <MiniCard title="Client / Landlord">
          <F label="Name" value={jobDetails.customer_name} />
          <F label="Company" value={jobDetails.customer_company} />
          <F label="Address" value={jobDetails.customer_address} />
          <F label="Post Code" value={jobDetails.customer_postcode} />
          <F label="Telephone" value={jobDetails.customer_phone} />
        </MiniCard>
      </div>

      {/* Strength + Tightness side by side */}
      <div className="grid grid-cols-2 gap-1 mb-1">
        {/* STRENGTH */}
        <MiniCard title="Strength Test Details">
          <Row label="Test Method" value={d.strength_test_method || "—"} />
          <Row label="Installation Type" value={installLabel(d.strength_installation_type)} />
          <Row label="Components Isolated" value={yn(d.strength_components_isolated)} />
          <Row label="Calculated STP (mbar)" value={d.strength_calculated_stp_mbar || "—"} />
          <Row label="Test Medium" value={d.strength_test_medium || "—"} />
          <Row label="Stabilisation (min)" value={d.strength_stabilisation_minutes || "—"} />
          <Row label="Test Duration (min)" value={d.strength_test_duration_minutes || "—"} />
          <Row label="Permitted Drop (% STP)" value={d.strength_permitted_drop_percent || "—"} />
          <Row label="Calculated Drop (mbar)" value={d.strength_calculated_drop_mbar || "—"} />
          <Row label="Actual Drop (mbar)" value={d.strength_actual_drop_mbar || "—"} highlight />
          <Row label="STRENGTH TEST" value={result(d.strength_test_result)} highlight />
        </MiniCard>

        {/* TIGHTNESS */}
        <MiniCard title="Tightness Test Details">
          <Row label="Gas Type" value={d.tightness_gas_type === "natural_gas" ? "Natural Gas" : d.tightness_gas_type === "lpg" ? "LPG" : "—"} />
          <Row label="Installation" value={installLabel(d.tightness_installation_type)} />
          <Row label="Weather Affect?" value={yn(d.tightness_weather_affect)} />
          <Row label="Meter Type / Model" value={`${d.tightness_meter_type || "—"} / ${d.tightness_meter_model || "—"}`} />
          <Row label="Meter Bypass" value={yn(d.tightness_meter_bypass)} />
          <Row label="Volumes (m³)" value={`Gas: ${d.tightness_gas_meter_volume || "—"} | Pipe: ${d.tightness_pipework_volume || "—"} | Total: ${d.tightness_total_volume || "—"}`} />
          <Row label="Test Medium" value={d.tightness_test_medium === "fuel_gas" ? "Fuel Gas" : d.tightness_test_medium || "—"} />
          <Row label="TTP (mbar)" value={d.tightness_test_pressure_mbar || "—"} />
          <Row label="Gauge Type" value={d.tightness_gauge_type || "—"} />
          <Row label="MPLR / MAPD" value={d.tightness_mplr_or_mapd || "—"} />
          <Row label="Let-by / Stab / Duration" value={`${d.tightness_letby_period || "—"} / ${d.tightness_stabilisation_minutes || "—"} / ${d.tightness_test_duration_minutes || "—"} min`} />
          <Row label="Inadequate Vent." value={yn(d.tightness_inadequate_ventilation)} />
          <Row label="Baro. Correction" value={yn(d.tightness_barometric_correction)} />
          <Row label="Actual Leak Rate" value={`${d.tightness_actual_leak_rate || "0"} m³/hr`} highlight />
          <Row label="Actual Drop" value={`${d.tightness_actual_pressure_drop_mbar || "0"} mbar`} highlight />
          <Row label="Vent. Checked?" value={yn(d.tightness_ventilation_checked)} />
          <Row label="TIGHTNESS TEST" value={result(d.tightness_test_result)} highlight />
        </MiniCard>
      </div>

      {/* Purge + Work/Declaration side by side */}
      <div className="grid grid-cols-2 gap-1 mb-1">
        <MiniCard title="Purging Procedure">
          <Row label="Risk Assessment" value={yn(d.purge_risk_assessment)} />
          <Row label="Written Procedure" value={ynna(d.purge_written_procedure)} />
          <Row label="No Smoking Signs" value={yn(d.purge_no_smoking_signs)} />
          <Row label="Persons Advised" value={yn(d.purge_persons_advised)} />
          <Row label="Valves Labelled" value={yn(d.purge_valves_labelled)} />
          <Row label="N₂ Content Verified" value={yn(d.purge_nitrogen_verified)} />
          <Row label="Two-Way Radios" value={yn(d.purge_two_way_radios)} />
          <Row label="Elec. Bonds Fitted" value={yn(d.purge_electrical_bonds)} />
          <Row label="Purge Vol (m³)" value={`Gas: ${d.purge_gas_meter_volume || "—"} | Pipe: ${d.purge_pipework_volume || "—"} | Total: ${d.purge_total_volume || "—"}`} />
          <Row label="Detector Safe?" value={yn(d.purge_detector_safe)} />
          <Row label="Final O₂ %" value={d.purge_final_o2_percent || "—"} highlight />
          <Row label="PURGE RESULT" value={result(d.purge_result)} highlight />
        </MiniCard>

        <div className="space-y-1">
          <MiniCard title="Work Undertaken">
            <div className="flex gap-4 text-[7px]">
              <span>{d.work_strength_test ? "☑" : "☐"} Strength Test</span>
              <span>{d.work_tightness_test ? "☑" : "☐"} Tightness Test</span>
              <span>{d.work_purge ? "☑" : "☐"} Purge</span>
            </div>
          </MiniCard>
          <MiniCard title="Declaration">
            <p className="text-[7px]">
              {d.declaration_type === "gas_safety" ? "☑ Declaration of Gas Safety" : "☐ Declaration of Gas Safety"}
            </p>
            <p className="text-[7px]">
              {d.declaration_type === "unsafe_installation" ? "☑ Notification of Unsafe Gas Installation" : "☐ Notification of Unsafe Gas Installation"}
            </p>
          </MiniCard>
          {d.comments && (
            <MiniCard title="Comments">
              <p className="text-[7px] whitespace-pre-wrap">{d.comments}</p>
            </MiniCard>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border mt-auto">
        <div className="space-y-0.5">
          <h4 className="text-[8px] font-semibold">Engineer</h4>
          <div className="border border-border rounded p-1 h-6 flex items-end">
            <span className="text-[6px] text-muted-foreground italic">Signature captured on issue</span>
          </div>
          <p className="text-[7px]"><strong>Name:</strong> {issuedByName || "—"}</p>
        </div>
        <div className="space-y-0.5">
          <h4 className="text-[8px] font-semibold">Client / Recipient</h4>
          <div className="border border-border rounded p-1 h-6 flex items-end">
            <span className="text-[6px] text-muted-foreground italic">Signature captured on issue</span>
          </div>
          <p className="text-[7px]"><strong>Name:</strong> {receivedByName || "—"}</p>
          <p className="text-[7px]"><strong>Date:</strong> {jobDetails.inspection_date || "—"}</p>
        </div>
      </div>

      <div className="flex justify-between text-[6px] text-muted-foreground pt-0.5 border-t border-border">
        <span>Generated by FTrack Gas Compliance</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded p-1 space-y-0.5">
      <h4 className="text-[8px] font-semibold border-b border-border pb-0.5">{title}</h4>
      {children}
    </div>
  );
}

function F({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-[7px]">
      <span className="text-muted-foreground font-medium shrink-0">{label}:</span>
      <span className="truncate">{value || "—"}</span>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-[7px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-bold" : ""}>{value}</span>
    </div>
  );
}
