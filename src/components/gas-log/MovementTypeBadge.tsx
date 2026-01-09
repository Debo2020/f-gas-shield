import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Recycle } from "lucide-react";

type MovementType = "book_out" | "book_in" | "recovered";

interface MovementTypeBadgeProps {
  type: MovementType;
}

const movementConfig: Record<MovementType, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  book_out: {
    label: "Booked Out",
    icon: ArrowUpCircle,
    variant: "destructive",
  },
  book_in: {
    label: "Booked In",
    icon: ArrowDownCircle,
    variant: "default",
  },
  recovered: {
    label: "Recovered",
    icon: Recycle,
    variant: "secondary",
  },
};

export function MovementTypeBadge({ type }: MovementTypeBadgeProps) {
  const config = movementConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
