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
  co_alarm_fitted?: boolean | null;
  co_alarm_satisfactory?: boolean | null;
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
    const landscapeDoc = new jsPDF({ orientation: "landscape" });
    return generateNDGasSafetyPDF(landscapeDoc, data, title);
  }

  if (data.certificate_type === "landlord_gas_safety" || data.certificate_type === "homeowner_gas_safety") {
    return generateLandlordGasSafetyPDF(doc, data, title);
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
  if (["homeowner_gas_safety"].includes(data.certificate_type)) {
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
  const pageWidth = 297;
  const pageHeight = 210;
  const marginL = 14;
  const marginR = 14;
  const contentWidth = pageWidth - marginL - marginR;
  const colWidth = (contentWidth - 6) / 3; // 3 columns with 3mm gaps

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

  // ── 1-3. Three info sections side-by-side ──
  const infoStartY = y;
  const col1X = marginL;
  const col2X = marginL + colWidth + 3;
  const col3X = marginL + (colWidth + 3) * 2;

  // Column 1: Company / Installer
  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
    head: [["Company / Installer Details", ""]],
    body: [
      ["Engineer Name", data.issued_by_name || "-"],
      ["Company Name", data.company_name || "-"],
      ["Company Address", data.company_address || "-"],
      ["Telephone", data.company_phone || "-"],
      ["Gas Safe Reg. No.", data.gas_safe_reg_no || "-"],
      ["ID Card Number", data.engineer_gas_safe_id || "-"],
    ],
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 32 } },
    margin: { left: col1X, right: pageWidth - col1X - colWidth },
  });
  const col1EndY = (doc as any).lastAutoTable.finalY;

  // Column 2: Job Address
  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
    head: [["Job Address", ""]],
    body: [
      ["Site Name", data.job_address_name || "-"],
      ["Address", data.job_address || "-"],
      ["Post Code", data.job_postcode || "-"],
      ["Telephone", data.job_phone || "-"],
      ["Inspection Date", data.inspection_date],
    ],
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 } },
    margin: { left: col2X, right: pageWidth - col2X - colWidth },
  });
  const col2EndY = (doc as any).lastAutoTable.finalY;

  // Column 3: Customer / Landlord
  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
    head: [["Customer / Landlord", ""]],
    body: [
      ["Name", data.customer_name || "-"],
      ["Company", data.customer_company || "-"],
      ["Address", data.customer_address || "-"],
      ["Post Code", data.customer_postcode || "-"],
      ["Telephone", data.customer_phone || "-"],
    ],
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 28 } },
    margin: { left: col3X, right: pageWidth - col3X - colWidth },
  });
  const col3EndY = (doc as any).lastAutoTable.finalY;

  y = Math.max(col1EndY, col2EndY, col3EndY) + 3;

  // ── 4. Appliance Details / Inspection Table ──
  if (y > 160) { doc.addPage(); y = 15; }

  if (data.appliances && data.appliances.length > 0) {
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: navy, fontSize: 6, halign: "center", fontStyle: "bold", cellPadding: 1.5 },
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
      styles: { fontSize: 6, cellPadding: 1.5, halign: "center" },
      columnStyles: {
        0: { cellWidth: 7 },
        1: { cellWidth: 18, halign: "left" },
        2: { cellWidth: 16, halign: "left" },
        3: { cellWidth: 14, halign: "left" },
        4: { cellWidth: 14, halign: "left" },
        5: { cellWidth: 11 },
        6: { cellWidth: 9 },
        7: { cellWidth: 9 },
        8: { cellWidth: 12 },
        9: { cellWidth: 12 },
        10: { cellWidth: 11 },
        11: { cellWidth: 11 },
        12: { cellWidth: 11 },
        13: { cellWidth: 11 },
        14: { cellWidth: 11 },
        15: { cellWidth: 11 },
        16: { cellWidth: 10 },
        17: { cellWidth: 10 },
        18: { cellWidth: 10 },
        19: { cellWidth: 10 },
        20: { cellWidth: 10 },
        21: { cellWidth: 10 },
      },
      margin: { left: marginL, right: marginR },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // ── 5. Defects / Identified ──
  if (y > 170) { doc.addPage(); y = 15; }
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
      2: { cellWidth: 60, halign: "center" },
    },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ── 6. Gas Installation Safety Checks ──
  if (y > 170) { doc.addPage(); y = 15; }
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
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 160 }, 1: { halign: "center" } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ── 7. Next Inspection Due ──
  if (data.next_inspection_due) {
    if (y > 175) { doc.addPage(); y = 15; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`Next Inspection Due: ${data.next_inspection_due}`, marginL, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  // ── 8. Comments ──
  if (data.comments) {
    if (y > 170) { doc.addPage(); y = 15; }
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
  if (y > 165) { doc.addPage(); y = 15; }
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
  doc.text("Generated by FTrack Gas Compliance", pageWidth / 2, pageHeight - 10, { align: "center" });

  return doc;
}

// ---- Landlord Gas Safety Record — Portrait A4 layout matching reference ----
function generateLandlordGasSafetyPDF(doc: jsPDF, data: CertificateData, title: string): jsPDF {
  const navy: [number, number, number] = [26, 54, 93];
  const pageWidth = 210;
  const marginL = 14;
  const marginR = 14;
  const contentWidth = pageWidth - marginL - marginR;
  const colWidth = (contentWidth - 6) / 3;

  let y = 12;

  // ── HEADER: Logo (left) | Title (centre) | Cert No (right) ──
  if (data.company_logo_base64) {
    try {
      doc.addImage(data.company_logo_base64, "PNG", marginL, y - 2, 24, 14);
    } catch { /* skip */ }
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(title, pageWidth / 2, y + 5, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Cert. No. ${data.certificate_number}`, pageWidth - marginR, y + 5, { align: "right" });

  y += 18;

  // ── Regulatory subtitle ──
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const subtitle = "Safety Inspection and reporting carried out in accordance with the Gas Safety (Installation and Use) Regulations 1998 section 26(9) and the Gas Industry Unsafe Situations Procedure.";
  doc.text(subtitle, pageWidth / 2, y, { align: "center", maxWidth: contentWidth });
  y += 6;

  doc.setTextColor(0, 0, 0);

  // ── Dates row ──
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Inspection Date: ${data.inspection_date}`, marginL, y);
  doc.text(`Next Inspection Due Before: ${data.next_inspection_due || "-"}`, pageWidth - marginR, y, { align: "right" });
  y += 5;

  // ── Three info sections side-by-side ──
  const infoStartY = y;
  const col1X = marginL;
  const col2X = marginL + colWidth + 3;
  const col3X = marginL + (colWidth + 3) * 2;

  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Company / Installer", ""]],
    body: [
      ["Engineer Name", data.issued_by_name || "-"],
      ["Company", data.company_name || "-"],
      ["Address", data.company_address || "-"],
      ["Telephone", data.company_phone || "-"],
      ["Gas Safe Reg.", data.gas_safe_reg_no || "-"],
      ["ID Card No.", data.engineer_gas_safe_id || "-"],
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 22 } },
    margin: { left: col1X, right: pageWidth - col1X - colWidth },
  });
  const c1Y = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Job Address", ""]],
    body: [
      ["Name", data.job_address_name || "-"],
      ["Address", data.job_address || "-"],
      ["Post Code", data.job_postcode || "-"],
      ["Telephone", data.job_phone || "-"],
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 20 } },
    margin: { left: col2X, right: pageWidth - col2X - colWidth },
  });
  const c2Y = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Customer / Landlord", ""]],
    body: [
      ["Name", data.customer_name || "-"],
      ["Company", data.customer_company || "-"],
      ["Address", data.customer_address || "-"],
      ["Post Code", data.customer_postcode || "-"],
      ["Telephone", data.customer_phone || "-"],
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 20 } },
    margin: { left: col3X, right: pageWidth - col3X - colWidth },
  });
  const c3Y = (doc as any).lastAutoTable.finalY;

  y = Math.max(c1Y, c2Y, c3Y) + 3;

  // ── Appliance Details Table ──
  if (data.appliances && data.appliances.length > 0) {
    if (y > 220) { doc.addPage(); y = 15; }
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: navy, fontSize: 5, halign: "center", fontStyle: "bold", cellPadding: 1 },
      head: [[
        "#", "Location", "Type", "Make", "Model", "Flue\nType", "L/L\nApp", "Insp.",
        "Press.\n(mbar)", "Heat\n(kW/h)", "H CO\n(ppm)", "H CO₂\n(%)", "H CO\nRatio",
        "L CO\n(ppm)", "L CO₂\n(%)", "L CO\nRatio", "Safety\nDev.", "Vent.\nProv.",
        "Visual\nCond.", "Flue\nPerf.", "Srv'd", "Safe",
      ]],
      body: data.appliances.map((a, i) => [
        String(i + 1),
        a.location || "-", a.appliance_type || "-", a.make || "-", a.model || "-",
        a.flue_type || "-", tick(a.landlord_appliance), tick(a.appliance_inspected),
        a.operating_pressure_mbar?.toString() || "-", a.heat_input_kw?.toString() || "-",
        a.high_co_ppm?.toString() || "-", a.high_co2_percent?.toString() || "-", a.high_co_ratio?.toString() || "-",
        a.low_co_ppm?.toString() || "-", a.low_co2_percent?.toString() || "-", a.low_co_ratio?.toString() || "-",
        tick(a.safety_devices_correct), tick(a.ventilation_satisfactory),
        tick(a.visual_condition_satisfactory), a.flue_performance_test || "-",
        tick(a.appliance_serviced), tick(a.appliance_safe_to_use),
      ]),
      styles: { fontSize: 5, cellPadding: 1, halign: "center" },
      columnStyles: {
        0: { cellWidth: 5 }, 1: { cellWidth: 12, halign: "left" }, 2: { cellWidth: 10, halign: "left" },
        3: { cellWidth: 10, halign: "left" }, 4: { cellWidth: 10, halign: "left" },
        5: { cellWidth: 8 }, 6: { cellWidth: 7 }, 7: { cellWidth: 7 },
        8: { cellWidth: 9 }, 9: { cellWidth: 9 }, 10: { cellWidth: 8 }, 11: { cellWidth: 8 },
        12: { cellWidth: 8 }, 13: { cellWidth: 8 }, 14: { cellWidth: 8 }, 15: { cellWidth: 8 },
        16: { cellWidth: 8 }, 17: { cellWidth: 7 }, 18: { cellWidth: 8 }, 19: { cellWidth: 7 },
        20: { cellWidth: 7 }, 21: { cellWidth: 7 },
      },
      margin: { left: marginL, right: marginR },
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  }

  // ── Defects ──
  if (y > 240) { doc.addPage(); y = 15; }
  const defectsArray = Array.isArray(data.defects) ? data.defects : [];
  const defectRows: string[][] = defectsArray.length > 0
    ? defectsArray.map((d: any, i: number) => [String(i + 1), d?.description || "-", d ? yn(d.warning_labels_issued) : "-"])
    : [["—", "No defects recorded", "—"]];
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
    head: [["#", "Defect Description", "Labels & Warning Notice Issued"]],
    body: defectRows,
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 8, halign: "center" }, 2: { cellWidth: 45, halign: "center" } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // ── CO Alarms ──
  if (y > 250) { doc.addPage(); y = 15; }
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
    head: [["CO Alarms", "Result"]],
    body: [
      ["CO Alarm(s) Fitted", yn(data.co_alarm_fitted)],
      ["CO Alarm(s) Tested & Satisfactory", yn(data.co_alarm_satisfactory)],
    ],
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 110 }, 1: { halign: "center" } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // ── Gas Installation Safety Checks ──
  if (y > 250) { doc.addPage(); y = 15; }
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
    head: [["Gas Installation Safety Checks", "Result"]],
    body: [
      ["Emergency Control Accessible", yn(data.emergency_control_accessible)],
      ["Gas Tightness Satisfactory", yn(data.gas_tightness_satisfactory)],
      ["Pipework Visual Inspection Satisfactory", yn(data.pipework_visual_satisfactory)],
      ["Equipotential Bonding", yn(data.equipotential_bonding)],
    ],
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 110 }, 1: { halign: "center" } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // ── Comments ──
  if (data.comments) {
    if (y > 250) { doc.addPage(); y = 15; }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Comments:", marginL, y + 3);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.comments, contentWidth);
    doc.text(lines, marginL, y + 7);
    y += 7 + lines.length * 3.5;
  }

  // ── Signatures ──
  y += 3;
  if (y > 250) { doc.addPage(); y = 15; }
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
    head: [["Signatures", ""]],
    body: [
      ["Engineer — Signed", ""],
      ["Engineer — Print Name", data.issued_by_name || "-"],
      ["Customer / Recipient — Signed", ""],
      ["Customer / Recipient — Print Name", data.received_by_name || "-"],
      ["Date", data.inspection_date],
    ],
    styles: { fontSize: 7, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    margin: { left: marginL, right: marginR },
  });

  // ── Footer ──
  doc.setFontSize(6);
  doc.setTextColor(128, 128, 128);
  doc.text("Generated by FTrack Gas Compliance", pageWidth / 2, 287, { align: "center" });

  return doc;
}
