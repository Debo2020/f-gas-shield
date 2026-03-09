import { ApplianceData } from "./ApplianceFields";

interface DefectRow {
  number: number;
  description: string;
  warning_labels_issued: boolean;
}

interface CertificatePreviewProps {
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
    next_inspection_due: string;
  };
  gasChecks: {
    emergency_control_accessible: boolean;
    gas_tightness_satisfactory: boolean;
    pipework_visual_satisfactory: boolean;
    equipotential_bonding: boolean;
    co_alarm_present: boolean;
    co_alarm_fitted: boolean;
    co_alarm_satisfactory: boolean;
  };
  appliances: ApplianceData[];
  defects: DefectRow[];
  comments: string;
  issuedByName: string;
  receivedByName: string;
}

const yn = (v: boolean) => (v ? "Yes" : "No");

export function CertificatePreview({
  companyInfo,
  jobDetails,
  gasChecks,
  appliances,
  defects,
  comments,
  issuedByName,
  receivedByName,
}: CertificatePreviewProps) {
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg mx-auto max-w-[1100px] aspect-[1.414/1] p-6 space-y-4 text-foreground text-[11px] leading-tight overflow-y-auto">
      {/* Header */}
      <div className="text-center space-y-1 border-b border-border pb-3">
        <h2 className="text-base font-bold tracking-tight">Non Domestic Gas Safety Record</h2>
        <p className="text-[9px] text-muted-foreground italic max-w-[600px] mx-auto">
          Safety Inspection and reporting carried out in accordance with the Gas Safety
          (Installation and Use) Regulations and the Gas Industry Unsafe Situations Procedure.
        </p>
        <div className="flex justify-between text-[10px] pt-1">
          <span><strong>Inspection Date:</strong> {jobDetails.inspection_date || "—"}</span>
          <span><strong>Next Due:</strong> {jobDetails.next_inspection_due || "—"}</span>
        </div>
      </div>

      {/* Company / Installer + Job Address + Customer — 3-column grid */}
      <div className="grid grid-cols-3 gap-3">
        <FieldCard title="Company / Installer">
          <Field label="Engineer" value={companyInfo.engineer_name} />
          <Field label="Company" value={companyInfo.company_name} />
          <Field label="Address" value={companyInfo.company_address} />
          <Field label="Telephone" value={companyInfo.company_phone} />
          <Field label="Gas Safe Reg." value={companyInfo.gas_safe_reg_no} />
          <Field label="ID Card No." value={companyInfo.gas_safe_id_card_no} />
        </FieldCard>

        <FieldCard title="Job Address">
          <Field label="Site Name" value={jobDetails.job_address_name} />
          <Field label="Address" value={jobDetails.job_address} />
          <Field label="Postcode" value={jobDetails.job_postcode} />
          <Field label="Telephone" value={jobDetails.job_phone} />
        </FieldCard>

        <FieldCard title="Customer / Landlord">
          <Field label="Name" value={jobDetails.customer_name} />
          <Field label="Company" value={jobDetails.customer_company} />
          <Field label="Address" value={jobDetails.customer_address} />
          <Field label="Postcode" value={jobDetails.customer_postcode} />
          <Field label="Telephone" value={jobDetails.customer_phone} />
        </FieldCard>
      </div>

      {/* Appliance Inspection Table */}
      <div>
        <h3 className="text-xs font-semibold mb-1">Appliance Inspection</h3>
        <div className="overflow-x-auto border border-border rounded">
          <table className="w-full text-[8px] border-collapse">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                {[
                  "#", "Location", "Type", "Make", "Model", "Flue", "L/L",
                  "Insp.", "Press", "Heat", "H CO", "H CO₂", "H Ratio",
                  "L CO", "L CO₂", "L Ratio", "Safety", "Vent.", "Visual",
                  "Flue P.", "Srv'd", "Safe",
                ].map((h) => (
                  <th key={h} className="border border-border px-0.5 py-1 font-medium whitespace-pre-line text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appliances.map((a, i) => (
                <tr key={i} className="text-center">
                  <td className="border border-border px-0.5 py-0.5">{i + 1}</td>
                  <td className="border border-border px-0.5 py-0.5 text-left">{a.location}</td>
                  <td className="border border-border px-0.5 py-0.5 text-left">{a.appliance_type}</td>
                  <td className="border border-border px-0.5 py-0.5 text-left">{a.make}</td>
                  <td className="border border-border px-0.5 py-0.5 text-left">{a.model}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.flue_type}</td>
                  <td className="border border-border px-0.5 py-0.5">{yn(a.landlord_appliance)}</td>
                  <td className="border border-border px-0.5 py-0.5">{yn(a.appliance_inspected)}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.operating_pressure_mbar || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.heat_input_kw || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.high_co_ppm || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.high_co2_percent || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.high_co_ratio || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.low_co_ppm || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.low_co2_percent || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.low_co_ratio || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{yn(a.safety_devices_correct)}</td>
                  <td className="border border-border px-0.5 py-0.5">{yn(a.ventilation_satisfactory)}</td>
                  <td className="border border-border px-0.5 py-0.5">{yn(a.visual_condition_satisfactory)}</td>
                  <td className="border border-border px-0.5 py-0.5">{a.flue_performance_test || "—"}</td>
                  <td className="border border-border px-0.5 py-0.5">{yn(a.appliance_serviced)}</td>
                  <td className="border border-border px-0.5 py-0.5">{yn(a.appliance_safe_to_use)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Defects */}
      <div>
        <h3 className="text-xs font-semibold mb-1">Defects Identified</h3>
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-[9px] border-collapse">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                <th className="border border-border px-1 py-1 w-8 font-medium">#</th>
                <th className="border border-border px-1 py-1 font-medium text-left">Description</th>
                <th className="border border-border px-1 py-1 w-24 font-medium">Warning Notice</th>
              </tr>
            </thead>
            <tbody>
              {defects.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border border-border px-1 py-2 text-center text-muted-foreground">
                    No defects recorded
                  </td>
                </tr>
              ) : (
                defects.map((d, i) => (
                  <tr key={i}>
                    <td className="border border-border px-1 py-0.5 text-center">{d.number}</td>
                    <td className="border border-border px-1 py-0.5">{d.description}</td>
                    <td className="border border-border px-1 py-0.5 text-center">{yn(d.warning_labels_issued)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gas Installation Safety Checks */}
      <div>
        <h3 className="text-xs font-semibold mb-1">Gas Installation Safety Checks</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 border border-border rounded p-2 text-[10px]">
          <CheckRow label="Emergency Control Accessible" value={gasChecks.emergency_control_accessible} />
          <CheckRow label="Gas Tightness Satisfactory" value={gasChecks.gas_tightness_satisfactory} />
          <CheckRow label="Pipework Visual Inspection Satisfactory" value={gasChecks.pipework_visual_satisfactory} />
          <CheckRow label="Equipotential Bonding Satisfactory" value={gasChecks.equipotential_bonding} />
        </div>
      </div>

      {/* Comments */}
      {comments && (
        <div>
          <h3 className="text-xs font-semibold mb-1">Comments</h3>
          <p className="border border-border rounded p-2 text-[10px] whitespace-pre-wrap min-h-[40px]">
            {comments}
          </p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
        <div className="space-y-1">
          <h4 className="text-[10px] font-semibold">Engineer</h4>
          <div className="border border-border rounded p-2 h-12 flex items-end">
            <span className="text-[9px] text-muted-foreground italic">Signature captured on issue</span>
          </div>
          <p className="text-[10px]"><strong>Name:</strong> {issuedByName || "—"}</p>
        </div>
        <div className="space-y-1">
          <h4 className="text-[10px] font-semibold">Customer / Representative</h4>
          <div className="border border-border rounded p-2 h-12 flex items-end">
            <span className="text-[9px] text-muted-foreground italic">Signature captured on issue</span>
          </div>
          <p className="text-[10px]"><strong>Name:</strong> {receivedByName || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function FieldCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded p-2 space-y-0.5">
      <h4 className="text-[10px] font-semibold border-b border-border pb-0.5 mb-1">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-muted-foreground font-medium shrink-0">{label}:</span>
      <span className="truncate">{value || "—"}</span>
    </div>
  );
}

function CheckRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={`font-semibold ${value ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
        {yn(value)}
      </span>
    </div>
  );
}
