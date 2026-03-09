import { ApplianceData } from "./ApplianceFields";

interface DefectRow {
  number: number;
  description: string;
  warning_labels_issued: boolean;
}

interface LandlordCertificatePreviewProps {
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
  issuedBySignature?: string;
  receivedBySignature?: string;
  title?: string;
}

const yn = (v: boolean) => (v ? "Yes" : "No");

const ITEMS_PER_PAGE = 6;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function LandlordCertificatePreview({
  companyInfo,
  jobDetails,
  gasChecks,
  appliances,
  defects,
  comments,
  issuedByName,
  receivedByName,
  issuedBySignature,
  receivedBySignature,
  title = "Landlord Gas Safety Record",
}: LandlordCertificatePreviewProps) {
  const applianceChunks = chunk(appliances, ITEMS_PER_PAGE);
  const defectChunks = chunk(defects, ITEMS_PER_PAGE);
  const hasApplianceOverflow = applianceChunks.length > 1;
  const hasDefectOverflow = defectChunks.length > 1;

  let totalPages = 1;
  if (hasApplianceOverflow) totalPages += applianceChunks.length - 1;
  if (hasDefectOverflow) totalPages += defectChunks.length - 1;

  const jobAddressSummary = [jobDetails.job_address_name, jobDetails.job_address, jobDetails.job_postcode].filter(Boolean).join(", ");

  const tableHeaders = [
    "#", "Location", "Type", "Make", "Model", "Flue", "L/L",
    "Insp.", "Press", "Heat", "H CO", "H CO₂", "H Ratio",
    "L CO", "L CO₂", "L Ratio", "Safety", "Vent.", "Visual",
    "Flue P.", "Srv'd", "Safe",
  ];

  let pageCounter = 0;

  const renderApplianceTable = (items: ApplianceData[], startIndex: number) => (
    <div className="overflow-x-auto border border-border rounded">
      <table className="w-full text-[7px] border-collapse">
        <thead>
          <tr className="bg-muted text-muted-foreground">
            {tableHeaders.map((h) => (
              <th key={h} className="border border-border px-0.5 py-0.5 font-medium whitespace-pre-line text-center">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((a, i) => (
            <tr key={i} className="text-center">
              <td className="border border-border px-0.5 py-0.5">{startIndex + i + 1}</td>
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
  );

  const renderDefectTable = (items: DefectRow[], startIndex: number) => (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full text-[8px] border-collapse">
        <thead>
          <tr className="bg-muted text-muted-foreground">
            <th className="border border-border px-1 py-0.5 w-8 font-medium">#</th>
            <th className="border border-border px-1 py-0.5 font-medium text-left">Description</th>
            <th className="border border-border px-1 py-0.5 w-24 font-medium">Warning Notice</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="border border-border px-1 py-1 text-center text-muted-foreground">
                No defects recorded
              </td>
            </tr>
          ) : (
            items.map((d, i) => (
              <tr key={i}>
                <td className="border border-border px-1 py-0.5 text-center">{startIndex + i + 1}</td>
                <td className="border border-border px-1 py-0.5">{d.description}</td>
                <td className="border border-border px-1 py-0.5 text-center">{yn(d.warning_labels_issued)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderPageFooter = (pageNum: number) => (
    <div className="flex justify-between text-[7px] text-muted-foreground pt-1 border-t border-border mt-auto">
      <span>Generated by FTrack Gas Compliance</span>
      <span>Page {pageNum} of {totalPages}</span>
    </div>
  );

  const renderContinuationHeader = (sectionLabel: string, pageNum: number) => (
    <div className="space-y-1 border-b border-border pb-2">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        <span className="text-[9px] font-semibold">Cert. No. {jobDetails.inspection_date ? "" : ""}{/* cert number not in props — show title */}</span>
      </div>
      <p className="text-[8px] text-muted-foreground">Property: {jobAddressSummary || "—"}</p>
      <p className="text-[9px] font-semibold text-primary">Continuation Page — {sectionLabel}</p>
    </div>
  );

  // Build pages
  const pages: React.ReactNode[] = [];

  // ── PAGE 1 ──
  pageCounter++;
  pages.push(
    <div key="page1" className="bg-background border border-border rounded-lg shadow-lg mx-auto max-w-[1100px] aspect-[1.414/1] p-6 flex flex-col text-foreground text-[10px] leading-tight overflow-hidden">
      {/* Header */}
      <div className="text-center space-y-1 border-b border-border pb-2">
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        <p className="text-[8px] text-muted-foreground italic max-w-[600px] mx-auto">
          Safety Inspection and reporting carried out in accordance with the Gas Safety
          (Installation and Use) Regulations 1998 section 26(9) and the Gas Industry Unsafe Situations Procedure.
        </p>
        <div className="flex justify-between text-[9px] pt-1">
          <span><strong>Inspection Date:</strong> {jobDetails.inspection_date || "—"}</span>
          <span><strong>Next Inspection Due Before:</strong> {jobDetails.next_inspection_due || "—"}</span>
        </div>
      </div>

      {/* Company / Job / Customer — 3-column grid */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <FieldCard title="Company / Installer">
          <Field label="Engineer" value={companyInfo.engineer_name} />
          <Field label="Company" value={companyInfo.company_name} />
          <Field label="Address" value={companyInfo.company_address} />
          <Field label="Telephone" value={companyInfo.company_phone} />
          <Field label="Gas Safe Reg." value={companyInfo.gas_safe_reg_no} />
          <Field label="ID Card No." value={companyInfo.gas_safe_id_card_no} />
        </FieldCard>

        <FieldCard title="Job Address">
          <Field label="Name" value={jobDetails.job_address_name} />
          <Field label="Address" value={jobDetails.job_address} />
          <Field label="Post Code" value={jobDetails.job_postcode} />
          <Field label="Telephone" value={jobDetails.job_phone} />
        </FieldCard>

        <FieldCard title="Customer / Landlord">
          <Field label="Name" value={jobDetails.customer_name} />
          <Field label="Company" value={jobDetails.customer_company} />
          <Field label="Address" value={jobDetails.customer_address} />
          <Field label="Post Code" value={jobDetails.customer_postcode} />
          <Field label="Telephone" value={jobDetails.customer_phone} />
        </FieldCard>
      </div>

      {/* Appliance table — first 6 */}
      <div className="mt-2">
        <h3 className="text-[9px] font-semibold mb-1">Appliance Inspection Details</h3>
        {renderApplianceTable(applianceChunks[0] || [], 0)}
      </div>

      {/* Defects — first 6 */}
      <div className="mt-2">
        <h3 className="text-[9px] font-semibold mb-1">Defects Identified</h3>
        {renderDefectTable(defectChunks[0] || [], 0)}
      </div>

      {/* CO Alarms + Gas Installation Safety Checks side by side */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <h3 className="text-[9px] font-semibold mb-1">CO Alarms</h3>
          <div className="border border-border rounded p-1.5 text-[9px] space-y-0.5">
            <CheckRow label="CO Alarm(s) Fitted" value={gasChecks.co_alarm_fitted} />
            <CheckRow label="CO Alarm(s) Tested & Satisfactory" value={gasChecks.co_alarm_satisfactory} />
          </div>
        </div>
        <div>
          <h3 className="text-[9px] font-semibold mb-1">Gas Installation Safety Checks</h3>
          <div className="border border-border rounded p-1.5 text-[9px] space-y-0.5">
            <CheckRow label="Emergency Control Accessible" value={gasChecks.emergency_control_accessible} />
            <CheckRow label="Gas Tightness Satisfactory" value={gasChecks.gas_tightness_satisfactory} />
            <CheckRow label="Pipework Visual Inspection Satisfactory" value={gasChecks.pipework_visual_satisfactory} />
            <CheckRow label="Equipotential Bonding" value={gasChecks.equipotential_bonding} />
          </div>
        </div>
      </div>

      {/* Comments */}
      {comments && (
        <div className="mt-2">
          <h3 className="text-[9px] font-semibold mb-1">Comments</h3>
          <p className="border border-border rounded p-1.5 text-[8px] whitespace-pre-wrap min-h-[20px]">
            {comments}
          </p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border mt-2">
        <div className="space-y-0.5">
          <h4 className="text-[9px] font-semibold">Engineer</h4>
          <div className="border border-border rounded p-1 h-8 flex items-end">
            {issuedBySignature ? (
              <img src={issuedBySignature} alt="Engineer signature" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[7px] text-muted-foreground italic">Signature captured on issue</span>
            )}
          </div>
          <p className="text-[8px]"><strong>Name:</strong> {issuedByName || "—"}</p>
        </div>
        <div className="space-y-0.5">
          <h4 className="text-[9px] font-semibold">Customer / Recipient</h4>
          <div className="border border-border rounded p-1 h-8 flex items-end">
            {receivedBySignature ? (
              <img src={receivedBySignature} alt="Client signature" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[7px] text-muted-foreground italic">Signature captured on issue</span>
            )}
          </div>
          <p className="text-[8px]"><strong>Name:</strong> {receivedByName || "—"}</p>
          <p className="text-[8px]"><strong>Date:</strong> {jobDetails.inspection_date || "—"}</p>
        </div>
      </div>

      {renderPageFooter(1)}
    </div>
  );

  // ── CONTINUATION PAGES — Appliances ──
  for (let c = 1; c < applianceChunks.length; c++) {
    pageCounter++;
    pages.push(
      <div key={`app-${c}`} className="bg-background border border-border rounded-lg shadow-lg mx-auto max-w-[1100px] aspect-[1.414/1] p-6 flex flex-col text-foreground text-[10px] leading-tight overflow-hidden mt-4">
        {renderContinuationHeader("Appliances", pageCounter)}
        <div className="mt-3">
          {renderApplianceTable(applianceChunks[c], c * ITEMS_PER_PAGE)}
        </div>
        <div className="flex-1" />
        {renderPageFooter(pageCounter)}
      </div>
    );
  }

  // ── CONTINUATION PAGES — Defects ──
  for (let c = 1; c < defectChunks.length; c++) {
    pageCounter++;
    pages.push(
      <div key={`def-${c}`} className="bg-background border border-border rounded-lg shadow-lg mx-auto max-w-[1100px] aspect-[1.414/1] p-6 flex flex-col text-foreground text-[10px] leading-tight overflow-hidden mt-4">
        {renderContinuationHeader("Defects", pageCounter)}
        <div className="mt-3">
          {renderDefectTable(defectChunks[c], c * ITEMS_PER_PAGE)}
        </div>
        <div className="flex-1" />
        {renderPageFooter(pageCounter)}
      </div>
    );
  }

  return <>{pages}</>;
}

function FieldCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded p-1.5 space-y-0.5">
      <h4 className="text-[9px] font-semibold border-b border-border pb-0.5 mb-0.5">{title}</h4>
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
