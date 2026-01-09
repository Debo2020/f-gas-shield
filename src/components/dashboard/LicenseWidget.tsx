import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLicenses } from "@/hooks/useLicenses";
import { useSubscription } from "@/hooks/useSubscription";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription";
import { cn } from "@/lib/utils";

export function LicenseWidget() {
  const navigate = useNavigate();
  const { stats, loading } = useLicenses();
  const { tier, subscribed } = useSubscription();

  if (!subscribed || loading) return null;

  const utilizationPercent = stats.total > 0 
    ? ((stats.active + stats.pending) / stats.total) * 100 
    : 0;
  
  const tierConfig = tier ? SUBSCRIPTION_TIERS[tier] : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Licenses
        </CardTitle>
        {tierConfig && (
          <Badge variant="secondary">{tierConfig.name}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{stats.active + stats.pending}</p>
            <p className="text-xs text-muted-foreground">of {stats.total} licenses used</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-green-600">{stats.available}</p>
            <p className="text-xs text-muted-foreground">available</p>
          </div>
        </div>

        <Progress 
          value={utilizationPercent} 
          className={cn(
            "h-2",
            utilizationPercent >= 90 && "[&>div]:bg-amber-500",
            utilizationPercent >= 100 && "[&>div]:bg-red-500"
          )} 
        />

        {utilizationPercent >= 80 && (
          <p className="text-xs text-amber-600">
            ⚠️ Approaching license limit
          </p>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between"
          onClick={() => navigate("/settings/licenses")}
        >
          Manage Licenses
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
