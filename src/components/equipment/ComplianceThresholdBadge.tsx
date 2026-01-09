import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";

interface ComplianceThresholdBadgeProps {
  co2eTonnes: number | null;
  showFrequency?: boolean;
  className?: string;
}

export function getComplianceThreshold(co2eTonnes: number | null) {
  if (co2eTonnes === null) return null;
  
  if (co2eTonnes >= 500) {
    return {
      category: "500t+",
      frequency: 3,
      label: "Quarterly",
      variant: "destructive" as const,
      description: "≥500 tonnes CO₂e requires leak checks every 3 months",
      icon: AlertTriangle,
    };
  } else if (co2eTonnes >= 50) {
    return {
      category: "50t+",
      frequency: 6,
      label: "Bi-annual",
      variant: "secondary" as const,
      description: "≥50 tonnes CO₂e requires leak checks every 6 months",
      icon: Clock,
    };
  } else if (co2eTonnes >= 5) {
    return {
      category: "5t+",
      frequency: 12,
      label: "Annual",
      variant: "default" as const,
      description: "≥5 tonnes CO₂e requires leak checks every 12 months",
      icon: ShieldCheck,
    };
  } else {
    return {
      category: "<5t",
      frequency: 12,
      label: "Voluntary",
      variant: "outline" as const,
      description: "Below 5 tonnes CO₂e - no mandatory leak check (recommended annually)",
      icon: ShieldCheck,
    };
  }
}

export function getRequiredFrequency(co2eTonnes: number | null): number {
  const threshold = getComplianceThreshold(co2eTonnes);
  return threshold?.frequency || 12;
}

export function ComplianceThresholdBadge({ 
  co2eTonnes, 
  showFrequency = false,
  className 
}: ComplianceThresholdBadgeProps) {
  const threshold = getComplianceThreshold(co2eTonnes);
  
  if (!threshold) {
    return null;
  }

  const Icon = threshold.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={threshold.variant} className={className}>
            <Icon className="h-3 w-3 mr-1" />
            {showFrequency ? threshold.label : threshold.category}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{threshold.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
