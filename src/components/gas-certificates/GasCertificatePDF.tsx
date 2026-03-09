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
  // T&P fields
  strength_test_method?: string | null;
  strength_installation_type?: string | null;
  strength_components_isolated?: boolean | null;
  strength_calculated_stp_mbar?: number | null;
  strength_test_medium?: string | null;
  strength_stabilisation_minutes?: string | null;
  strength_test_duration_minutes?: string | null;
  strength_permitted_drop_percent?: string | null;
  strength_calculated_drop_mbar?: number | null;
  strength_actual_drop_mbar?: number | null;
  tightness_gas_type?: string | null;
  tightness_installation_type?: string | null;
  tightness_weather_affect?: boolean | null;
  tightness_meter_type?: string | null;
  tightness_meter_model?: string | null;
  tightness_meter_bypass?: boolean | null;
  tightness_gas_meter_volume?: string | null;
  tightness_pipework_volume?: string | null;
  tightness_total_volume?: string | null;
  tightness_test_medium?: string | null;
  tightness_test_pressure_mbar?: number | null;
  tightness_gauge_type?: string | null;
  tightness_mplr_or_mapd?: string | null;
  tightness_letby_period?: string | null;
  tightness_stabilisation_minutes?: string | null;
  tightness_test_duration_minutes?: string | null;
  tightness_inadequate_ventilation?: boolean | null;
  tightness_barometric_correction?: boolean | null;
  tightness_actual_leak_rate?: string | null;
  tightness_actual_pressure_drop_mbar?: number | null;
  tightness_ventilation_checked?: boolean | null;
  purge_risk_assessment?: boolean | null;
  purge_written_procedure?: string | null;
  purge_no_smoking_signs?: boolean | null;
  purge_persons_advised?: boolean | null;
  purge_valves_labelled?: boolean | null;
  purge_nitrogen_verified?: boolean | null;
  purge_two_way_radios?: boolean | null;
  purge_electrical_bonds?: boolean | null;
  purge_gas_meter_volume?: string | null;
  purge_pipework_volume?: string | null;
  purge_total_volume?: string | null;
  purge_detector_safe?: boolean | null;
  purge_final_o2_percent?: string | null;
  purge_result?: string | null;
  work_strength_test?: boolean | null;
  work_tightness_test?: boolean | null;
  work_purge?: boolean | null;
  declaration_type?: string | null;
  // Warning notice fields
  warning_location?: string | null;
  warning_make?: string | null;
  warning_type?: string | null;
  warning_model?: string | null;
  warning_serial_no?: string | null;
  fault_details?: string | null;
  customer_mobile?: string | null;
  issue_gas_escape?: string | null;
  issue_pipework?: string | null;
  issue_ventilation?: string | null;
  issue_meter?: string | null;
  issue_chimney_flue?: string | null;
  issue_other?: string | null;
  issue_other_description?: string | null;
  riddor_11_1_status?: string | null;
  riddor_11_2_status?: string | null;
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

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const APPLIANCE_HEADERS = [
  "#", "Location", "Type", "Make", "Model", "Flue\nType", "L/L\nApp", "Insp.",
  "Press.\n(mbar)", "Heat\n(kW/h)", "H CO\n(ppm)", "H CO₂\n(%)", "H CO\nRatio",
  "L CO\n(ppm)", "L CO₂\n(%)", "L CO\nRatio", "Safety\nDev.", "Vent.\nProv.",
  "Visual\nCond.", "Flue\nPerf.", "Srv'd", "Safe",
];

function applianceRow(a: CertificateData["appliances"] extends (infer U)[] | undefined ? U : never, index: number) {
  return [
    String(index + 1),
    a.location || "-", a.appliance_type || "-", a.make || "-", a.model || "-",
    a.flue_type || "-", tick(a.landlord_appliance), tick(a.appliance_inspected),
    a.operating_pressure_mbar?.toString() || "-", a.heat_input_kw?.toString() || "-",
    a.high_co_ppm?.toString() || "-", a.high_co2_percent?.toString() || "-", a.high_co_ratio?.toString() || "-",
    a.low_co_ppm?.toString() || "-", a.low_co2_percent?.toString() || "-", a.low_co_ratio?.toString() || "-",
    tick(a.safety_devices_correct), tick(a.ventilation_satisfactory),
    tick(a.visual_condition_satisfactory), a.flue_performance_test || "-",
    tick(a.appliance_serviced), tick(a.appliance_safe_to_use),
  ];
}

