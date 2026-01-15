import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Recycle,
  Package,
  FileText,
  Trash2,
  Download,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Cylinder = Database["public"]["Tables"]["refrigerant_cylinders"]["Row"];
type Movement = Database["public"]["Tables"]["refrigerant_movements"]["Row"];

interface TimelineEvent {
  id: string;
  type: "created" | "book_out" | "book_in" | "recovered" | "disposed";
  date: string;
  title: string;
  description: string;
  weight?: number;
  engineer?: string;
  equipment?: string;
  jobReference?: string;
}

interface CylinderTimelineProps {
  cylinder: Cylinder;
}

export function CylinderTimeline({ cylinder }: CylinderTimelineProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, [cylinder.id]);

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("refrigerant_movements")
        .select("*")
        .eq("cylinder_id", cylinder.id)
        .order("movement_date", { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Build timeline events
  const events: TimelineEvent[] = [
    // Creation event
    {
      id: "created",
      type: "created" as const,
      date: cylinder.created_at,
      title: cylinder.is_recovery_cylinder ? "Recovery Cylinder Added" : "Cylinder Added to Inventory",
      description: `${Number(cylinder.initial_weight_kg).toFixed(2)} kg ${cylinder.refrigerant_type}${cylinder.supplier ? ` from ${cylinder.supplier}` : ""}`,
    },
    // Movement events
    ...movements.map((m): TimelineEvent => ({
      id: m.id,
      type: m.movement_type as TimelineEvent["type"],
      date: m.movement_date,
      title: m.movement_type === "book_out" 
        ? "Booked Out" 
        : m.movement_type === "book_in" 
        ? "Returned to Stock"
        : "Recovered",
      description: m.notes || "",
      weight: Number(m.weight_kg),
      engineer: m.engineer_name,
      jobReference: m.job_reference || undefined,
    })),
    // Disposal event if applicable
    ...(cylinder.status === "disposed" && cylinder.disposal_date ? [{
      id: "disposed",
      type: "disposed" as const,
      date: cylinder.disposal_date,
      title: "Cylinder Disposed",
      description: `Method: ${cylinder.disposal_method?.replace(/_/g, " ") || "Unknown"}. Ref: ${cylinder.disposal_reference || "N/A"}`,
    }] : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "created":
        return <Package className="h-4 w-4" />;
      case "book_out":
        return <ArrowUpCircle className="h-4 w-4" />;
      case "book_in":
        return <ArrowDownCircle className="h-4 w-4" />;
      case "recovered":
        return <Recycle className="h-4 w-4" />;
      case "disposed":
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "created":
        return "bg-primary text-primary-foreground";
      case "book_out":
        return "bg-destructive text-destructive-foreground";
      case "book_in":
        return "bg-green-500 text-white";
      case "recovered":
        return "bg-amber-500 text-white";
      case "disposed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleExportAuditTrail = () => {
    const headers = ["Date", "Event", "Weight (kg)", "Engineer", "Job Ref", "Details"];
    const rows = events.map((e) => [
      format(new Date(e.date), "yyyy-MM-dd HH:mm"),
      e.title,
      e.weight?.toFixed(2) || "",
      e.engineer || "",
      e.jobReference || "",
      e.description,
    ]);

    const csv = [
      `Cylinder Audit Trail: ${cylinder.cylinder_code}`,
      `Refrigerant: ${cylinder.refrigerant_type}`,
      `Initial Weight: ${cylinder.initial_weight_kg} kg`,
      `Current Weight: ${cylinder.current_weight_kg} kg`,
      `Status: ${cylinder.status}`,
      "",
      headers.join(","),
      ...rows.map((r) => r.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cylinder-audit-${cylinder.cylinder_code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit trail exported");
  };

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{cylinder.cylinder_code} Audit Trail</h3>
          <p className="text-sm text-muted-foreground">
            {cylinder.refrigerant_type} • {events.length} events
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportAuditTrail}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Weight Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Initial</div>
          <div className="font-bold">{Number(cylinder.initial_weight_kg).toFixed(2)} kg</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Current</div>
          <div className="font-bold">{Number(cylinder.current_weight_kg).toFixed(2)} kg</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Used/Recovered</div>
          <div className="font-bold">
            {(Number(cylinder.initial_weight_kg) - Number(cylinder.current_weight_kg)).toFixed(2)} kg
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[400px] pr-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${getEventColor(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.title}</span>
                      {event.weight && (
                        <Badge variant="secondary" className="text-xs">
                          {event.weight.toFixed(2)} kg
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(event.date), "dd MMM yyyy 'at' HH:mm")}
                      {event.engineer && ` • ${event.engineer}`}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                    {event.jobReference && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <FileText className="h-3 w-3" />
                        Job: {event.jobReference}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
