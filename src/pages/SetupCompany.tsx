import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlanSelector } from "@/components/onboarding/PlanSelector";
import { LicenseCounter } from "@/components/onboarding/LicenseCounter";
import { Progress } from "@/components/ui/progress";
import { SUBSCRIPTION_TIERS, SubscriptionTier, formatPrice } from "@/lib/subscription";
import {
  Loader2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Shield,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Company Setup", icon: Building2 },
  { id: 2, title: "Select Plan", icon: Sparkles },
  { id: 3, title: "Trial or Pay", icon: CreditCard },
];

export default function SetupCompany() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { createCheckout } = useSubscription();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Plan selection state
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const [licenseCount, setLicenseCount] = useState(3);

  // If user already has a company and subscription, redirect to dashboard
  useEffect(() => {
    if (profile?.company_id) {
      setCompanyId(profile.company_id);
      setIsSettingUp(false);
      // Skip company creation step, go to plan selection
      setCurrentStep(2);
    }
  }, [profile?.company_id]);

  // Auto-create company from signup metadata
  useEffect(() => {
    if (!user || profile?.company_id || companyId) return;

    const metadata = user.user_metadata;
    const companyNameFromMeta = metadata?.company_name;

    if (!companyNameFromMeta) {
      setIsSettingUp(false);
      return;
    }

    const createCompany = async () => {
      try {
        const { data: newCompanyId, error: createError } = await supabase.rpc(
          "create_company_for_current_user",
          {
            company_name: companyNameFromMeta,
            company_email: user.email || null,
            company_phone: metadata?.phone || null,
          }
        );

        if (createError) {
          if (createError.message?.includes("already belongs to a company")) {
            // User already has a company, refresh and continue
            await refreshProfile();
            return;
          }
          throw createError;
        }

        setCompanyId(newCompanyId);

        // Create owner license
        await supabase.from("user_licenses").insert({
          company_id: newCompanyId,
          user_id: user.id,
          email: user.email,
          status: "active",
          license_type: "owner",
          assigned_by: user.id,
        });

        await refreshProfile();
        toast.success("Company created successfully!");
      } catch (err) {
        console.error("Error creating company:", err);
        setError(err instanceof Error ? err.message : "Failed to create company");
      } finally {
        setIsSettingUp(false);
        setCurrentStep(2);
      }
    };

    createCompany();
  }, [user, profile?.company_id, companyId]);

  const handleSelectPlan = () => {
    if (!selectedTier) {
      toast.error("Please select a plan");
      return;
    }
    if (selectedTier === "enterprise") {
      navigate("/enterprise-contact");
      return;
    }
    setCurrentStep(3);
  };

  const handleCheckout = async (isTrial: boolean) => {
    if (!selectedTier) return;
    setIsLoading(true);
    setError(null);

    try {
      const config = SUBSCRIPTION_TIERS[selectedTier];
      const priceId = isAnnual && "annual_price_id" in config ? config.annual_price_id : config.price_id;

      await createCheckout(priceId, licenseCount, profile?.full_name || "", selectedTier, isTrial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSettingUp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Setting up your company...</p>
        </div>
      </div>
    );
  }

  const progress = (currentStep / STEPS.length) * 100;

  const selectedConfig = selectedTier ? SUBSCRIPTION_TIERS[selectedTier] : null;
  const displayPrice = selectedConfig
    ? isAnnual && "annual_price" in selectedConfig
      ? selectedConfig.annual_price
      : selectedConfig.price
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">FTrack</h1>
            <p className="text-xs text-muted-foreground">F-Gas Compliance</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isComplete = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                        isComplete
                          ? "bg-accent text-accent-foreground"
                          : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-4 mt-[-1.5rem]",
                        isComplete ? "bg-accent" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1 — Company created confirmation */}
        {currentStep === 1 && (
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Company Setup</h2>
            <p className="text-muted-foreground">
              We need your company details to continue. Please enter them below.
            </p>
            <Button onClick={() => navigate("/company/setup")}>
              Set Up Company <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2 — Plan Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full mb-4">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Company created!</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground">
                Select the plan that best fits your business needs
              </p>
            </div>

            <PlanSelector
              selectedTier={selectedTier}
              onSelectTier={setSelectedTier}
              isAnnual={isAnnual}
              onToggleAnnual={setIsAnnual}
            />

            {selectedTier && selectedTier !== "enterprise" && (
              <LicenseCounter
                tier={selectedTier}
                licenseCount={licenseCount}
                onLicenseCountChange={setLicenseCount}
                isAnnual={isAnnual}
              />
            )}

            <div className="flex justify-end">
              <Button onClick={handleSelectPlan} disabled={!selectedTier}>
                {selectedTier === "enterprise" ? "Contact Sales" : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Trial or Pay */}
        {currentStep === 3 && selectedTier && displayPrice !== null && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">How Would You Like to Start?</h2>
              <p className="text-muted-foreground">
                Choose a 7-day free trial or subscribe now
              </p>
            </div>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedConfig?.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Licenses</span>
                  <span className="font-medium">{licenseCount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Billing</span>
                  <span className="font-medium">{isAnnual ? "Annual" : "Monthly"}</span>
                </div>
                <div className="flex justify-between py-1.5 font-semibold text-lg">
                  <span>Total</span>
                  <span>
                    {formatPrice(displayPrice! * licenseCount, selectedConfig!.currency)}
                    /{isAnnual ? "month" : "month"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Trial option */}
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold">Start with a 7-Day Free Trial</h3>
                      <p className="text-sm text-muted-foreground">
                        No charge today. Your card will be saved and billing begins automatically
                        after 7 days unless cancelled.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleCheckout(true)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                      ) : (
                        "Start Free Trial"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pay now option */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold">Subscribe Now</h3>
                      <p className="text-sm text-muted-foreground">
                        Start your subscription immediately with full access to all features.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleCheckout(false)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                      ) : (
                        <>Subscribe Now — {formatPrice(displayPrice! * licenseCount, selectedConfig!.currency)}/month</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button variant="ghost" onClick={() => setCurrentStep(2)} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plan Selection
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
