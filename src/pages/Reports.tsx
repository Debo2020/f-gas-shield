import { useState } from "react";
import { format, startOfYear, endOfYear } from "date-fns";
import { FileText, Wrench, Droplets, ClipboardCheck } from "lucide-react";
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

export default function Reports() {
  const { profile } = useAuth();
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

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

  const generateEquipmentReport = async () => {
    if (!profile?.company_id) return;
    setLoadingReport("equipment");

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
        "Equipment Name", "Site", "Manufacturer", "Model", "Serial Number",
        "Asset Tag", "Refrigerant Type", "Charge (kg)", "CO2e (tonnes)",
        "Installation Date", "Location", "Status"
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

      downloadCSV(`equipment-register-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
      toast.success("Equipment register report downloaded");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(null);
    }
  };

  const generateLeakCheckReport = async () => {
    if (!profile?.company_id) return;
    setLoadingReport("leakcheck");

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
        "Date", "Equipment", "Site", "Refrigerant", "Result",
        "Leak Check Done", "Leak Detected", "Leak Location", "Leak Repaired",
        "Inspector", "Certificate No.", "Findings", "Recommendations"
      ];

      const rows = (data || []).map((insp: any) => [
        insp.inspection_date,
        insp.equipment?.name || "",
        insp.equipment?.site?.name || "",
        insp.equipment?.refrigerant_type || "",
        insp.result,
        insp.leak_check_performed ? "Yes" : "No",
        insp.leak_detected ? "Yes" : "No",
        insp.leak_location || "",
        insp.leak_repaired === true ? "Yes" : insp.leak_repaired === false ? "No" : "",
        insp.inspector_name,
        insp.inspector_certificate_number || "",
        insp.findings || "",
        insp.recommendations || "",
      ]);

      downloadCSV(`leak-check-records-${yearFilter}.csv`, headers, rows);
      toast.success("Leak check records report downloaded");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(null);
    }
  };

  const generateGasMovementReport = async () => {
    if (!profile?.company_id) return;
    setLoadingReport("gas");

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
        "Date", "Equipment", "Site", "Refrigerant Type",
        "Added (kg)", "Recovered (kg)", "Engineer"
      ];

      const rows = (data || []).map((insp: any) => [
        insp.inspection_date,
        insp.equipment?.name || "",
        insp.equipment?.site?.name || "",
        insp.equipment?.refrigerant_type || "",
        insp.refrigerant_added_kg?.toString() || "",
        insp.refrigerant_recovered_kg?.toString() || "",
        insp.inspector_name,
      ]);

      downloadCSV(`refrigerant-movements-${yearFilter}.csv`, headers, rows);
      toast.success("Refrigerant movement report downloaded");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(null);
    }
  };

  const generateComplianceReport = async () => {
    if (!profile?.company_id) return;
    setLoadingReport("compliance");

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
        "Equipment", "Site", "Refrigerant", "Charge (kg)", "CO2e (tonnes)",
        "Last Inspection", "Next Due", "Compliance Status"
      ];

      const rows = (equipment || []).map((eq: any) => {
        let status = "Compliant";
        if (!eq.next_inspection_due) {
          status = "Never Inspected";
        } else if (new Date(eq.next_inspection_due) < today) {
          status = "Overdue";
        } else if (new Date(eq.next_inspection_due) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          status = "Due Soon";
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

      downloadCSV(`compliance-summary-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
      toast.success("Compliance summary report downloaded");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(null);
    }
  };

  const reports = [
    {
      id: "equipment",
      title: "Equipment Register",
      description: "Complete inventory of all F-Gas equipment including refrigerant details and CO₂e values.",
      icon: Wrench,
      onGenerate: generateEquipmentReport,
    },
    {
      id: "leakcheck",
      title: "Leak Check Records",
      description: "All inspection records with leak check data, results, and repair information.",
      icon: ClipboardCheck,
      onGenerate: generateLeakCheckReport,
    },
    {
      id: "gas",
      title: "Refrigerant Movement Log",
      description: "Summary of all refrigerant additions and recoveries for the selected year.",
      icon: Droplets,
      onGenerate: generateGasMovementReport,
    },
    {
      id: "compliance",
      title: "Compliance Summary",
      description: "Overview of equipment compliance status including overdue and upcoming inspections.",
      icon: FileText,
      onGenerate: generateComplianceReport,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
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
              onGenerate={report.onGenerate}
              isLoading={loadingReport === report.id}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
