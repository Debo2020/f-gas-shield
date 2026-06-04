import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Lock,
  Activity,
  Clock,
} from "lucide-react";

const HEALTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`;
const POLL_INTERVAL_MS = 30_000;

type Status = "ok" | "degraded" | "error";

interface HealthResponse {
  status: Status;
  db?: string;
  timestamp?: string;
}

interface HealthState {
  status: Status | "unknown";
  httpStatus: number | null;
  db: string | null;
  serverTimestamp: string | null;
  fetchedAt: Date | null;
  latencyMs: number | null;
  error: string | null;
}

const initialState: HealthState = {
  status: "unknown",
  httpStatus: null,
  db: null,
  serverTimestamp: null,
  fetchedAt: null,
  latencyMs: null,
  error: null,
};

function statusMeta(status: HealthState["status"]) {
  switch (status) {
    case "ok":
      return {
        label: "Operational",
        Icon: CheckCircle2,
        badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
        ringClass: "ring-emerald-500/30",
      };
    case "degraded":
      return {
        label: "Degraded",
        Icon: AlertTriangle,
        badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/30",
        ringClass: "ring-amber-500/30",
      };
    case "error":
      return {
        label: "Outage",
        Icon: XCircle,
        badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
        ringClass: "ring-destructive/30",
      };
    default:
      return {
        label: "Checking…",
        Icon: Activity,
        badgeClass: "bg-muted text-muted-foreground border-border",
        ringClass: "ring-border",
      };
  }
}

export default function SystemStatus() {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<HealthState>(initialState);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    const start = performance.now();
    try {
      const res = await fetch(HEALTH_URL, { cache: "no-store" });
      const latencyMs = Math.round(performance.now() - start);
      let body: HealthResponse | null = null;
      try {
        body = (await res.json()) as HealthResponse;
      } catch {
        body = null;
      }

      let status: HealthState["status"] = "error";
      if (res.ok && body?.status === "ok") status = "ok";
      else if (res.status === 503 || body?.status === "degraded") status = "degraded";

      setState({
        status,
        httpStatus: res.status,
        db: body?.db ?? null,
        serverTimestamp: body?.timestamp ?? null,
        fetchedAt: new Date(),
        latencyMs,
        error: null,
      });
    } catch (err) {
      setState({
        ...initialState,
        status: "error",
        fetchedAt: new Date(),
        error: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    check();
    const id = window.setInterval(check, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [user, check]);

  // Auth gate — public route, but content for logged-in staff only
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Skeleton className="h-40 w-full max-w-md" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Staff access required</CardTitle>
            <CardDescription>
              The system status page is visible to logged-in FTrack staff only.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/auth">Log in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const meta = statusMeta(state.status);
  const { Icon } = meta;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
          <p className="text-muted-foreground">
            Live health check of the FTrack platform. Auto-refreshes every 30 seconds.
          </p>
        </header>

        <Card className={`ring-1 ${meta.ringClass}`}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{meta.label}</CardTitle>
                <CardDescription>
                  {state.fetchedAt
                    ? `Last checked ${state.fetchedAt.toLocaleTimeString()}`
                    : "Awaiting first check"}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={meta.badgeClass}>
              {meta.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-3">
                <dt className="text-xs uppercase text-muted-foreground">Database</dt>
                <dd className="mt-1 font-medium">{state.db ?? "—"}</dd>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <dt className="text-xs uppercase text-muted-foreground">HTTP status</dt>
                <dd className="mt-1 font-medium">{state.httpStatus ?? "—"}</dd>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <dt className="text-xs uppercase text-muted-foreground">Latency</dt>
                <dd className="mt-1 font-medium">
                  {state.latencyMs !== null ? `${state.latencyMs} ms` : "—"}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <dt className="text-xs uppercase text-muted-foreground">Server time</dt>
                <dd className="mt-1 font-medium truncate" title={state.serverTimestamp ?? ""}>
                  {state.serverTimestamp
                    ? new Date(state.serverTimestamp).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>

            {state.error && (
              <p className="text-sm text-destructive">Error: {state.error}</p>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground break-all">
                Endpoint: <code>{HEALTH_URL}</code>
              </p>
              <Button
                onClick={check}
                disabled={checking}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Checking" : "Refresh"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What each state means</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-emerald-500">Operational</strong> — API healthy and the
              database responded successfully.
            </p>
            <p>
              <strong className="text-amber-500">Degraded</strong> — API reachable but the
              database probe failed (HTTP 503).
            </p>
            <p>
              <strong className="text-destructive">Outage</strong> — Health endpoint unreachable
              or returned an unexpected response.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
