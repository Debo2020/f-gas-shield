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
  job_phone?: string | null;
  customer_name?: string | null;
  customer_company?: string | null;
  customer_address?: string | null;
  customer_postcode?: string | null;
  customer_phone?: string | null;
  emergency_control_accessible?: boolean | null;
  gas_tightness_satisfactory?: boolean | null;
  pipework_visual_satisfactory?: boolean | null;
  equipotential_bonding?: boolean | null;
  co_alarm_present?: boolean | null;
  comments?: string | null;
  issued_by_name?: string | null;
  received_by_name?: string | null;
  classification?: string | null;
  issue_type?: string | null;
  actions_taken?: string | null;
  actions_required?: string | null;
  test_method?: string | null;
  test_pressure_mbar?: number | null;
  strength_test_result?: string | null;
  tightness_test_result?: string | null;
  purge_completed?: boolean | null;
  defects?: Array<{
    number?: number;
    description?: string;
    warning_labels_issued?: boolean;
  }> | null;
  appliances?: Array<{
    location?: string | null;
    appliance_type?: string | null;
    make?: string | null;
    model?: string | null;
    flue_type?: string | null;
    landlord_appliance?: boolean | null;
    appliance_inspected?: boolean | null;
    operating_pressure_mbar?: number | null;
    heat_input_kw?: number | null;
    high_co_ratio?: number | null;
    high_co_ppm?: number | null;
    high_co2_percent?: number | null;
    low_co_ratio?: number | null;
    low_co_ppm?: number | null;
    low_co2_percent?: number | null;
    safety_devices_correct?: boolean | null;
    ventilation_satisfactory?: boolean | null;
    visual_condition_satisfactory?: boolean | null;
    flue_performance_test?: string | null;
    appliance_serviced?: boolean | null;
    appliance_safe_to_use?: boolean | null;
  }>;
  // Company/installer info
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  gas_safe_reg_no?: string;
  engineer_gas_safe_id?: string;
  company_logo_base64?: string;
}

const TYPE_TITLES: Record<string, string> = {
  landlord_gas_safety: "Landlord Gas Safety Record",
  homeowner_gas_safety: "Homeowner Gas Safety Record",
  nd_gas_safety: "Non Domestic Gas Safety Record",
  nd_gas_testing_purging: "Gas Testing & Purging Certificate",
  gas_warning_notice: "Gas Warning Notice",
};

const yn = (v?: boolean | null) => v ? "Yes" : "No";
const tick = (v?: boolean | null) => v ? "✓" : "✗";

