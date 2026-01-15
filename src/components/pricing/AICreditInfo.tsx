import { Bot, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SubscriptionTier, SUBSCRIPTION_TIERS } from "@/lib/subscription";

interface AICreditInfoProps {
  tier: SubscriptionTier;
  compact?: boolean;
  className?: string;
}

export function AICreditInfo({ tier, compact = false, className }: AICreditInfoProps) {
  const config = SUBSCRIPTION_TIERS[tier];
  const limits = config.limits;
  const isUnlimited = limits.ai_credits_monthly === -1;
  const credits = limits.ai_credits_monthly;
  const overageRate = "ai_credit_overage_rate" in config ? config.ai_credit_overage_rate : 0;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2 text-sm", className)}>
              <Bot className="h-4 w-4 text-primary" />
              <span>
                {isUnlimited ? "Unlimited" : credits} AI credits/month
              </span>
              {!isUnlimited && overageRate > 0 && (
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          {!isUnlimited && overageRate > 0 && (
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">
                <strong>{credits} credits included</strong> each month. If you exceed this limit, 
                additional credits are billed at <strong>£{(overageRate / 100).toFixed(2)}/credit</strong>.
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-muted/50 p-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">AI Compliance Assistant</span>
      </div>
      
      <div className="space-y-1 text-sm">
        {isUnlimited ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Unlimited
            </Badge>
            <span className="text-muted-foreground">credits included</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Included credits</span>
              <span className="font-medium">{credits}/month</span>
            </div>
            {overageRate > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Overage rate</span>
                <span className="font-medium">+£{(overageRate / 100).toFixed(2)}/credit</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
