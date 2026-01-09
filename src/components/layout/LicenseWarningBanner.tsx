import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLicenses } from "@/hooks/useLicenses";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface LicenseWarningBannerProps {
  threshold?: number;
}

export function LicenseWarningBanner({ threshold = 80 }: LicenseWarningBannerProps) {
  const { stats, loading } = useLicenses();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Only show to owners/managers
  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  if (!isOwner && !isManager) return null;

  // Calculate utilization
  const usedLicenses = stats.active + stats.pending;
  const utilizationPercent = stats.total > 0 
    ? (usedLicenses / stats.total) * 100 
    : 0;

  // Don't show if loading, dismissed, or below threshold
  if (loading || dismissed || utilizationPercent < threshold || stats.total === 0) return null;

  const isCritical = utilizationPercent >= 100;

  return (
    <div className={cn(
      "w-full px-4 py-3 flex items-center justify-between gap-4 border-b",
      isCritical 
        ? "bg-destructive/10 border-destructive/20" 
        : "bg-warning/10 border-warning/20"
    )}>
      <div className="flex items-center gap-2">
        <AlertTriangle className={cn(
          "h-4 w-4 shrink-0",
          isCritical ? "text-destructive" : "text-warning"
        )} />
        <p className={cn(
          "text-sm",
          isCritical ? "text-destructive" : "text-warning-foreground"
        )}>
          {isCritical 
            ? `All ${stats.total} licenses are in use. Add more to invite new team members.`
            : `You're using ${usedLicenses} of ${stats.total} licenses.`
          }
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isOwner ? (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => navigate("/settings/licenses")}
          >
            Add Licenses
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => navigate("/settings/licenses")}
          >
            View Licenses
          </Button>
        )}
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6" 
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
