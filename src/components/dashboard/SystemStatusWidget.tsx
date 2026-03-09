import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";

interface HealthStatus {
  status: "ok" | "degraded" | "error" | "loading";
  errorCount: number;
}

export function SystemStatusWidget() {
  const [health, setHealth] = useState<HealthStatus>({ status: "loading", errorCount: 0 });

  useEffect(() => {
    async function check() {
      try {
        // Health check
        const { data, error: fnError } = await supabase.functions.invoke("health-check");
        const dbOk = !fnError && data?.status === "ok";

        // Error count last 24h
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("error_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since);

        const errorCount = count || 0;

        setHealth({
          status: !dbOk ? "error" : errorCount > 10 ? "degraded" : "ok",
          errorCount,
        });
      } catch {
        setHealth({ status: "error", errorCount: 0 });
      }
    }
    check();
  }, []);

  const statusMap: Record<string, "live" | "warning" | "error"> = {
    ok: "live",
    degraded: "warning",
    error: "error",
    loading: "live",
  };

  const labelMap: Record<string, string> = {
    ok: "All systems operational",
    degraded: "Minor issues detected",
    error: "System issues",
    loading: "Checking…",
  };

  return (
    <Card className="card-interactive">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          System Status
        </CardTitle>
        <StatusIndicator status={statusMap[health.status]} label={labelMap[health.status]} />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {health.errorCount > 0
            ? `${health.errorCount} error${health.errorCount === 1 ? "" : "s"} in last 24h`
            : "No errors in last 24h"}
        </p>
      </CardContent>
    </Card>
  );
}