export function generateGasCertificatePDF(data: CertificateData): jsPDF {
  const doc = new jsPDF();
  const title = TYPE_TITLES[data.certificate_type] || "Gas Certificate";

  if (data.certificate_type === "nd_gas_safety") {
    return generateNDGasSafetyPDF(doc, data, title);
  }

  // ---- Original layout for other types ----
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
  if (["landlord_gas_safety", "homeowner_gas_safety"].includes(data.certificate_type)) {
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

// ---- Non-Domestic Gas Safety Record — Portrait layout matching sample ----
function generateNDGasSafetyPDF(doc: jsPDF, data: CertificateData, title: string): jsPDF {
  const navy: [number, number, number] = [26, 54, 93];
  const darkGrey: [number, number, number] = [55, 65, 81];
  const pageWidth = 210;
  const marginL = 14;
  const marginR = 14;
  const contentWidth = pageWidth - marginL - marginR;

  let y = 12;

  // ── HEADER: Logo (left) | Title (centre) | Cert No (right) ──
  const logoW = 28;
  const logoH = 16;
  if (data.company_logo_base64) {
    try {
      doc.addImage(data.company_logo_base64, "PNG", marginL, y - 2, logoW, logoH);
    } catch {
      // logo failed — skip gracefully
    }
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(title, pageWidth / 2, y + 5, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Cert. No. ${data.certificate_number}`, pageWidth - marginR, y + 5, { align: "right" });

  y += logoH + 4;

  // ── Regulatory subtitle ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const subtitle = "Safety inspection and reporting carried out in accordance with the Gas Safety (Installation and Use) Regulations 1998 as amended.";
  doc.text(subtitle, pageWidth / 2, y, { align: "center", maxWidth: contentWidth });
  y += 6;

  doc.setTextColor(0, 0, 0);

  // ── 1. Company / Installer Details ──
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 8, fontStyle: "bold", halign: "left" },
    head: [["Company / Installer Details", ""]],
    body: [
      ["Engineer Name", data.issued_by_name || "-"],
      ["Company Name", data.company_name || "-"],
      ["Company Address", data.company_address || "-"],
      ["Telephone", data.company_phone || "-"],
      ["Gas Safe Registration No.", data.gas_safe_reg_no || "-"],
      ["ID Card Number", data.engineer_gas_safe_id || "-"],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ── 2. Job Address ──
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 8, fontStyle: "bold", halign: "left" },
    head: [["Job Address", ""]],
    body: [
      ["Site Name", data.job_address_name || "-"],
      ["Address", data.job_address || "-"],
      ["Post Code", data.job_postcode || "-"],
      ["Telephone", data.job_phone || "-"],
      ["Inspection Date", data.inspection_date],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ── 3. Customer / Landlord ──
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 8, fontStyle: "bold", halign: "left" },
    head: [["Customer / Landlord", ""]],
    body: [
      ["Name", data.customer_name || "-"],
      ["Company", data.customer_company || "-"],
      ["Address", data.customer_address || "-"],
      ["Post Code", data.customer_postcode || "-"],
      ["Telephone", data.customer_phone || "-"],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ── 4. Appliance Details / Inspection Table ──
  if (y > 190) { doc.addPage(); y = 15; }

  if (data.appliances && data.appliances.length > 0) {
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: navy, fontSize: 5, halign: "center", fontStyle: "bold", cellPadding: 1 },
      head: [[
        "#",
        "Location",
        "Type",
        "Make",
        "Model",
        "Flue\nType",
        "L/L\nApp",
        "Insp.",
        "Press.\n(mbar)",
        "Heat\n(kW/h)",
        "H CO\n(ppm)",
        "H CO₂\n(%)",
        "H CO\nRatio",
        "L CO\n(ppm)",
        "L CO₂\n(%)",
        "L CO\nRatio",
        "Safety\nDev.",
        "Vent.\nProv.",
        "Visual\nCond.",
        "Flue\nPerf.",
        "Srv'd",
        "Safe",
      ]],
      body: data.appliances.map((a, i) => [
        String(i + 1),
        a.location || "-",
        a.appliance_type || "-",
        a.make || "-",
        a.model || "-",
        a.flue_type || "-",
        tick(a.landlord_appliance),
        tick(a.appliance_inspected),
        a.operating_pressure_mbar?.toString() || "-",
        a.heat_input_kw?.toString() || "-",
        a.high_co_ppm?.toString() || "-",
        a.high_co2_percent?.toString() || "-",
        a.high_co_ratio?.toString() || "-",
        a.low_co_ppm?.toString() || "-",
        a.low_co2_percent?.toString() || "-",
        a.low_co_ratio?.toString() || "-",
        tick(a.safety_devices_correct),
        tick(a.ventilation_satisfactory),
        tick(a.visual_condition_satisfactory),
        a.flue_performance_test || "-",
        tick(a.appliance_serviced),
        tick(a.appliance_safe_to_use),
      ]),
      styles: { fontSize: 5, cellPadding: 1, halign: "center" },
      columnStyles: {
        0: { cellWidth: 5 },
        1: { cellWidth: 11, halign: "left" },
        2: { cellWidth: 10, halign: "left" },
        3: { cellWidth: 9, halign: "left" },
        4: { cellWidth: 9, halign: "left" },
        5: { cellWidth: 8 },
        6: { cellWidth: 7 },
        7: { cellWidth: 7 },
        8: { cellWidth: 9 },
        9: { cellWidth: 9 },
        10: { cellWidth: 8 },
        11: { cellWidth: 8 },
        12: { cellWidth: 8 },
        13: { cellWidth: 8 },
        14: { cellWidth: 8 },
        15: { cellWidth: 8 },
        16: { cellWidth: 7 },
        17: { cellWidth: 7 },
        18: { cellWidth: 7 },
        19: { cellWidth: 7 },
        20: { cellWidth: 7 },
        21: { cellWidth: 7 },
      },
      margin: { left: marginL, right: marginR },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // ── 5. Defects / Identified ──
  if (y > 240) { doc.addPage(); y = 15; }
  const defectsArray = Array.isArray(data.defects) ? data.defects : [];
  const applianceCount = data.appliances?.length || 0;
  const defectRows = Math.max(applianceCount, defectsArray.length, 1);
  const defectBody: string[][] = [];
  for (let i = 0; i < defectRows; i++) {
    const d = defectsArray[i] as any;
    defectBody.push([
      String(i + 1),
      d?.description || "-",
      d ? yn(d.warning_labels_issued) : "-",
    ]);
  }
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 8, fontStyle: "bold", halign: "left" },
    head: [["#", "Defect Description", "Labels & Warning Notice Issued"]],
    body: defectBody,
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      2: { cellWidth: 50, halign: "center" },
    },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ── 6. Gas Installation Safety Checks ──
  if (y > 250) { doc.addPage(); y = 15; }
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 8, fontStyle: "bold", halign: "left" },
    head: [["Gas Installation Safety Checks", "Result"]],
    body: [
      ["Emergency Control Accessible", yn(data.emergency_control_accessible)],
      ["Gas Tightness Satisfactory", yn(data.gas_tightness_satisfactory)],
      ["Gas Installation Pipework Visual Inspection Satisfactory", yn(data.pipework_visual_satisfactory)],
      ["Equipotential Bonding", yn(data.equipotential_bonding)],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 120 }, 1: { halign: "center" } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ── 7. Next Inspection Due ──
  if (data.next_inspection_due) {
    if (y > 260) { doc.addPage(); y = 15; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`Next Inspection Due: ${data.next_inspection_due}`, marginL, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  // ── 8. Comments ──
  if (data.comments) {
    if (y > 250) { doc.addPage(); y = 15; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Comments:", marginL, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.comments, contentWidth);
    doc.text(lines, marginL, y + 5);
    y += 5 + lines.length * 4;
  }

  // ── 9. Signatures ──
  y += 4;
  if (y > 240) { doc.addPage(); y = 15; }
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 8, fontStyle: "bold", halign: "left" },
    head: [["Signatures", ""]],
    body: [
      ["Issued By — Signed", ""],
      ["Issued By — Print Name", data.issued_by_name || "-"],
      ["Received By — Signed", ""],
      ["Received By — Print Name", data.received_by_name || "-"],
      ["Date", data.inspection_date],
    ],
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // ── Footer ──
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text("Generated by FTrack Gas Compliance", pageWidth / 2, 290, { align: "center" });

  return doc;
}
