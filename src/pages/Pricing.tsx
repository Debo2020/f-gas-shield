import { useState } from "react";
import { Check, Loader2, Sparkles, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { SUBSCRIPTION_TIERS, formatPrice, SubscriptionTier } from "@/lib/subscription";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tierIcons = {
  basic: Users,
  premium: Sparkles,
  enterprise: Building2,
};

export default function Pricing() {
  const { user } = useAuth();
  const { subscribed, tier: currentTier, createCheckout, openCustomerPortal, loading } = useSubscription();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoadingTier(tier);
    try {
      await createCheckout(SUBSCRIPTION_TIERS[tier].price_id);
    } catch (err) {
      toast.error("Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingTier("manage");
    try {
      await openCustomerPortal();
    } catch (err) {
      toast.error("Failed to open subscription management");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-semibold">F-Gas Comply</span>
            </div>
            {user ? (
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            User-based pricing for SMEs. Platform-led pricing for enterprises.
            Choose the plan that fits your compliance needs.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][]).map(([tier, config]) => {
              const Icon = tierIcons[tier];
              const isCurrentPlan = subscribed && currentTier === tier;
              const isPopular = "popular" in config && config.popular;

              return (
                <Card
                  key={tier}
                  className={cn(
                    "relative flex flex-col",
                    isPopular && "border-primary shadow-lg scale-105",
                    isCurrentPlan && "ring-2 ring-primary"
                  )}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge variant="secondary" className="absolute -top-3 right-4">
                      Your Plan
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className={cn(
                      "mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center",
                      isPopular ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-2xl">{config.name}</CardTitle>
                    <CardDescription>
                      {tier === "enterprise" 
                        ? "For national operators & franchises"
                        : tier === "premium"
                        ? "For regional & national operators"
                        : "For small HVAC contractors"
                      }
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold">
                        {formatPrice(config.price, config.currency)}
                      </span>
                      <span className="text-muted-foreground">
                        {tier === "enterprise" ? "/month" : " per user/month"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {config.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {config.limits && (
                      <div className="mt-6 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Includes:</p>
                        <div className="text-sm space-y-1">
                          <p>{config.limits.sites === -1 ? "Unlimited sites" : `Up to ${config.limits.sites} sites`}</p>
                          <p>{config.limits.equipment === -1 ? "Unlimited equipment" : `Up to ${config.limits.equipment} equipment`}</p>
                          <p>{config.limits.users === -1 ? "Unlimited users" : `Up to ${config.limits.users} users`}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter>
                    {isCurrentPlan ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleManageSubscription}
                        disabled={loadingTier === "manage"}
                      >
                        {loadingTier === "manage" && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Manage Subscription
                      </Button>
                    ) : tier === "enterprise" ? (
                      <Button
                        variant={isPopular ? "default" : "outline"}
                        className="w-full"
                        onClick={() => window.location.href = "mailto:sales@fgascomply.com?subject=Enterprise%20Inquiry"}
                      >
                        Contact Sales
                      </Button>
                    ) : (
                      <Button
                        variant={isPopular ? "default" : "outline"}
                        className="w-full"
                        onClick={() => handleSubscribe(tier)}
                        disabled={loadingTier === tier}
                      >
                        {loadingTier === tier && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {subscribed ? "Switch Plan" : "Get Started"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* FAQ or additional info */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Need a Custom Solution?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            For franchise networks, FM providers, or national HVAC firms with specific requirements,
            we offer tailored enterprise contracts with volume discounts.
          </p>
          <Button variant="outline" size="lg" asChild>
            <a href="mailto:sales@fgascomply.com">Contact Our Sales Team</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
