import { useState, useEffect } from "react";
import { format, startOfYear, endOfYear } from "date-fns";
import { FileText, Wrench, Droplets, ClipboardCheck } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

const BRAND_COLORS = {
  navy: [30, 58, 95] as [number, number, number],
  slateGrey: [100, 116, 139] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
};

interface CompanyInfo {
  name: string;
  logo_url: string | null;
  address: string | null;
}

export function OrganisationReportsTab() {
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

    if (companyInfo?.logo_url) {
      const logoBase64 = await loadImageAsBase64(companyInfo.logo_url);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "PNG", 14, 10, 30, 30);
          logoLoaded = true;
        } catch {
          // Logo failed to load
        }
      }
    }

    const textStartX = logoLoaded ? 50 : 14;

    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, pageWidth, 8, "F");
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text(companyInfo?.name || "Company Report", textStartX, 18);
    
    doc.setFontSize(20);
    doc.text(title, textStartX, 28);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND_COLORS.slateGrey);
    doc.text(subtitle, textStartX, 36);
    
    doc.setFontSize(9);
    doc.text(`Generated: ${generatedAt}`, textStartX, 43);
    
    doc.setDrawColor(...BRAND_COLORS.navy);
    doc.setLineWidth(0.5);
    doc.line(14, headerHeight, pageWidth - 14, headerHeight);
    
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: headerHeight + 5,
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
          name, manufacturer, model, serial_number, asset_tag,
          refrigerant_type, refrigerant_charge_kg, co2_equivalent_tonnes,
          installation_date, location_description, is_active,
          site:site_id (name)
        `)
        .eq("company_id", profile.company_id)
        .order("name");

      if (error) throw error;

      const headers = [
        "Equipment", "Site", "Manufacturer", "Model", "Serial No.",
        "Asset Tag", "Refrigerant", "Charge (kg)", "CO2e (t)",
        "Install Date", "Location", "Status"
      ];

      const rows = (data || []).map((eq: any) => [
        eq.name, eq.site?.name || "", eq.manufacturer || "", eq.model || "",
        eq.serial_number || "", eq.asset_tag || "", eq.refrigerant_type,
        eq.refrigerant_charge_kg?.toString() || "", eq.co2_equivalent_tonnes?.toString() || "",
        eq.installation_date || "", eq.location_description || "",
        eq.is_active ? "Active" : "Inactive",
      ]);

      const dateStr = format(new Date(), "yyyy-MM-dd");
      if (type === "pdf") {
        await createBrandedPDF(
          "Equipment Register",
          `Complete F-Gas equipment inventory as of ${format(new Date(), "dd MMMM yyyy")}`,
          headers, rows,
          `equipment-register-${dateStr}.pdf`
        );
      } else {
        downloadCSV(`equipment-register-${dateStr}.csv`, headers, rows);
      }
      toast.success(`Equipment register ${type.toUpperCase()} downloaded`);
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
          inspection_date, result, leak_check_performed, leak_detected,
          leak_location, leak_repaired, inspector_name, inspector_certificate_number,
          equipment:equipment_id (name, refrigerant_type, site:site_id (name))
        `)
        .eq("company_id", profile.company_id)
        .gte("inspection_date", startDate)
        .lte("inspection_date", endDate)
        .order("inspection_date", { ascending: false });

      if (error) throw error;

      const headers = [
        "Date", "Equipment", "Site", "Refrigerant", "Result",
        "Leak Check", "Leak Found", "Location", "Repaired", "Inspector", "Cert No."
      ];

      const rows = (data || []).map((insp: any) => [
        insp.inspection_date, insp.equipment?.name || "", insp.equipment?.site?.name || "",
        insp.equipment?.refrigerant_type || "", insp.result,
        insp.leak_check_performed ? "Yes" : "No", insp.leak_detected ? "Yes" : "No",
        insp.leak_location || "-",
        insp.leak_repaired === true ? "Yes" : insp.leak_repaired === false ? "No" : "-",
        insp.inspector_name, insp.inspector_certificate_number || "-",
      ]);

      if (type === "pdf") {
        await createBrandedPDF(
          "Leak Check Records",
          `F-Gas inspection records for ${yearFilter}`,
          headers, rows,
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
          inspection_date, refrigerant_added_kg, refrigerant_recovered_kg, inspector_name,
          equipment:equipment_id (name, refrigerant_type, site:site_id (name))
        `)
        .eq("company_id", profile.company_id)
        .gte("inspection_date", startDate)
        .lte("inspection_date", endDate)
        .or("refrigerant_added_kg.gt.0,refrigerant_recovered_kg.gt.0")
        .order("inspection_date", { ascending: false });

      if (error) throw error;

      const headers = ["Date", "Equipment", "Site", "Refrigerant Type", "Added (kg)", "Recovered (kg)", "Engineer"];

      const rows = (data || []).map((insp: any) => [
        insp.inspection_date, insp.equipment?.name || "", insp.equipment?.site?.name || "",
        insp.equipment?.refrigerant_type || "",
        insp.refrigerant_added_kg?.toString() || "-",
        insp.refrigerant_recovered_kg?.toString() || "-",
        insp.inspector_name,
      ]);

      if (type === "pdf") {
        await createBrandedPDF(
          "Refrigerant Movement Log",
          `Annual refrigerant movements for ${yearFilter}`,
          headers, rows,
          `refrigerant-movements-${yearFilter}.pdf`
        );
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
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          name, refrigerant_type, refrigerant_charge_kg, co2_equivalent_tonnes,
          next_inspection_due, is_active, site:site_id (name)
        `)
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("next_inspection_due");

      if (error) throw error;

      const today = new Date();
      const headers = ["Equipment", "Site", "Refrigerant", "Charge (kg)", "CO2e (t)", "Next Due", "Status"];

      const rows = (data || []).map((eq: any) => {
        const dueDate = eq.next_inspection_due ? new Date(eq.next_inspection_due) : null;
        let status = "OK";
        if (!dueDate) {
          status = "No date set";
        } else if (dueDate < today) {
          status = "OVERDUE";
        } else if (dueDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          status = "Due Soon";
        }

        return [
          eq.name, eq.site?.name || "", eq.refrigerant_type,
          eq.refrigerant_charge_kg?.toString() || "",
          eq.co2_equivalent_tonnes?.toString() || "",
          eq.next_inspection_due || "-", status,
        ];
      });

      const dateStr = format(new Date(), "yyyy-MM-dd");
      if (type === "pdf") {
        await createBrandedPDF(
          "Compliance Summary",
          `Equipment inspection compliance status as of ${format(new Date(), "dd MMMM yyyy")}`,
          headers, rows,
          `compliance-summary-${dateStr}.pdf`
        );
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
      description: "Complete inventory of all F-Gas equipment with specifications and CO2e values",
      icon: Wrench,
      onGenerate: generateEquipmentReport,
    },
    {
      id: "leakcheck",
      title: "Leak Check Records",
      description: "Annual record of all leak checks performed on F-Gas equipment",
      icon: ClipboardCheck,
      onGenerate: generateLeakCheckReport,
      yearFilter: true,
    },
    {
      id: "gas",
      title: "Refrigerant Movement Log",
      description: "Record of all refrigerant additions and recoveries",
      icon: Droplets,
      onGenerate: generateGasMovementReport,
      yearFilter: true,
    },
    {
      id: "compliance",
      title: "Compliance Summary",
      description: "Overview of inspection compliance status for all equipment",
      icon: FileText,
      onGenerate: generateComplianceReport,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Compliance Reports
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate and download F-Gas compliance reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="year" className="text-sm">Year:</Label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            title={report.title}
            description={report.description}
            icon={report.icon}
            onDownloadPDF={() => report.onGenerate("pdf")}
            onDownloadCSV={() => report.onGenerate("csv")}
            isLoading={loadingReport === report.id}
            loadingType={loadingReport === report.id ? loadingType : null}
          />
        ))}
      </div>
    </div>
  );
}