const LANDSCAPE_APPLIANCE_COL_STYLES: Record<number, any> = {
  0: { cellWidth: 7 }, 1: { cellWidth: 18, halign: "left" }, 2: { cellWidth: 16, halign: "left" },
  3: { cellWidth: 14, halign: "left" }, 4: { cellWidth: 14, halign: "left" },
  5: { cellWidth: 11 }, 6: { cellWidth: 9 }, 7: { cellWidth: 9 },
  8: { cellWidth: 12 }, 9: { cellWidth: 12 }, 10: { cellWidth: 11 }, 11: { cellWidth: 11 },
  12: { cellWidth: 11 }, 13: { cellWidth: 11 }, 14: { cellWidth: 11 }, 15: { cellWidth: 11 },
  16: { cellWidth: 10 }, 17: { cellWidth: 10 }, 18: { cellWidth: 10 }, 19: { cellWidth: 10 },
  20: { cellWidth: 10 }, 21: { cellWidth: 10 },
};

function addPageFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNum: number, totalPages: number) {
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text("Generated by FTrack Gas Compliance", pageWidth / 2, pageHeight - 6, { align: "center" });
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function addContinuationHeader(doc: jsPDF, title: string, certNumber: string, jobAddress: string, sectionLabel: string, pageWidth: number, marginL: number, navy: [number, number, number]): number {
  let y = 12;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(title, pageWidth / 2, y, { align: "center" });

  doc.setFontSize(8);
  doc.text(`Cert. No. ${certNumber}`, pageWidth - 14, y, { align: "right" });

  y += 6;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Property: ${jobAddress}`, marginL, y);
  
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`Continuation Page — ${sectionLabel}`, marginL, y);
  doc.setTextColor(0, 0, 0);
  
  return y + 4;
}

export function generateGasCertificatePDF(data: CertificateData): jsPDF {
  const title = TYPE_TITLES[data.certificate_type] || "Gas Certificate";

  if (data.certificate_type === "nd_gas_safety") {
    const doc = new jsPDF({ orientation: "landscape" });
    return generateNDGasSafetyPDF(doc, data, title);
  }

  if (data.certificate_type === "landlord_gas_safety" || data.certificate_type === "homeowner_gas_safety") {
    const doc = new jsPDF({ orientation: "landscape" });
    return generateLandlordGasSafetyPDF(doc, data, title);
  }

  if (data.certificate_type === "gas_warning_notice") {
    const doc = new jsPDF({ orientation: "landscape" });
    return generateWarningNoticePDF(doc, data, title);
  }

  // ---- Original layout for other types (portrait) ----
  const doc = new jsPDF();
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

  y += 10;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.text("Issued By:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.issued_by_name || "-", 50, y);

  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text("Generated by FTrack Gas Compliance", 105, 290, { align: "center" });

  return doc;
}

// ---- Non-Domestic Gas Safety Record — Landscape with pagination ----
function generateNDGasSafetyPDF(doc: jsPDF, data: CertificateData, title: string): jsPDF {
  const navy: [number, number, number] = [26, 54, 93];
  const pageWidth = 297;
  const pageHeight = 210;
  const marginL = 14;
  const marginR = 14;
  const contentWidth = pageWidth - marginL - marginR;
  const colWidth = (contentWidth - 6) / 3;

  const allAppliances = data.appliances || [];
  const allDefects = Array.isArray(data.defects) ? data.defects : [];
  const applianceChunks = chunk(allAppliances, 6);
  const defectChunks = chunk(allDefects, 6);
  const hasApplianceOverflow = applianceChunks.length > 1;
  const hasDefectOverflow = defectChunks.length > 1;

  // Calculate total pages
  let totalPages = 1;
  if (hasApplianceOverflow) totalPages += applianceChunks.length - 1;
  if (hasDefectOverflow) totalPages += defectChunks.length - 1;

  const jobAddressSummary = [data.job_address_name, data.job_address, data.job_postcode].filter(Boolean).join(", ");

  // ── PAGE 1 ──
  let y = 12;

  // Header
  const logoW = 28;
  const logoH = 16;
  if (data.company_logo_base64) {
    try {
      doc.addImage(data.company_logo_base64, "PNG", marginL, y - 2, logoW, logoH);
    } catch { /* skip */ }
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(title, pageWidth / 2, y + 5, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Cert. No. ${data.certificate_number}`, pageWidth - marginR, y + 5, { align: "right" });

  y += logoH + 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const subtitle = "Safety inspection and reporting carried out in accordance with the Gas Safety (Installation and Use) Regulations 1998 as amended.";
  doc.text(subtitle, pageWidth / 2, y, { align: "center", maxWidth: contentWidth });
  y += 6;

  doc.setTextColor(0, 0, 0);

  // Three info sections side-by-side
  const infoStartY = y;
  const col1X = marginL;
  const col2X = marginL + colWidth + 3;
  const col3X = marginL + (colWidth + 3) * 2;

  autoTable(doc, {
    startY: infoStartY, theme: "grid",
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

  autoTable(doc, {
    startY: infoStartY, theme: "grid",
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

  autoTable(doc, {
    startY: infoStartY, theme: "grid",
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

  // Appliance table (first 6)
  const firstAppliances = applianceChunks[0] || [];
  if (firstAppliances.length > 0) {
    autoTable(doc, {
      startY: y, theme: "grid",
      headStyles: { fillColor: navy, fontSize: 6, halign: "center", fontStyle: "bold", cellPadding: 1.5 },
      head: [APPLIANCE_HEADERS],
      body: firstAppliances.map((a, i) => applianceRow(a, i)),
      styles: { fontSize: 6, cellPadding: 1.5, halign: "center" },
      columnStyles: LANDSCAPE_APPLIANCE_COL_STYLES,
      margin: { left: marginL, right: marginR },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // Defects (first 6)
  const firstDefects = defectChunks[0] || [];
  const defectBody: string[][] = firstDefects.length > 0
    ? firstDefects.map((d: any, i: number) => [String(i + 1), d?.description || "-", d ? yn(d.warning_labels_issued) : "-"])
    : [["—", "No defects recorded", "—"]];
  autoTable(doc, {
    startY: y, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 8, fontStyle: "bold", halign: "left" },
    head: [["#", "Defect Description", "Labels & Warning Notice Issued"]],
    body: defectBody,
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 60, halign: "center" } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // Gas Installation Safety Checks
  autoTable(doc, {
    startY: y, theme: "grid",
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

  // Next Inspection Due
  if (data.next_inspection_due) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`Next Inspection Due: ${data.next_inspection_due}`, marginL, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  // Comments
  if (data.comments) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Comments:", marginL, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.comments, contentWidth);
    doc.text(lines, marginL, y + 5);
    y += 5 + lines.length * 4;
  }

  // Signatures
  y += 4;
  autoTable(doc, {
    startY: y, theme: "grid",
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

  addPageFooter(doc, pageWidth, pageHeight, 1, totalPages);

  // ── CONTINUATION PAGES — Appliances ──
  for (let c = 1; c < applianceChunks.length; c++) {
    doc.addPage("a4", "landscape");
    const pageNum = 1 + c;
    let cy = addContinuationHeader(doc, title, data.certificate_number, jobAddressSummary, "Appliances", pageWidth, marginL, navy);

    autoTable(doc, {
      startY: cy, theme: "grid",
      headStyles: { fillColor: navy, fontSize: 6, halign: "center", fontStyle: "bold", cellPadding: 1.5 },
      head: [APPLIANCE_HEADERS],
      body: applianceChunks[c].map((a, i) => applianceRow(a, c * 6 + i)),
      styles: { fontSize: 6, cellPadding: 1.5, halign: "center" },
      columnStyles: LANDSCAPE_APPLIANCE_COL_STYLES,
      margin: { left: marginL, right: marginR },
    });

    addPageFooter(doc, pageWidth, pageHeight, pageNum, totalPages);
  }

  // ── CONTINUATION PAGES — Defects ──
  for (let c = 1; c < defectChunks.length; c++) {
    doc.addPage("a4", "landscape");
    const pageNum = 1 + (hasApplianceOverflow ? applianceChunks.length - 1 : 0) + c;
    let cy = addContinuationHeader(doc, title, data.certificate_number, jobAddressSummary, "Defects", pageWidth, marginL, navy);

    autoTable(doc, {
      startY: cy, theme: "grid",
      headStyles: { fillColor: navy, fontSize: 8, fontStyle: "bold", halign: "left" },
      head: [["#", "Defect Description", "Labels & Warning Notice Issued"]],
      body: defectChunks[c].map((d: any, i: number) => [String(c * 6 + i + 1), d?.description || "-", d ? yn(d.warning_labels_issued) : "-"]),
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 60, halign: "center" } },
      margin: { left: marginL, right: marginR },
    });

    addPageFooter(doc, pageWidth, pageHeight, pageNum, totalPages);
  }

  return doc;
}

// ---- Landlord / Homeowner Gas Safety Record — Landscape A4 with pagination ----
function generateLandlordGasSafetyPDF(doc: jsPDF, data: CertificateData, title: string): jsPDF {
  const navy: [number, number, number] = [26, 54, 93];
  const pageWidth = 297;
  const pageHeight = 210;
  const marginL = 14;
  const marginR = 14;
  const contentWidth = pageWidth - marginL - marginR;
  const colWidth = (contentWidth - 6) / 3;

  const allAppliances = data.appliances || [];
  const allDefects = Array.isArray(data.defects) ? data.defects : [];
  const applianceChunks = chunk(allAppliances, 6);
  const defectChunks = chunk(allDefects, 6);
  const hasApplianceOverflow = applianceChunks.length > 1;

  let totalPages = 1;
  if (hasApplianceOverflow) totalPages += applianceChunks.length - 1;
  if (defectChunks.length > 1) totalPages += defectChunks.length - 1;

  const jobAddressSummary = [data.job_address_name, data.job_address, data.job_postcode].filter(Boolean).join(", ");

  // ── PAGE 1 ──
  let y = 12;

  // Header with logo
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

  // Regulatory subtitle
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const subtitle = "Safety Inspection and reporting carried out in accordance with the Gas Safety (Installation and Use) Regulations 1998 section 26(9) and the Gas Industry Unsafe Situations Procedure.";
  doc.text(subtitle, pageWidth / 2, y, { align: "center", maxWidth: contentWidth });
  y += 6;

  doc.setTextColor(0, 0, 0);

  // Dates row
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Inspection Date: ${data.inspection_date}`, marginL, y);
  doc.text(`Next Inspection Due Before: ${data.next_inspection_due || "-"}`, pageWidth - marginR, y, { align: "right" });
  y += 5;

  // Three info sections side-by-side
  const infoStartY = y;
  const col1X = marginL;
  const col2X = marginL + colWidth + 3;
  const col3X = marginL + (colWidth + 3) * 2;

  autoTable(doc, {
    startY: infoStartY, theme: "grid",
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
    startY: infoStartY, theme: "grid",
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
    startY: infoStartY, theme: "grid",
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

  // Appliance table (first 6)
  const firstAppliances = applianceChunks[0] || [];
  if (firstAppliances.length > 0) {
    autoTable(doc, {
      startY: y, theme: "grid",
      headStyles: { fillColor: navy, fontSize: 5, halign: "center", fontStyle: "bold", cellPadding: 1 },
      head: [APPLIANCE_HEADERS],
      body: firstAppliances.map((a, i) => applianceRow(a, i)),
      styles: { fontSize: 5, cellPadding: 1, halign: "center" },
      columnStyles: {
        0: { cellWidth: 7 }, 1: { cellWidth: 18, halign: "left" }, 2: { cellWidth: 14, halign: "left" },
        3: { cellWidth: 13, halign: "left" }, 4: { cellWidth: 13, halign: "left" },
        5: { cellWidth: 10 }, 6: { cellWidth: 8 }, 7: { cellWidth: 8 },
        8: { cellWidth: 11 }, 9: { cellWidth: 11 }, 10: { cellWidth: 10 }, 11: { cellWidth: 10 },
        12: { cellWidth: 10 }, 13: { cellWidth: 10 }, 14: { cellWidth: 10 }, 15: { cellWidth: 10 },
        16: { cellWidth: 9 }, 17: { cellWidth: 9 }, 18: { cellWidth: 9 }, 19: { cellWidth: 9 },
        20: { cellWidth: 8 }, 21: { cellWidth: 8 },
      },
      margin: { left: marginL, right: marginR },
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  }

  // Defects (first 6)
  const firstDefects = defectChunks[0] || [];
  const defectRows: string[][] = firstDefects.length > 0
    ? firstDefects.map((d: any, i: number) => [String(i + 1), d?.description || "-", d ? yn(d.warning_labels_issued) : "-"])
    : [["—", "No defects recorded", "—"]];
  autoTable(doc, {
    startY: y, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
    head: [["#", "Defect Description", "Labels & Warning Notice Issued"]],
    body: defectRows,
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 8, halign: "center" }, 2: { cellWidth: 45, halign: "center" } },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // CO Alarms + Gas Installation Safety Checks side by side
  const checksStartY = y;
  const halfW = (contentWidth - 4) / 2;

  autoTable(doc, {
    startY: checksStartY, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["CO Alarms", ""]],
    body: [
      ["CO Alarm(s) Fitted", yn(data.co_alarm_fitted)],
      ["CO Alarm(s) Tested & Satisfactory", yn(data.co_alarm_satisfactory)],
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 1: { halign: "center" } },
    margin: { left: marginL, right: pageWidth - marginL - halfW },
  });
  const checksLeftY = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: checksStartY, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Gas Installation Safety Checks", ""]],
    body: [
      ["Emergency Control Accessible", yn(data.emergency_control_accessible)],
      ["Gas Tightness Satisfactory", yn(data.gas_tightness_satisfactory)],
      ["Pipework Visual Inspection Satisfactory", yn(data.pipework_visual_satisfactory)],
      ["Equipotential Bonding", yn(data.equipotential_bonding)],
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 75 }, 1: { halign: "center" } },
    margin: { left: marginL + halfW + 4, right: marginR },
  });
  const checksRightY = (doc as any).lastAutoTable.finalY;

  y = Math.max(checksLeftY, checksRightY) + 2;

  // Comments
  if (data.comments) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Comments:", marginL, y + 3);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.comments, contentWidth);
    doc.text(lines, marginL, y + 7);
    y += 7 + lines.length * 3;
  }

  // Signatures
  y += 2;
  autoTable(doc, {
    startY: y, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Signatures", ""]],
    body: [
      ["Engineer — Signed", ""],
      ["Engineer — Print Name", data.issued_by_name || "-"],
      ["Customer / Recipient — Signed", ""],
      ["Customer / Recipient — Print Name", data.received_by_name || "-"],
      ["Date", data.inspection_date],
    ],
    styles: { fontSize: 6, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    margin: { left: marginL, right: marginR },
  });

  addPageFooter(doc, pageWidth, pageHeight, 1, totalPages);

  // ── CONTINUATION PAGES — Appliances ──
  for (let c = 1; c < applianceChunks.length; c++) {
    doc.addPage("a4", "landscape");
    const pageNum = 1 + c;
    let cy = addContinuationHeader(doc, title, data.certificate_number, jobAddressSummary, "Appliances", pageWidth, marginL, navy);

    autoTable(doc, {
      startY: cy, theme: "grid",
      headStyles: { fillColor: navy, fontSize: 5, halign: "center", fontStyle: "bold", cellPadding: 1 },
      head: [APPLIANCE_HEADERS],
      body: applianceChunks[c].map((a, i) => applianceRow(a, c * 6 + i)),
      styles: { fontSize: 5, cellPadding: 1, halign: "center" },
      columnStyles: {
        0: { cellWidth: 7 }, 1: { cellWidth: 18, halign: "left" }, 2: { cellWidth: 14, halign: "left" },
        3: { cellWidth: 13, halign: "left" }, 4: { cellWidth: 13, halign: "left" },
        5: { cellWidth: 10 }, 6: { cellWidth: 8 }, 7: { cellWidth: 8 },
        8: { cellWidth: 11 }, 9: { cellWidth: 11 }, 10: { cellWidth: 10 }, 11: { cellWidth: 10 },
        12: { cellWidth: 10 }, 13: { cellWidth: 10 }, 14: { cellWidth: 10 }, 15: { cellWidth: 10 },
        16: { cellWidth: 9 }, 17: { cellWidth: 9 }, 18: { cellWidth: 9 }, 19: { cellWidth: 9 },
        20: { cellWidth: 8 }, 21: { cellWidth: 8 },
      },
      margin: { left: marginL, right: marginR },
    });

    addPageFooter(doc, pageWidth, pageHeight, pageNum, totalPages);
  }

  // ── CONTINUATION PAGES — Defects ──
  for (let c = 1; c < defectChunks.length; c++) {
    doc.addPage("a4", "landscape");
    const pageNum = 1 + (hasApplianceOverflow ? applianceChunks.length - 1 : 0) + c;
    let cy = addContinuationHeader(doc, title, data.certificate_number, jobAddressSummary, "Defects", pageWidth, marginL, navy);

    autoTable(doc, {
      startY: cy, theme: "grid",
      headStyles: { fillColor: navy, fontSize: 7, fontStyle: "bold", halign: "left" },
      head: [["#", "Defect Description", "Labels & Warning Notice Issued"]],
      body: defectChunks[c].map((d: any, i: number) => [String(c * 6 + i + 1), d?.description || "-", d ? yn(d.warning_labels_issued) : "-"]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: { 0: { cellWidth: 8, halign: "center" }, 2: { cellWidth: 45, halign: "center" } },
      margin: { left: marginL, right: marginR },
    });

    addPageFooter(doc, pageWidth, pageHeight, pageNum, totalPages);
  }

  return doc;
}

// ---- Gas Warning Notice — Landscape A4 ----
function generateWarningNoticePDF(doc: jsPDF, data: CertificateData, title: string): jsPDF {
  const navy: [number, number, number] = [26, 54, 93];
  const red: [number, number, number] = [192, 57, 43];
  const pageWidth = 297;
  const pageHeight = 210;
  const marginL = 14;
  const marginR = 14;
  const contentWidth = pageWidth - marginL - marginR;
  const colWidth = (contentWidth - 6) / 3;

  let y = 12;

  // Header
  if (data.company_logo_base64) {
    try { doc.addImage(data.company_logo_base64, "PNG", marginL, y - 2, 24, 14); } catch {}
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(title, pageWidth / 2, y + 5, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Cert. No. ${data.certificate_number}`, pageWidth - marginR, y + 5, { align: "right" });

  y += 16;

  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("This form should be completed in accordance with the requirements of the current Gas Industry Unsafe Situations Procedure.", pageWidth / 2, y, { align: "center", maxWidth: contentWidth });
  y += 5;
  doc.setTextColor(0, 0, 0);

  // Three column info
  const infoY = y;
  const col1X = marginL;
  const col2X = marginL + colWidth + 3;
  const col3X = marginL + (colWidth + 3) * 2;

  autoTable(doc, {
    startY: infoY, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Company / Installer", ""]],
    body: [
      ["Engineer", data.issued_by_name || "-"],
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
    startY: infoY, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Job Address", ""]],
    body: [
      ["Name", data.job_address_name || "-"],
      ["Address", data.job_address || "-"],
      ["Post Code", data.job_postcode || "-"],
      ["Telephone", data.job_phone || "-"],
      ["Date", data.inspection_date],
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 20 } },
    margin: { left: col2X, right: pageWidth - col2X - colWidth },
  });
  const c2Y = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: infoY, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Client / Landlord", ""]],
    body: [
      ["Name", data.customer_name || "-"],
      ["Company", data.customer_company || "-"],
      ["Address", data.customer_address || "-"],
      ["Post Code", data.customer_postcode || "-"],
      ["Telephone", data.customer_phone || "-"],
      ["Mobile", data.customer_mobile || "-"],
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 20 } },
    margin: { left: col3X, right: pageWidth - col3X - colWidth },
  });
  const c3Y = (doc as any).lastAutoTable.finalY;

  y = Math.max(c1Y, c2Y, c3Y) + 3;

  // Appliance details + Issue types side by side
  const halfW = (contentWidth - 4) / 2;

  autoTable(doc, {
    startY: y, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Gas Appliance / Installation Details", ""]],
    body: [
      ["Location", data.warning_location || "-"],
      ["Make", data.warning_make || "-"],
      ["Type", data.warning_type || "-"],
      ["Model", data.warning_model || "-"],
      ["Serial No.", data.warning_serial_no || "-"],
      ["Classification", classificationLabel(data.classification)],
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 25 } },
    margin: { left: marginL, right: pageWidth - marginL - halfW },
  });
  const appY = (doc as any).lastAutoTable.finalY;

  const ynStatus = (v?: string | null) => v === "yes" ? "Yes" : v === "no" ? "No" : "N/A";
  autoTable(doc, {
    startY: y, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Issue Type", "Status"]],
    body: [
      ["Gas Escape", ynStatus(data.issue_gas_escape)],
      ["Pipework", ynStatus(data.issue_pipework)],
      ["Ventilation", ynStatus(data.issue_ventilation)],
      ["Meter", ynStatus(data.issue_meter)],
      ["Chimney / Flue", ynStatus(data.issue_chimney_flue)],
      ["Other", ynStatus(data.issue_other)],
      ...(data.issue_other === "yes" && data.issue_other_description ? [["Other Detail", data.issue_other_description]] : []),
    ],
    styles: { fontSize: 6, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 }, 1: { halign: "center" as const } },
    margin: { left: marginL + halfW + 4, right: marginR },
  });
  const issueY = (doc as any).lastAutoTable.finalY;

  y = Math.max(appY, issueY) + 2;

  // ID Warning banner
  if (data.classification === "immediately_dangerous") {
    doc.setFillColor(255, 230, 230);
    doc.rect(marginL, y, contentWidth, 10, "F");
    doc.setDrawColor(red[0], red[1], red[2]);
    doc.rect(marginL, y, contentWidth, 10, "S");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(red[0], red[1], red[2]);
    doc.text("⚠ IMMEDIATELY DANGEROUS – The appliance(s) / installation has been classified as IMMEDIATELY DANGEROUS, disconnected from the gas supply and a 'DANGER DO NOT USE' label attached.", marginL + 3, y + 5, { maxWidth: contentWidth - 6 });
    doc.setTextColor(0, 0, 0);
    y += 13;
  }

  // Faults, Actions Taken, Actions Required - three columns
  const thirdW = (contentWidth - 8) / 3;
  const faultSections = [
    { title: "Details of Faults", text: data.fault_details },
    { title: "Actions Taken", text: data.actions_taken },
    { title: "Actions Required", text: data.actions_required },
  ];

  faultSections.forEach((sec, i) => {
    autoTable(doc, {
      startY: y, theme: "grid",
      headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
      head: [[sec.title]],
      body: [[sec.text || "-"]],
      styles: { fontSize: 6, cellPadding: 2, minCellHeight: 18 },
      margin: { left: marginL + i * (thirdW + 4), right: pageWidth - marginL - (i + 1) * thirdW - i * 4 },
    });
  });

  // Get max Y from the three tables
  y = (doc as any).lastAutoTable.finalY + 2;

  // RIDDOR + Comments side by side
  autoTable(doc, {
    startY: y, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["RIDDOR Reporting", ""]],
    body: [
      ["RIDDOR Reg 11(1) – Gas Incident", ynStatus(data.riddor_11_1_status)],
      ["RIDDOR Reg 11(2) – Dangerous Gas Fitting", ynStatus(data.riddor_11_2_status)],
    ],
    styles: { fontSize: 6, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 1: { halign: "center" as const } },
    margin: { left: marginL, right: pageWidth - marginL - halfW },
  });
  const riddorY = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: y, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Engineer Comments"]],
    body: [[data.comments || "-"]],
    styles: { fontSize: 6, cellPadding: 2, minCellHeight: 10 },
    margin: { left: marginL + halfW + 4, right: marginR },
  });
  const commentsY = (doc as any).lastAutoTable.finalY;

  y = Math.max(riddorY, commentsY) + 2;

  // Legal declaration
  doc.setFontSize(5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("I confirm that I have received this Warning / Advice Notice concerning the safety of the gas installation and understand that use of an IMMEDIATELY DANGEROUS or AT RISK installation may present a hazard and could breach Gas Safety regulations.", marginL, y + 3, { maxWidth: contentWidth });
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Signatures
  autoTable(doc, {
    startY: y, theme: "grid",
    headStyles: { fillColor: navy, fontSize: 6, fontStyle: "bold", halign: "left" },
    head: [["Issued By (Engineer)", "", "Received By (Client)", ""]],
    body: [
      ["Signature", "", "Signature", ""],
      ["Print Name", data.issued_by_name || "-", "Print Name", data.received_by_name || "-"],
      ["Date", data.inspection_date, "Date", data.inspection_date],
    ],
    styles: { fontSize: 6, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 25 }, 2: { fontStyle: "bold", cellWidth: 25 } },
    margin: { left: marginL, right: marginR },
  });

  // Emergency contacts footer
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("Gas Safe Register: 0800 408 5500  |  Gas Emergency Services: 0800 111 999", pageWidth / 2, pageHeight - 10, { align: "center" });

  addPageFooter(doc, pageWidth, pageHeight, 1, 1);

  return doc;
}

function classificationLabel(c?: string | null): string {
  const labels: Record<string, string> = {
    immediately_dangerous: "ID – Immediately Dangerous",
    at_risk: "AR – At Risk",
    not_to_current_standards: "NCS – Not to Current Standards",
  };
  return labels[c || ""] || "-";
}
