import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Building2, Zap, Crown } from "lucide-react";
import { SUBSCRIPTION_TIERS, SubscriptionTier, formatPrice, getAnnualSavingsPercent } from "@/lib/subscription";
import { cn } from "@/lib/utils";

const tierIcons: Record<SubscriptionTier, React.ReactNode> = {
  basic: <Building2 className="h-6 w-6" />,
  premium: <Zap className="h-6 w-6" />,
  enterprise: <Crown className="h-6 w-6" />,
};

interface PlanSelectorProps {
  selectedTier: SubscriptionTier | null;
  onSelectTier: (tier: SubscriptionTier) => void;
  isAnnual: boolean;
  onToggleAnnual: (annual: boolean) => void;
}

export function PlanSelector({ selectedTier, onSelectTier, isAnnual, onToggleAnnual }: PlanSelectorProps) {
  const tiers = Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][];

  const getDisplayPrice = (tier: SubscriptionTier) => {
    const config = SUBSCRIPTION_TIERS[tier];
    if (isAnnual && "annual_price" in config) {
      return config.annual_price;
    }
    return config.price;
  };

  return (
    <div className="space-y-6">
      {/* Annual toggle */}
      <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg">
        <Label htmlFor="annual-toggle" className={cn(!isAnnual && "font-semibold")}>
          Monthly
        </Label>
        <Switch
          id="annual-toggle"
          checked={isAnnual}
          onCheckedChange={onToggleAnnual}
        />
        <Label htmlFor="annual-toggle" className={cn(isAnnual && "font-semibold")}>
          Annual
          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Save up to 17%
          </Badge>
        </Label>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map(([tierKey, config]) => {
          const isSelected = selectedTier === tierKey;
          const isPopular = "popular" in config && config.popular;
          const annualSavings = getAnnualSavingsPercent(tierKey);
          const displayPrice = getDisplayPrice(tierKey);

          return (
            <Card
              key={tierKey}
              className={cn(
                "relative cursor-pointer transition-all hover:shadow-lg",
                isSelected && "ring-2 ring-primary border-primary",
                isPopular && "border-primary/50"
              )}
              onClick={() => onSelectTier(tierKey)}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className={cn(
                  "mx-auto p-3 rounded-full mb-2",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {tierIcons[tierKey]}
                </div>
                <CardTitle className="text-xl">{config.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    {formatPrice(displayPrice, config.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    /user/{isAnnual ? "month (billed annually)" : "month"}
                  </span>
                </CardDescription>
                {isAnnual && annualSavings > 0 && (
                  <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                    Save {annualSavings}%
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {config.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                  <p>Up to {config.limits.sites === -1 ? "unlimited" : config.limits.sites} sites</p>
                  <p>Up to {config.limits.equipment === -1 ? "unlimited" : config.limits.equipment} equipment</p>
                </div>

                <Button 
                  variant={isSelected ? "default" : "outline"}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTier(tierKey);
                  }}
                >
                  {isSelected ? "Selected" : "Select Plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
