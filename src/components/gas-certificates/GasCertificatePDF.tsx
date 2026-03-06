import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CertificateData {
  certificate_number: string;
  certificate_type: string;
  inspection_date: string;
  next_inspection_due?: string | null;
  job_address_name?: string | null;
  job_address?: string | null;
  job_postcode?: string | null;
  customer_name?: string | null;
  customer_company?: string | null;
  emergency_control_accessible?: boolean | null;
  gas_tightness_satisfactory?: boolean | null;
  pipework_visual_satisfactory?: boolean | null;
  equipotential_bonding?: boolean | null;
  co_alarm_present?: boolean | null;
  comments?: string | null;
  issued_by_name?: string | null;
  classification?: string | null;
  issue_type?: string | null;
  actions_taken?: string | null;
  actions_required?: string | null;
  test_method?: string | null;
  test_pressure_mbar?: number | null;
  strength_test_result?: string | null;
  tightness_test_result?: string | null;
  purge_completed?: boolean | null;
  appliances?: Array<{
    location?: string | null;
    appliance_type?: string | null;
    make?: string | null;
    model?: string | null;
    operating_pressure_mbar?: number | null;
    high_co_ppm?: number | null;
    appliance_safe_to_use?: boolean | null;
  }>;
  company_name?: string;
}

const TYPE_TITLES: Record<string, string> = {
  landlord_gas_safety: "Landlord Gas Safety Record",
  homeowner_gas_safety: "Homeowner Gas Safety Record",
  nd_gas_safety: "Non-Domestic Gas Safety Record",
  nd_gas_testing_purging: "Gas Testing & Purging Certificate",
  gas_warning_notice: "Gas Warning Notice",
};

const yn = (v?: boolean | null) => v ? "Yes" : "No";

export function generateGasCertificatePDF(data: CertificateData): jsPDF {
  const doc = new jsPDF();
  const title = TYPE_TITLES[data.certificate_type] || "Gas Certificate";

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (data.company_name) {
    doc.text(data.company_name, 105, 28, { align: "center" });
  }
  doc.text(`Certificate No: ${data.certificate_number}`, 105, 34, { align: "center" });

  let y = 42;

  // Job details
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
    head: [["Property / Job Details", ""]],
    body: [
      ["Property Name", data.job_address_name || "-"],
      ["Address", data.job_address || "-"],
      ["Postcode", data.job_postcode || "-"],
      ["Customer", data.customer_name || "-"],
      ["Inspection Date", data.inspection_date],
      ...(data.next_inspection_due ? [["Next Inspection Due", data.next_inspection_due]] : []),
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Type-specific sections
  if (["landlord_gas_safety", "homeowner_gas_safety", "nd_gas_safety"].includes(data.certificate_type)) {
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [39, 174, 96] },
      head: [["Gas Installation Checks", "Result"]],
      body: [
        ["Emergency Control Accessible", yn(data.emergency_control_accessible)],
        ["Gas Tightness Satisfactory", yn(data.gas_tightness_satisfactory)],
        ["Pipework Visual Inspection", yn(data.pipework_visual_satisfactory)],
        ["Equipotential Bonding", yn(data.equipotential_bonding)],
        ["CO Alarm Present", yn(data.co_alarm_present)],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Appliances table
    if (data.appliances && data.appliances.length > 0) {
      autoTable(doc, {
        startY: y,
        theme: "grid",
        headStyles: { fillColor: [142, 68, 173] },
        head: [["#", "Location", "Type", "Make", "Model", "Pressure", "CO (ppm)", "Safe"]],
        body: data.appliances.map((a, i) => [
          String(i + 1),
          a.location || "-",
          a.appliance_type || "-",
          a.make || "-",
          a.model || "-",
          a.operating_pressure_mbar?.toString() || "-",
          a.high_co_ppm?.toString() || "-",
          yn(a.appliance_safe_to_use),
        ]),
        styles: { fontSize: 8 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  if (data.certificate_type === "gas_warning_notice") {
    const classLabels: Record<string, string> = {
      immediately_dangerous: "Immediately Dangerous (ID)",
      at_risk: "At Risk (AR)",
      not_to_current_standards: "Not to Current Standards (NCS)",
    };
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [192, 57, 43] },
      head: [["Warning Details", ""]],
      body: [
        ["Classification", classLabels[data.classification || ""] || "-"],
        ["Issue Type", data.issue_type || "-"],
        ["Actions Taken", data.actions_taken || "-"],
        ["Actions Required", data.actions_required || "-"],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (data.certificate_type === "nd_gas_testing_purging") {
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [44, 62, 80] },
      head: [["Testing & Purging", ""]],
      body: [
        ["Test Method", data.test_method || "-"],
        ["Test Pressure (mbar)", data.test_pressure_mbar?.toString() || "-"],
        ["Strength Test Result", data.strength_test_result || "-"],
        ["Tightness Test Result", data.tightness_test_result || "-"],
        ["Purge Completed", yn(data.purge_completed)],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Comments
  if (data.comments) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Comments:", 14, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.comments, 180);
    doc.text(lines, 14, y + 6);
    y += 6 + lines.length * 5;
  }

  // Signature
  y += 10;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.text("Issued By:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.issued_by_name || "-", 50, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text("Generated by FTrack Gas Compliance", 105, 290, { align: "center" });

  return doc;
}
