import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  FileWarning,
  Award,
  ChevronRight,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import type { ExpiryAlert } from "@/hooks/useExpiryAlerts";

interface ExpiryAlertBannerProps {
  alerts: ExpiryAlert[];
  maxVisible?: number;
  variant?: "compact" | "full";
  className?: string;
}

export function ExpiryAlertBanner({
  alerts,
  maxVisible = 3,
  variant = "compact",
  className,
}: ExpiryAlertBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (alerts.length === 0) return null;

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const displayAlerts = visibleAlerts.slice(0, maxVisible);
  const remainingCount = visibleAlerts.length - maxVisible;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const handleNavigate = (alert: ExpiryAlert) => {
    if (alert.linkedTo) {
      switch (alert.linkedTo.type) {
        case "equipment":
          navigate(`/equipment/${alert.linkedTo.id}`);
          break;
        case "site":
          navigate(`/sites/${alert.linkedTo.id}`);
          break;
        case "profile":
          navigate(`/settings/profile`);
          break;
      }
    } else if (alert.type === "certificate") {
      navigate("/settings/profile");
    } else {
      navigate("/documents");
    }
  };

  const getSeverityStyles = (severity: ExpiryAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return {
          bg: "bg-destructive/10 border-destructive/30",
          icon: "text-destructive",
          badge: "destructive" as const,
        };
      case "warning":
        return {
          bg: "bg-amber-500/10 border-amber-500/30",
          icon: "text-amber-500",
          badge: "secondary" as const,
        };
      default:
        return {
          bg: "bg-blue-500/10 border-blue-500/30",
          icon: "text-blue-500",
          badge: "outline" as const,
        };
    }
  };

  const getExpiryLabel = (days: number) => {
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `Expires in ${days} days`;
  };

  if (variant === "compact") {
    if (visibleAlerts.length === 0) return null;

    const compactAlerts = visibleAlerts.slice(0, maxVisible);
    const compactRemaining = visibleAlerts.length - maxVisible;

    return (
      <div className={`space-y-2 ${className}`}>
        {compactAlerts.map((alert) => {
          const styles = getSeverityStyles(alert.severity);
          const Icon = alert.type === "certificate" ? Award : FileWarning;

          return (
            <Card
              key={alert.id}
              className={`border ${styles.bg} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleNavigate(alert)}
            >
              <CardContent className="py-2.5 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${styles.icon}`} />
                    <p className="text-sm font-medium truncate">{alert.name}</p>
                    <Badge variant={styles.badge} className="text-xs flex-shrink-0">
                      {getExpiryLabel(alert.daysUntilExpiry)}
                    </Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {compactRemaining > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const remaining = visibleAlerts.slice(maxVisible);
              const allCerts = remaining.every((a) => a.type === "certificate");
              const allDocs = remaining.every((a) => a.type === "document");
              navigate(allCerts ? "/settings/profile" : allDocs ? "/documents" : "/documents");
            }}
          >
            View {compactRemaining} more alert{compactRemaining !== 1 && "s"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {displayAlerts.map((alert) => {
        const styles = getSeverityStyles(alert.severity);
        const Icon = alert.type === "certificate" ? Award : FileWarning;

        return (
          <Card
            key={alert.id}
            className={`border ${styles.bg} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => handleNavigate(alert)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-1.5 rounded-md ${styles.bg}`}>
                    <Icon className={`h-4 w-4 ${styles.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{alert.name}</p>
                      <Badge variant={styles.badge} className="text-xs flex-shrink-0">
                        {getExpiryLabel(alert.daysUntilExpiry)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(alert.expiryDate, "dd MMM yyyy")}</span>
                      {alert.linkedTo && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{alert.linkedTo.type}: {alert.linkedTo.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(alert.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {remainingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const remaining = visibleAlerts.slice(maxVisible);
            const allCerts = remaining.every((a) => a.type === "certificate");
            const allDocs = remaining.every((a) => a.type === "document");
            navigate(allCerts ? "/settings/profile" : allDocs ? "/documents" : "/documents");
          }}
        >
          View {remainingCount} more alert{remainingCount !== 1 && "s"}
        </Button>
      )}
    </div>
  );
}
