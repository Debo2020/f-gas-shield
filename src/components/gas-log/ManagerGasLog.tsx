import { useState, useEffect, useMemo } from "react";
import { format, startOfYear, endOfYear } from "date-fns";
import { ArrowUpCircle, ArrowDownCircle, Recycle, Download, CloudCog, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { GasMovementDialog } from "./GasMovementDialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type RefrigerantMovement = Database["public"]["Tables"]["refrigerant_movements"]["Row"];
type MovementType = Database["public"]["Enums"]["movement_type"];

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

interface ManagerGasLogProps {
  yearFilter: string;
}

interface EngineerSummary {
  engineer_id: string;
  engineer_name: string;
  booked_out: number;
  booked_in: number;
  recovered: number;
  net_balance: number;
}

export function ManagerGasLog({ yearFilter }: ManagerGasLogProps) {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<RefrigerantMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [engineerFilter, setEngineerFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultMovementType, setDefaultMovementType] = useState<MovementType>("book_out");

  const fetchMovements = async () => {
    if (!profile?.company_id) return;

    setIsLoading(true);
    try {
      const year = parseInt(yearFilter);
      const startDate = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
      const endDate = format(endOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("refrigerant_movements")
        .select("*")
        .eq("company_id", profile.company_id)
        .gte("movement_date", startDate)
        .lte("movement_date", endDate)
        .order("movement_date", { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
      toast.error("Failed to load company gas movements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchMovements();
    }
  }, [profile?.company_id, yearFilter]);

  const engineers = useMemo(() => {
    const uniqueEngineers = new Map<string, string>();
    movements.forEach((m) => {
      uniqueEngineers.set(m.engineer_id, m.engineer_name);
    });
    return Array.from(uniqueEngineers.entries()).map(([id, name]) => ({ id, name }));
  }, [movements]);

  const filteredMovements = useMemo(() => {
    if (engineerFilter === "all") return movements;
    return movements.filter((m) => m.engineer_id === engineerFilter);
  }, [movements, engineerFilter]);

  const summary = useMemo(() => {
    let bookedOut = 0;
    let bookedIn = 0;
    let recovered = 0;
    let co2eImpact = 0;

    filteredMovements.forEach((m) => {
      const weight = Number(m.weight_kg);
      const gwp = GWP_VALUES[m.refrigerant_type] || 0;

      switch (m.movement_type) {
        case "book_out":
          bookedOut += weight;
          co2eImpact += (weight * gwp) / 1000;
          break;
        case "book_in":
          bookedIn += weight;
          co2eImpact -= (weight * gwp) / 1000;
          break;
        case "recovered":
          recovered += weight;
          break;
      }
    });

    return {
      bookedOut,
      bookedIn,
      recovered,
      netBalance: bookedOut - bookedIn,
      co2eImpact,
    };
  }, [filteredMovements]);

  const engineerSummaries = useMemo(() => {
    const summaries = new Map<string, EngineerSummary>();

    movements.forEach((m) => {
      const weight = Number(m.weight_kg);
      const existing = summaries.get(m.engineer_id) || {
        engineer_id: m.engineer_id,
        engineer_name: m.engineer_name,
        booked_out: 0,
        booked_in: 0,
        recovered: 0,
        net_balance: 0,
      };

      switch (m.movement_type) {
        case "book_out":
          existing.booked_out += weight;
          break;
        case "book_in":
          existing.booked_in += weight;
          break;
        case "recovered":
          existing.recovered += weight;
          break;
      }

      existing.net_balance = existing.booked_out - existing.booked_in - existing.recovered;
      summaries.set(m.engineer_id, existing);
    });

    return Array.from(summaries.values()).sort((a, b) => b.net_balance - a.net_balance);
  }, [movements]);

  const handleOpenDialog = (type: MovementType) => {
    setDefaultMovementType(type);
    setDialogOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Engineer", "Type", "Refrigerant", "Weight (kg)", "Cylinder Ref", "Source", "Notes"];
    const rows = filteredMovements.map((m) => [
      format(new Date(m.movement_date), "yyyy-MM-dd"),
      m.engineer_name,
      m.movement_type,
      m.refrigerant_type,
      m.weight_kg.toString(),
      m.cylinder_reference || "",
      m.source || "",
      m.notes || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `company-gas-log-${yearFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Company gas log exported");
  };

  const stats = [
    {
      title: "Total Booked Out",
      value: summary.bookedOut,
      icon: ArrowUpCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Total Returned",
      value: summary.bookedIn,
      icon: ArrowDownCircle,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Recovered",
      value: summary.recovered,
      icon: Recycle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "CO₂e Impact",
      value: summary.co2eImpact,
      icon: CloudCog,
      suffix: " t",
      color: summary.co2eImpact > 0 ? "text-amber-500" : "text-green-500",
      bgColor: summary.co2eImpact > 0 ? "bg-amber-500/10" : "bg-green-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Actions & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleOpenDialog("book_out")} variant="destructive" size="sm">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Book Out
          </Button>
          <Button onClick={() => handleOpenDialog("book_in")} size="sm">
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Book In
          </Button>
          <Button onClick={() => handleOpenDialog("recovered")} variant="secondary" size="sm">
            <Recycle className="h-4 w-4 mr-2" />
            Record Recovery
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={engineerFilter} onValueChange={setEngineerFilter}>
            <SelectTrigger className="w-[180px]">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Engineers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Engineers</SelectItem>
              {engineers.map((eng) => (
                <SelectItem key={eng.id} value={eng.id}>
                  {eng.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={filteredMovements.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="p-6 card-interactive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter 
                      value={stat.value} 
                      decimals={2} 
                      suffix={stat.suffix || " kg"} 
                    />
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Engineer Breakdown */}
      {engineerFilter === "all" && engineerSummaries.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Engineer Summary
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engineer</TableHead>
                  <TableHead className="text-right">Booked Out</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Recovered</TableHead>
                  <TableHead className="text-right">Net Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engineerSummaries.map((eng) => (
                  <TableRow key={eng.engineer_id}>
                    <TableCell className="font-medium">{eng.engineer_name}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      {eng.booked_out.toFixed(2)} kg
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary">
                      {eng.booked_in.toFixed(2)} kg
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-500">
                      {eng.recovered.toFixed(2)} kg
                    </TableCell>
                    <TableCell className={`text-right font-mono font-bold ${eng.net_balance > 0 ? "text-amber-500" : "text-green-500"}`}>
                      {eng.net_balance.toFixed(2)} kg
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Movements Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Engineer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Refrigerant</TableHead>
              <TableHead className="text-right">Weight (kg)</TableHead>
              <TableHead>Cylinder Ref</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No gas movements recorded for {yearFilter}
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{format(new Date(m.movement_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-medium">{m.engineer_name}</TableCell>
                  <TableCell>
                    <MovementTypeBadge type={m.movement_type} />
                  </TableCell>
                  <TableCell>{m.refrigerant_type}</TableCell>
                  <TableCell className="text-right font-mono">{Number(m.weight_kg).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{m.cylinder_reference || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {m.notes || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <GasMovementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchMovements}
        defaultMovementType={defaultMovementType}
      />
    </div>
  );
}
