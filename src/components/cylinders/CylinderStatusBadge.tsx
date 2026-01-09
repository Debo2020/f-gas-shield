import { Badge } from "@/components/ui/badge";
import { Package, Truck, AlertCircle, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type CylinderStatus = Database["public"]["Enums"]["cylinder_status"];

interface CylinderStatusBadgeProps {
  status: CylinderStatus;
}

const statusConfig: Record<CylinderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  in_stock: {
    label: "In Stock",
    variant: "default",
    icon: <Package className="h-3 w-3" />,
  },
  checked_out: {
    label: "Checked Out",
    variant: "secondary",
    icon: <Truck className="h-3 w-3" />,
  },
  empty: {
    label: "Empty",
    variant: "outline",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  disposed: {
    label: "Disposed",
    variant: "destructive",
    icon: <Trash2 className="h-3 w-3" />,
  },
};

export function CylinderStatusBadge({ status }: CylinderStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}
