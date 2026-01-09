import { useState, useEffect, useMemo } from "react";
import { format, startOfYear, endOfYear } from "date-fns";
import { Download, Plus, Snowflake, Filter, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GasLogSummary } from "@/components/gas-log/GasLogSummary";
import { GasLogTable } from "@/components/gas-log/GasLogTable";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LiveClock } from "@/components/ui/live-clock";
import { StatusIndicator } from "@/components/ui/status-indicator";

// GWP values for CO2e calculation
const GWP_VALUES: Record<string, number> = {
  "R-32": 675,
  "R-134a": 1430,
  "R-404A": 3922,
  "R-407C": 1774,
  "R-410A": 2088,
  "R-422D": 2729,
  "R-448A": 1387,
  "R-449A": 1397,
  "R-452A": 2140,
  "R-454B": 466,
  "R-507A": 3985,
  "R-744": 1,
  "Other": 0,
};

interface GasMovement {
  id: string;
  inspection_date: string;
  equipment_name: string;
  site_name: string;
  refrigerant_type: string;
  refrigerant_added_kg: number | null;
  refrigerant_recovered_kg: number | null;
  inspector_name: string;
}

interface Site {
  id: string;
  name: string;
}

export default function GasLog() {
  const { profile, hasRole, hasActiveLicense } = useAuth();
  const isOwner = hasRole("owner");
  const canRecord = isOwner || hasActiveLicense;
  const navigate = useNavigate();
  const [movements, setMovements] = useState<GasMovement[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile?.company_id, yearFilter]);

  const fetchData = async () => {
    if (!profile?.company_id) return;

    setIsLoading(true);
    try {
      const year = parseInt(yearFilter);
      const startDate = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
      const endDate = format(endOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");

      const [inspectionsRes, sitesRes] = await Promise.all([
        supabase
          .from("inspections")
          .select(`
            id,
            inspection_date,
            refrigerant_added_kg,
            refrigerant_recovered_kg,
            inspector_name,
            equipment:equipment_id (
              name,
              refrigerant_type,
              site:site_id (
                name
              )
            )
          `)
          .eq("company_id", profile.company_id)
          .gte("inspection_date", startDate)
          .lte("inspection_date", endDate)
          .or("refrigerant_added_kg.gt.0,refrigerant_recovered_kg.gt.0")
          .order("inspection_date", { ascending: false }),
        supabase
          .from("sites")
          .select("id, name")
          .eq("company_id", profile.company_id)
          .order("name"),
      ]);

      if (inspectionsRes.error) throw inspectionsRes.error;
      if (sitesRes.error) throw sitesRes.error;

      const formattedMovements: GasMovement[] = (inspectionsRes.data || []).map((insp: any) => ({
        id: insp.id,
        inspection_date: insp.inspection_date,
        equipment_name: insp.equipment?.name || "Unknown",
        site_name: insp.equipment?.site?.name || "Unknown",
        refrigerant_type: insp.equipment?.refrigerant_type || "Unknown",
        refrigerant_added_kg: insp.refrigerant_added_kg,
        refrigerant_recovered_kg: insp.refrigerant_recovered_kg,
        inspector_name: insp.inspector_name,
      }));

      setMovements(formattedMovements);
      setSites(sitesRes.data || []);
    } catch (error) {
      console.error("Error fetching gas log data:", error);
      toast.error("Failed to load gas log data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMovements = useMemo(() => {
    if (siteFilter === "all") return movements;
    return movements.filter((m) => m.site_name === sites.find((s) => s.id === siteFilter)?.name);
  }, [movements, siteFilter, sites]);

  const summary = useMemo(() => {
    let totalAdded = 0;
    let totalRecovered = 0;
    let co2eImpact = 0;

    filteredMovements.forEach((m) => {
      const added = m.refrigerant_added_kg || 0;
      const recovered = m.refrigerant_recovered_kg || 0;
      const gwp = GWP_VALUES[m.refrigerant_type] || 0;

      totalAdded += added;
      totalRecovered += recovered;
      co2eImpact += ((added - recovered) * gwp) / 1000;
    });

    return {
      totalAdded,
      totalRecovered,
      netEmissions: totalAdded - totalRecovered,
      co2eImpact,
    };
  }, [filteredMovements]);

  const handleExportCSV = () => {
    const headers = ["Date", "Equipment", "Site", "Refrigerant", "Added (kg)", "Recovered (kg)", "Engineer"];
    const rows = filteredMovements.map((m) => [
      format(new Date(m.inspection_date), "yyyy-MM-dd"),
      m.equipment_name,
      m.site_name,
      m.refrigerant_type,
      m.refrigerant_added_kg?.toString() || "",
      m.refrigerant_recovered_kg?.toString() || "",
      m.inspector_name,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gas-log-${yearFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Gas log exported successfully");
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 header-gradient p-6 -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 mb-2 rounded-b-2xl">
          <div className="animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 animate-float">
                <Snowflake className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold gradient-text">F-Gas Log</h1>
                <p className="text-muted-foreground">
                  Track refrigerant usage and calculate CO₂ equivalent emissions
                </p>
              </div>
            </div>
            <StatusIndicator status="live" label="Live tracking" className="mt-3" />
          </div>
          <div className="flex flex-col items-end gap-3">
            <LiveClock showDate className="animate-slide-up" />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredMovements.length === 0}
                className="animate-scale-in"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={() => canRecord ? navigate("/inspections") : null} 
                disabled={!canRecord}
                title={!canRecord ? "License required" : undefined}
                className="animate-scale-in"
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Inspection
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <GasLogSummary {...summary} />
          </div>
        )}

        {/* Filters */}
        <Card className="p-4 animate-slide-up opacity-0 card-interactive" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
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
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Table */}
        <div className="animate-scale-in opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          {isLoading ? (
            <Card className="p-6">
              <Skeleton className="h-[400px] w-full" />
            </Card>
          ) : (
            <GasLogTable movements={filteredMovements} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
