import { WarningNoticeData } from "./WarningNoticeFields";
import { AlertTriangle, Phone } from "lucide-react";

interface WarningNoticePreviewProps {
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
    customer_mobile?: string;
    inspection_date: string;
  };
  warningData: WarningNoticeData;
  comments: string;
  issuedByName: string;
  receivedByName: string;
  issuedBySignature?: string;
  receivedBySignature?: string;
}

const classLabels: Record<string, string> = {
  immediately_dangerous: "ID – Immediately Dangerous",
  at_risk: "AR – At Risk",
  not_to_current_standards: "NCS – Not to Current Standards",
};

const ynLabel = (v: string) => v === "yes" ? "Yes" : v === "no" ? "No" : "N/A";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="font-semibold text-[9px] min-w-[70px]">{label}:</span>
      <span className="text-[9px]">{value || "—"}</span>
    </div>
  );
}

export function WarningNoticePreview({ companyInfo, jobDetails, warningData, comments, issuedByName, receivedByName, issuedBySignature, receivedBySignature }: WarningNoticePreviewProps) {
  return (
    <div className="w-full max-w-[1100px] mx-auto">
      <div className="bg-white text-black border rounded-lg shadow-lg aspect-[1.414/1] p-6 overflow-hidden flex flex-col" style={{ fontSize: "10px" }}>
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-base font-bold text-[#1a365d]">Gas Warning Notice</h1>
          <p className="text-[8px] italic text-gray-500 mt-0.5">
            This form should be completed in accordance with the requirements of the current Gas Industry Unsafe Situations Procedure.
          </p>
        </div>

        {/* Three column info */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Company / Installer</div>
            <InfoRow label="Engineer" value={companyInfo.engineer_name} />
            <InfoRow label="Company" value={companyInfo.company_name} />
            <InfoRow label="Address" value={companyInfo.company_address} />
            <InfoRow label="Tel" value={companyInfo.company_phone} />
            <InfoRow label="Gas Safe" value={companyInfo.gas_safe_reg_no} />
            <InfoRow label="ID Card" value={companyInfo.gas_safe_id_card_no} />
          </div>
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Job Address</div>
            <InfoRow label="Name" value={jobDetails.job_address_name} />
            <InfoRow label="Address" value={jobDetails.job_address} />
            <InfoRow label="Postcode" value={jobDetails.job_postcode} />
            <InfoRow label="Tel" value={jobDetails.job_phone} />
            <InfoRow label="Date" value={jobDetails.inspection_date} />
          </div>
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Client / Landlord</div>
            <InfoRow label="Name" value={jobDetails.customer_name} />
            <InfoRow label="Company" value={jobDetails.customer_company} />
            <InfoRow label="Address" value={jobDetails.customer_address} />
            <InfoRow label="Postcode" value={jobDetails.customer_postcode} />
            <InfoRow label="Tel" value={jobDetails.customer_phone} />
            <InfoRow label="Mobile" value={jobDetails.customer_mobile || ""} />
          </div>
        </div>

        {/* Appliance Details + Classification + Issue Types */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Gas Appliance / Installation Details</div>
            <InfoRow label="Location" value={warningData.warning_location} />
            <InfoRow label="Make" value={warningData.warning_make} />
            <InfoRow label="Type" value={warningData.warning_type} />
            <InfoRow label="Model" value={warningData.warning_model} />
            <InfoRow label="Serial No" value={warningData.warning_serial_no} />
            <div className="mt-1 pt-1 border-t">
              <span className="font-semibold text-[9px]">Classification: </span>
              <span className="text-[9px] font-bold text-destructive">{classLabels[warningData.classification] || "—"}</span>
            </div>
          </div>
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Issue Type</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {[
                ["Gas Escape", warningData.issue_gas_escape],
                ["Pipework", warningData.issue_pipework],
                ["Ventilation", warningData.issue_ventilation],
                ["Meter", warningData.issue_meter],
                ["Chimney/Flue", warningData.issue_chimney_flue],
                ["Other", warningData.issue_other],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-[9px]">
                  <span>{label}</span>
                  <span className="font-semibold">{ynLabel(val)}</span>
                </div>
              ))}
            </div>
            {warningData.issue_other === "yes" && warningData.issue_other_description && (
              <div className="mt-1 pt-1 border-t">
                <span className="text-[8px] italic">{warningData.issue_other_description}</span>
              </div>
            )}
          </div>
        </div>

        {/* ID Warning Banner */}
        {warningData.classification === "immediately_dangerous" && (
          <div className="bg-red-100 border border-red-400 rounded p-1.5 mb-2 flex gap-1.5 items-start">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[8px] font-bold text-red-700">
              IMMEDIATELY DANGEROUS – The appliance(s) / installation has been classified as IMMEDIATELY DANGEROUS, disconnected from the gas supply and a 'DANGER DO NOT USE' label attached.
            </p>
          </div>
        )}

        {/* Faults, Actions Taken, Actions Required */}
        <div className="grid grid-cols-3 gap-2 mb-2 flex-1 min-h-0">
          <div className="border rounded p-1.5 flex flex-col">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Details of Faults</div>
            <p className="text-[8px] flex-1 whitespace-pre-wrap">{warningData.fault_details || "—"}</p>
          </div>
          <div className="border rounded p-1.5 flex flex-col">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Actions Taken</div>
            <p className="text-[8px] flex-1 whitespace-pre-wrap">{warningData.actions_taken || "—"}</p>
          </div>
          <div className="border rounded p-1.5 flex flex-col">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Actions Required</div>
            <p className="text-[8px] flex-1 whitespace-pre-wrap">{warningData.actions_required || "—"}</p>
          </div>
        </div>

        {/* RIDDOR + Comments */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">RIDDOR Reporting</div>
            <div className="flex justify-between text-[9px] mb-0.5">
              <span>RIDDOR Reg 11(1) – Gas Incident</span>
              <span className="font-semibold">{ynLabel(warningData.riddor_11_1_status)}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>RIDDOR Reg 11(2) – Dangerous Gas Fitting</span>
              <span className="font-semibold">{ynLabel(warningData.riddor_11_2_status)}</span>
            </div>
          </div>
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Engineer Comments</div>
            <p className="text-[8px] whitespace-pre-wrap">{comments || "—"}</p>
          </div>
        </div>

        {/* Legal Declaration */}
        <div className="border rounded p-1.5 mb-2 bg-gray-50">
          <p className="text-[7px] italic text-gray-600">
            I confirm that I have received this Warning / Advice Notice concerning the safety of the gas installation and understand that use of an IMMEDIATELY DANGEROUS or AT RISK installation may present a hazard and could breach Gas Safety regulations.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Issued By (Engineer)</div>
            <div className="h-6 border-b border-dashed mb-1 flex items-end">
              {issuedBySignature ? (
                <img src={issuedBySignature} alt="Engineer signature" className="max-h-full max-w-full object-contain" />
              ) : null}
            </div>
            <InfoRow label="Print Name" value={issuedByName} />
          </div>
          <div className="border rounded p-1.5">
            <div className="bg-[#1a365d] text-white text-[8px] font-bold px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1 rounded-t">Received By (Client)</div>
            <div className="h-6 border-b border-dashed mb-1 flex items-end">
              {receivedBySignature ? (
                <img src={receivedBySignature} alt="Client signature" className="max-h-full max-w-full object-contain" />
              ) : null}
            </div>
            <InfoRow label="Print Name" value={receivedByName} />
            <InfoRow label="Date" value={jobDetails.inspection_date} />
          </div>
        </div>

        {/* Emergency contacts footer */}
        <div className="flex justify-center gap-8 text-[8px] text-gray-500 mt-auto">
          <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> Gas Safe Register: 0800 408 5500</span>
          <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> Gas Emergency Services: 0800 111 999</span>
        </div>
      </div>
    </div>
  );
}
