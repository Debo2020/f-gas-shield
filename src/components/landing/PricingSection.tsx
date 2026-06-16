import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Briefcase, Zap, Building, Loader2, Phone, Flame } from "lucide-react";
import { AICreditInfo } from "@/components/pricing/AICreditInfo";
import { SUBSCRIPTION_TIERS, SubscriptionTier, formatPrice, getAnnualSavingsPercent } from "@/lib/subscription";
import { ADDON_MODULES } from "@/lib/gas-addons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const tierIcons: Record<SubscriptionTier, React.ComponentType<{ className?: string }>> = {
  basic: Briefcase,
  premium: Zap,
  enterprise: Building,
};

interface PricingSectionProps {
  showHeader?: boolean;
}

export function PricingSection({ showHeader = true }: PricingSectionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createCheckout } = useSubscription();
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

  const handleEnterpriseCallback = () => {
    navigate("/enterprise-contact");
  };

  const handleSelectTier = async (tier: SubscriptionTier) => {
    // Enterprise tier uses callback flow
    if (tier === "enterprise") {
      handleEnterpriseCallback();
      return;
    }

    // If not authenticated, redirect to get-started flow
    if (!user) {
      navigate("/get-started");
      return;
    }

    // Authenticated user - go directly to Stripe checkout
    setLoadingTier(tier);
    try {
      const config = SUBSCRIPTION_TIERS[tier];
      const priceId = isAnnual && "annual_price_id" in config 
        ? config.annual_price_id 
        : config.price_id;
      
      await createCheckout(priceId, 1, undefined, tier);
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <section id="pricing" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {showHeader && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Per-user pricing that scales with your team. All plans include a 14-day free trial.
            </p>
            
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3">
              <Label 
                htmlFor="billing-toggle" 
                className={cn("text-sm", !isAnnual && "text-foreground font-medium")}
              >
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label 
                htmlFor="billing-toggle"
                className={cn("text-sm", isAnnual && "text-foreground font-medium")}
              >
                Annual
              </Label>
              {isAnnual && (
                <Badge variant="secondary" className="ml-2 bg-accent text-accent-foreground">
                  Save 17%
                </Badge>
              )}
            </div>
            {isAnnual && (
              <p className="text-xs text-muted-foreground mt-3">
                Got a partner code? Apply it at checkout for 20% off your first 3 months.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS.basic][]).map(
            ([tier, config]) => {
              const Icon = tierIcons[tier];
              const isPopular = "popular" in config && config.popular;
              const isCustomPricing = "customPricing" in config && config.customPricing;
              const price = isCustomPricing 
                ? null 
                : (isAnnual && "annual_price" in config ? config.annual_price : config.price);
              const savingsPercent = getAnnualSavingsPercent(tier);

              return (
                <Card 
                  key={tier}
                  className={cn(
                    "relative flex flex-col",
                    isPopular && "border-primary shadow-lg scale-105 z-10"
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{config.name}</CardTitle>
                    <CardDescription>
                      {tier === "basic" && "Perfect for small teams"}
                      {tier === "premium" && "For growing businesses"}
                      {tier === "enterprise" && "BMS & ERP integrations for national operators"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <div className="text-center mb-6">
                      {isCustomPricing ? (
                        <>
                          <span className="text-2xl font-bold text-primary">Custom Pricing</span>
                          <p className="text-sm text-muted-foreground mt-2">
                            Tailored to your organisation's needs
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold">
                              {formatPrice(price as number, config.currency)}
                            </span>
                            <span className="text-muted-foreground">/user/month</span>
                          </div>
                          {isAnnual && savingsPercent > 0 && (
                            <p className="text-sm text-accent mt-1">
                              Save {savingsPercent}% with annual billing
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {config.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                      <p>{(config.limits.equipment as number) === -1 ? "Unlimited F Gas Systems" : `Up to ${config.limits.equipment} F Gas Systems`}</p>
                      <p>{(config.limits.sites as number) === -1 ? "Unlimited sites" : `Up to ${config.limits.sites} sites`}</p>
                    </div>

                    {/* AI Credits Section */}
                    <AICreditInfo tier={tier} className="mt-4" />
                  </CardContent>

                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={tier === "enterprise" ? "default" : (isPopular ? "default" : "outline")}
                      onClick={() => handleSelectTier(tier)}
                      disabled={loadingTier === tier}
                    >
                      {loadingTier === tier ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : tier === "enterprise" ? (
                        <>
                          <Phone className="mr-2 h-4 w-4" />
                          Request a Call-back
                        </>
                      ) : (
                        "Get Started"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            }
          )}
        </div>

        {/* Add-on Modules */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold mb-1">Add-on Modules</h3>
            <p className="text-sm text-muted-foreground">Optional modules available with any plan</p>
          </div>
          <Card className="border-primary/20">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-6">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{ADDON_MODULES.natural_gas.name}</p>
                <p className="text-sm text-muted-foreground">{ADDON_MODULES.natural_gas.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-bold">{formatPrice(ADDON_MODULES.natural_gas.price, "GBP")}</span>
                <span className="text-muted-foreground text-sm">/user/mo</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
