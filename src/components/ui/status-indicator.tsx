import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "live" | "synced" | "warning" | "error";
  label?: string;
  className?: string;
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const statusStyles = {
    live: "bg-green-500",
    synced: "bg-primary",
    warning: "bg-warning",
    error: "bg-destructive",
  };

  const statusLabels = {
    live: "Live",
    synced: "Synced",
    warning: "Warning",
    error: "Error",
  };

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            statusStyles[status]
          )}
        />
        <span
          className={cn("relative inline-flex h-2 w-2 rounded-full", statusStyles[status])}
        />
      </span>
      <span>{label || statusLabels[status]}</span>
    </div>
  );
}
