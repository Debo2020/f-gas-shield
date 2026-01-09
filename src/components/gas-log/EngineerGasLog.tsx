import { useState, useEffect, useMemo } from "react";
import { format, startOfYear, endOfYear } from "date-fns";
import { ArrowUpCircle, ArrowDownCircle, Recycle, Plus, Download, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

interface EngineerGasLogProps {
  yearFilter: string;
}

export function EngineerGasLog({ yearFilter }: EngineerGasLogProps) {
  const { user, profile } = useAuth();
  const [movements, setMovements] = useState<RefrigerantMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultMovementType, setDefaultMovementType] = useState<MovementType>("book_out");

  const fetchMovements = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const year = parseInt(yearFilter);
      const startDate = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
      const endDate = format(endOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("refrigerant_movements")
        .select("*")
        .eq("engineer_id", user.id)
        .gte("movement_date", startDate)
        .lte("movement_date", endDate)
        .order("movement_date", { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
      toast.error("Failed to load your gas movements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMovements();
    }
  }, [user, yearFilter]);

  const summary = useMemo(() => {
    let bookedOut = 0;
    let bookedIn = 0;
    let recovered = 0;

    movements.forEach((m) => {
      switch (m.movement_type) {
        case "book_out":
          bookedOut += Number(m.weight_kg);
          break;
        case "book_in":
          bookedIn += Number(m.weight_kg);
          break;
        case "recovered":
          recovered += Number(m.weight_kg);
          break;
      }
    });

    return {
      bookedOut,
      bookedIn,
      recovered,
      netBalance: bookedOut - bookedIn - recovered,
    };
  }, [movements]);

  const handleOpenDialog = (type: MovementType) => {
    setDefaultMovementType(type);
    setDialogOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Type", "Refrigerant", "Weight (kg)", "Cylinder Ref", "Source", "Notes"];
    const rows = movements.map((m) => [
      format(new Date(m.movement_date), "yyyy-MM-dd"),
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
    a.download = `my-gas-log-${yearFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Personal gas log exported");
  };

  const stats = [
    {
      title: "Booked Out",
      value: summary.bookedOut,
      icon: ArrowUpCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Returned",
      value: summary.bookedIn,
      icon: ArrowDownCircle,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Recovered",
      value: summary.recovered,
      icon: Recycle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Net Balance",
      value: summary.netBalance,
      icon: Scale,
      color: summary.netBalance > 0 ? "text-amber-500" : "text-green-500",
      bgColor: summary.netBalance > 0 ? "bg-amber-500/10" : "bg-green-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
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
        <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={movements.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
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
                    <AnimatedCounter value={stat.value} decimals={2} suffix=" kg" />
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

      {/* Movements Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
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
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No gas movements recorded for {yearFilter}
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{format(new Date(m.movement_date), "dd MMM yyyy")}</TableCell>
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
