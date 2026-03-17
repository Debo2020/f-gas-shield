import { useState, useEffect } from "react";
import { format, startOfYear, endOfYear } from "date-fns";
import { FileText, Wrench, Droplets, ClipboardCheck } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReportCard } from "@/components/reports/ReportCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Brand colors from design system
const BRAND_COLORS = {
  navy: [30, 58, 95] as [number, number, number],      // #1e3a5f
  slateGrey: [100, 116, 139] as [number, number, number], // #64748b
  green: [34, 197, 94] as [number, number, number],    // #22c55e
};

interface CompanyInfo {
  name: string;
  logo_url: string | null;
  address: string | null;
}

export default function Reports() {
  const { profile } = useAuth();
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<"pdf" | "csv" | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    if (profile?.company_id) {
      fetchCompanyInfo();
    }
  }, [profile?.company_id]);

  const fetchCompanyInfo = async () => {
    if (!profile?.company_id) return;
    
    const { data, error } = await supabase
      .from("companies")
      .select("name, logo_url, address")
      .eq("id", profile.company_id)
      .single();
    
    if (!error && data) {
      setCompanyInfo(data);
    }
  };

  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createBrandedPDF = async (
    title: string,
    subtitle: string,
    headers: string[],
    rows: string[][],
    filename: string
  ) => {
    const doc = new jsPDF({ orientation: "landscape" });
    const generatedAt = format(new Date(), "dd MMM yyyy 'at' HH:mm:ss 'UTC'");
    const pageWidth = doc.internal.pageSize.getWidth();
    
    let headerHeight = 45;
    let logoLoaded = false;

    // Try to load company logo
    if (companyInfo?.logo_url) {
      const logoBase64 = await loadImageAsBase64(companyInfo.logo_url);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "PNG", 14, 10, 30, 30);
          logoLoaded = true;
        } catch {
          // Logo failed to load, continue without it
        }
      }
    }

    const textStartX = logoLoaded ? 50 : 14;

    // Company name header with brand color
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, pageWidth, 8, "F");
    
    // Company name
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text(companyInfo?.name || "Company Report", textStartX, 18);
    
    // Report title
    doc.setFontSize(20);
    doc.text(title, textStartX, 28);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND_COLORS.slateGrey);
    doc.text(subtitle, textStartX, 36);
    
    // Generation timestamp for audit compliance
    doc.setFontSize(9);
    doc.text(`Generated: ${generatedAt}`, textStartX, 43);
    
    // Divider line
    doc.setDrawColor(...BRAND_COLORS.navy);
    doc.setLineWidth(0.5);
    doc.line(14, headerHeight, pageWidth - 14, headerHeight);
    
    // Table with branded header
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: headerHeight + 5,
      styles: { 
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: { 
        fillColor: BRAND_COLORS.navy,
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });
    
    // Footer with page numbers and branding
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer bar
      doc.setFillColor(...BRAND_COLORS.navy);
      doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, "F");
      
      doc.setFontSize(8);
      doc.setTextColor(255);
      doc.text(
        `Page ${i} of ${pageCount}`,
        14,
        doc.internal.pageSize.getHeight() - 6
      );
      doc.text(
        `${companyInfo?.name || "F-Gas"} Compliance Report | ${generatedAt}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" }
      );
    }
    
    doc.save(filename);
  };

  const generateEquipmentReport = async (type: "pdf" | "csv") => {
    if (!profile?.company_id) return;
    setLoadingReport("equipment");
    setLoadingType(type);

    try {
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          name,
          manufacturer,
          model,
          serial_number,
          asset_tag,
          refrigerant_type,
          refrigerant_charge_kg,
          co2_equivalent_tonnes,
          installation_date,
          location_description,
          is_active,
          site:site_id (name)
        `)
        .eq("company_id", profile.company_id)
        .order("name");

      if (error) throw error;

       const headers = [
         "System", "Site", "Manufacturer", "Model", "Serial No.",
        "Asset Tag", "Refrigerant", "Charge (kg)", "CO2e (t)",
        "Install Date", "Location", "Status"
      ];

      const rows = (data || []).map((eq: any) => [
        eq.name,
        eq.site?.name || "",
        eq.manufacturer || "",
        eq.model || "",
        eq.serial_number || "",
        eq.asset_tag || "",
        eq.refrigerant_type,
        eq.refrigerant_charge_kg?.toString() || "",
        eq.co2_equivalent_tonnes?.toString() || "",
        eq.installation_date || "",
        eq.location_description || "",
        eq.is_active ? "Active" : "Inactive",
      ]);

      const dateStr = format(new Date(), "yyyy-MM-dd");
      if (type === "pdf") {
         await createBrandedPDF(
           "F-Gas System Register",
           `Complete F-Gas system inventory as of ${format(new Date(), "dd MMMM yyyy")}`,
          headers,
          rows,
          `equipment-register-${dateStr}.pdf`
        );
      } else {
        downloadCSV(`equipment-register-${dateStr}.csv`, headers, rows);
      }
      toast.success(`F-Gas system register ${type.toUpperCase()} downloaded`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(null);
      setLoadingType(null);
    }
  };

  const generateLeakCheckReport = async (type: "pdf" | "csv") => {
    if (!profile?.company_id) return;
    setLoadingReport("leakcheck");
    setLoadingType(type);

    try {
      const year = parseInt(yearFilter);
      const startDate = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
      const endDate = format(endOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("inspections")
        .select(`
          inspection_date,
          result,
          leak_check_performed,
          leak_detected,
          leak_location,
          leak_repaired,
          inspector_name,
          inspector_certificate_number,
          findings,
          recommendations,
          equipment:equipment_id (
            name,
            refrigerant_type,
            site:site_id (name)
          )
        `)
        .eq("company_id", profile.company_id)
        .gte("inspection_date", startDate)
        .lte("inspection_date", endDate)
        .order("inspection_date", { ascending: false });

      if (error) throw error;

       const headers = [
         "Date", "System", "Site", "Refrigerant", "Result",
         "Leak Check", "Leak Found", "Location", "Repaired",
        "Inspector", "Cert No."
      ];

      const rows = (data || []).map((insp: any) => [
        insp.inspection_date,
        insp.equipment?.name || "",
        insp.equipment?.site?.name || "",
        insp.equipment?.refrigerant_type || "",
        insp.result,
        insp.leak_check_performed ? "Yes" : "No",
        insp.leak_detected ? "Yes" : "No",
        insp.leak_location || "-",
        insp.leak_repaired === true ? "Yes" : insp.leak_repaired === false ? "No" : "-",
        insp.inspector_name,
        insp.inspector_certificate_number || "-",
      ]);

      if (type === "pdf") {
        await createBrandedPDF(
          "Leak Check Records",
          `F-Gas inspection records for ${yearFilter}`,
          headers,
          rows,
          `leak-check-records-${yearFilter}.pdf`
        );
      } else {
        downloadCSV(`leak-check-records-${yearFilter}.csv`, headers, rows);
      }
      toast.success(`Leak check records ${type.toUpperCase()} downloaded`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(null);
      setLoadingType(null);
    }
  };

  const generateGasMovementReport = async (type: "pdf" | "csv") => {
    if (!profile?.company_id) return;
    setLoadingReport("gas");
    setLoadingType(type);

    try {
      const year = parseInt(yearFilter);
      const startDate = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
      const endDate = format(endOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("inspections")
        .select(`
          inspection_date,
          refrigerant_added_kg,
          refrigerant_recovered_kg,
          inspector_name,
          equipment:equipment_id (
            name,
            refrigerant_type,
            site:site_id (name)
          )
        `)
        .eq("company_id", profile.company_id)
        .gte("inspection_date", startDate)
        .lte("inspection_date", endDate)
        .or("refrigerant_added_kg.gt.0,refrigerant_recovered_kg.gt.0")
        .order("inspection_date", { ascending: false });

      if (error) throw error;

       const headers = [
         "Date", "System", "Site", "Refrigerant Type",
         "Added (kg)", "Recovered (kg)", "Engineer"
      ];

      const rows = (data || []).map((insp: any) => [
        insp.inspection_date,
        insp.equipment?.name || "",
        insp.equipment?.site?.name || "",
        insp.equipment?.refrigerant_type || "",
        insp.refrigerant_added_kg?.toString() || "-",
        insp.refrigerant_recovered_kg?.toString() || "-",
        insp.inspector_name,
      ]);

      // Calculate totals for PDF
      let totalAdded = 0;
      let totalRecovered = 0;
      (data || []).forEach((insp: any) => {
        totalAdded += insp.refrigerant_added_kg || 0;
        totalRecovered += insp.refrigerant_recovered_kg || 0;
      });

      if (type === "pdf") {
        const doc = new jsPDF({ orientation: "landscape" });
        const generatedAt = format(new Date(), "dd MMM yyyy 'at' HH:mm:ss 'UTC'");
        const pageWidth = doc.internal.pageSize.getWidth();
        
        let logoLoaded = false;
        if (companyInfo?.logo_url) {
          const logoBase64 = await loadImageAsBase64(companyInfo.logo_url);
          if (logoBase64) {
            try {
              doc.addImage(logoBase64, "PNG", 14, 10, 30, 30);
              logoLoaded = true;
            } catch {}
          }
        }

        const textStartX = logoLoaded ? 50 : 14;
        
        // Header bar
        doc.setFillColor(...BRAND_COLORS.navy);
        doc.rect(0, 0, pageWidth, 8, "F");
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text(companyInfo?.name || "Company Report", textStartX, 18);
        
        doc.setFontSize(20);
        doc.text("Refrigerant Movement Log", textStartX, 28);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND_COLORS.slateGrey);
        doc.text(`Annual refrigerant movements for ${yearFilter}`, textStartX, 36);
        doc.setFontSize(9);
        doc.text(`Generated: ${generatedAt}`, textStartX, 43);
        
        // Divider
        doc.setDrawColor(...BRAND_COLORS.navy);
        doc.setLineWidth(0.5);
        doc.line(14, 48, pageWidth - 14, 48);
        
        // Summary boxes with brand colors
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(14, 52, 70, 22, 2, 2, "F");
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_COLORS.slateGrey);
        doc.text("Total Added", 20, 60);
        doc.setFontSize(14);
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.text(`${totalAdded.toFixed(2)} kg`, 20, 70);
        
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(90, 52, 70, 22, 2, 2, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND_COLORS.slateGrey);
        doc.text("Total Recovered", 96, 60);
        doc.setFontSize(14);
        doc.setTextColor(...BRAND_COLORS.green);
        doc.setFont("helvetica", "bold");
        doc.text(`${totalRecovered.toFixed(2)} kg`, 96, 70);
        
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(166, 52, 70, 22, 2, 2, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND_COLORS.slateGrey);
        doc.text("Net Emissions", 172, 60);
        doc.setFontSize(14);
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.setFont("helvetica", "bold");
        doc.text(`${(totalAdded - totalRecovered).toFixed(2)} kg`, 172, 70);
        
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 80,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: BRAND_COLORS.navy, textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 },
        });
        
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFillColor(...BRAND_COLORS.navy);
          doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, "F");
          doc.setFontSize(8);
          doc.setTextColor(255);
          doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.getHeight() - 6);
          doc.text(
            `${companyInfo?.name || "F-Gas"} Compliance Report | ${generatedAt}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 6,
            { align: "center" }
          );
        }
        
        doc.save(`refrigerant-movements-${yearFilter}.pdf`);
      } else {
        downloadCSV(`refrigerant-movements-${yearFilter}.csv`, headers, rows);
      }
      toast.success(`Refrigerant movement ${type.toUpperCase()} downloaded`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(null);
      setLoadingType(null);
    }
  };

  const generateComplianceReport = async (type: "pdf" | "csv") => {
    if (!profile?.company_id) return;
    setLoadingReport("compliance");
    setLoadingType(type);

    try {
      const { data: equipment, error } = await supabase
        .from("equipment")
        .select(`
          name,
          refrigerant_type,
          refrigerant_charge_kg,
          co2_equivalent_tonnes,
          next_inspection_due,
          last_inspection_date,
          is_active,
          site:site_id (name)
        `)
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("next_inspection_due");

      if (error) throw error;

      const today = new Date();
       const headers = [
         "System", "Site", "Refrigerant", "Charge (kg)", "CO2e (t)",
        "Last Inspection", "Next Due", "Status"
      ];

      let overdueCount = 0;
      let dueSoonCount = 0;
      let compliantCount = 0;

      const rows = (equipment || []).map((eq: any) => {
        let status = "Compliant";
        if (!eq.next_inspection_due) {
          status = "Never Inspected";
          overdueCount++;
        } else if (new Date(eq.next_inspection_due) < today) {
          status = "Overdue";
          overdueCount++;
        } else if (new Date(eq.next_inspection_due) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          status = "Due Soon";
          dueSoonCount++;
        } else {
          compliantCount++;
        }

        return [
          eq.name,
          eq.site?.name || "",
          eq.refrigerant_type,
          eq.refrigerant_charge_kg?.toString() || "",
          eq.co2_equivalent_tonnes?.toString() || "",
          eq.last_inspection_date || "Never",
          eq.next_inspection_due || "N/A",
          status,
        ];
      });

      const dateStr = format(new Date(), "yyyy-MM-dd");
      if (type === "pdf") {
        const doc = new jsPDF({ orientation: "landscape" });
        const generatedAt = format(new Date(), "dd MMM yyyy 'at' HH:mm:ss 'UTC'");
        const pageWidth = doc.internal.pageSize.getWidth();
        
        let logoLoaded = false;
        if (companyInfo?.logo_url) {
          const logoBase64 = await loadImageAsBase64(companyInfo.logo_url);
          if (logoBase64) {
            try {
              doc.addImage(logoBase64, "PNG", 14, 10, 30, 30);
              logoLoaded = true;
            } catch {}
          }
        }

        const textStartX = logoLoaded ? 50 : 14;
        
        // Header bar
        doc.setFillColor(...BRAND_COLORS.navy);
        doc.rect(0, 0, pageWidth, 8, "F");
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text(companyInfo?.name || "Company Report", textStartX, 18);
        
        doc.setFontSize(20);
        doc.text("Compliance Summary", textStartX, 28);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND_COLORS.slateGrey);
        doc.text(`F-Gas system inspection compliance status as of ${format(today, "dd MMMM yyyy")}`, textStartX, 36);
        doc.setFontSize(9);
        doc.text(`Generated: ${generatedAt}`, textStartX, 43);
        
        // Divider
        doc.setDrawColor(...BRAND_COLORS.navy);
        doc.setLineWidth(0.5);
        doc.line(14, 48, pageWidth - 14, 48);
        
        // Status summary boxes
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(14, 52, 70, 22, 2, 2, "F");
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_COLORS.slateGrey);
        doc.text("Overdue", 20, 60);
        doc.setFontSize(18);
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.text(overdueCount.toString(), 20, 70);
        
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(90, 52, 70, 22, 2, 2, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND_COLORS.slateGrey);
        doc.text("Due Soon", 96, 60);
        doc.setFontSize(18);
        doc.setTextColor(161, 98, 7);
        doc.setFont("helvetica", "bold");
        doc.text(dueSoonCount.toString(), 96, 70);
        
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(166, 52, 70, 22, 2, 2, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND_COLORS.slateGrey);
        doc.text("Compliant", 172, 60);
        doc.setFontSize(18);
        doc.setTextColor(...BRAND_COLORS.green);
        doc.setFont("helvetica", "bold");
        doc.text(compliantCount.toString(), 172, 70);
        
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 80,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: BRAND_COLORS.navy, textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 },
          didParseCell: (data) => {
            if (data.column.index === 7 && data.section === "body") {
              const status = data.cell.raw as string;
              if (status === "Overdue" || status === "Never Inspected") {
                data.cell.styles.textColor = [185, 28, 28];
                data.cell.styles.fontStyle = "bold";
              } else if (status === "Due Soon") {
                data.cell.styles.textColor = [161, 98, 7];
              } else {
                data.cell.styles.textColor = BRAND_COLORS.green;
              }
            }
          },
        });
        
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFillColor(...BRAND_COLORS.navy);
          doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, "F");
          doc.setFontSize(8);
          doc.setTextColor(255);
          doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.getHeight() - 6);
          doc.text(
            `${companyInfo?.name || "F-Gas"} Compliance Report | ${generatedAt}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 6,
            { align: "center" }
          );
        }
        
        doc.save(`compliance-summary-${dateStr}.pdf`);
      } else {
        downloadCSV(`compliance-summary-${dateStr}.csv`, headers, rows);
      }
      toast.success(`Compliance summary ${type.toUpperCase()} downloaded`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(null);
      setLoadingType(null);
    }
  };

  const reports = [
    {
      id: "equipment",
      title: "Equipment Register",
      description: "Complete inventory of all F-Gas equipment including refrigerant details and CO₂e values.",
      icon: Wrench,
      onGeneratePDF: () => generateEquipmentReport("pdf"),
      onGenerateCSV: () => generateEquipmentReport("csv"),
    },
    {
      id: "leakcheck",
      title: "Leak Check Records",
      description: "All inspection records with leak check data, results, and repair information.",
      icon: ClipboardCheck,
      onGeneratePDF: () => generateLeakCheckReport("pdf"),
      onGenerateCSV: () => generateLeakCheckReport("csv"),
    },
    {
      id: "gas",
      title: "Refrigerant Movement Log",
      description: "Summary of all refrigerant additions and recoveries for the selected year.",
      icon: Droplets,
      onGeneratePDF: () => generateGasMovementReport("pdf"),
      onGenerateCSV: () => generateGasMovementReport("csv"),
    },
    {
      id: "compliance",
      title: "Compliance Summary",
      description: "Overview of equipment compliance status including overdue and upcoming inspections.",
      icon: FileText,
      onGeneratePDF: () => generateComplianceReport("pdf"),
      onGenerateCSV: () => generateComplianceReport("csv"),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download F-Gas compliance reports
          </p>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-4">
          <Label htmlFor="year-filter">Report Year</Label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger id="year-filter" className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Report Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              title={report.title}
              description={report.description}
              icon={report.icon}
              onGeneratePDF={report.onGeneratePDF}
              onGenerateCSV={report.onGenerateCSV}
              isLoading={loadingReport === report.id}
              loadingType={loadingType}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
