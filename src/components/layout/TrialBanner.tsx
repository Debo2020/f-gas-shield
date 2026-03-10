import { useSubscription } from "@/hooks/useSubscription";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { isTrialing, trialDaysRemaining } = useSubscription();

  if (!isTrialing) return null;

  const isUrgent = trialDaysRemaining <= 1;

  return (
    <div className={cn(
      "px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2",
      isUrgent
        ? "bg-destructive text-destructive-foreground"
        : "bg-primary/10 text-primary"
    )}>
      {isUrgent ? (
        <Clock className="h-4 w-4" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      <span>
        {trialDaysRemaining <= 0
          ? "Your free trial ends today"
          : trialDaysRemaining === 1
            ? "Your free trial ends tomorrow"
            : `Your free trial ends in ${trialDaysRemaining} days`
        }
      </span>
    </div>
  );
}
