import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { PlanSelector } from "@/components/onboarding/PlanSelector";
import { LicenseCounter } from "@/components/onboarding/LicenseCounter";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/subscription";
import { ArrowLeft, ArrowRight, Building2, CreditCard, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Choose Plan", icon: Sparkles },
  { id: 2, title: "Company Details", icon: Building2 },
  { id: 3, title: "Payment", icon: CreditCard },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();
  const { createCheckout, subscribed } = useSubscription();

  // Get tier and billing preference from URL params
  const tierParam = searchParams.get("tier") as SubscriptionTier | null;
  const annualParam = searchParams.get("annual");

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(
    tierParam && tierParam in SUBSCRIPTION_TIERS ? tierParam : null
  );
  const [isAnnual, setIsAnnual] = useState(annualParam !== "false");
  const [licenseCount, setLicenseCount] = useState(3);
  const [isLoading, setIsLoading] = useState(false);

  // Company details
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  // Redirect if already subscribed
  useEffect(() => {
    if (subscribed && profile?.company_id) {
      navigate("/dashboard");
    }
  }, [subscribed, profile?.company_id, navigate]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth?redirect=/onboarding");
    }
  }, [user, navigate]);

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!selectedTier) {
        toast.error("Please select a plan");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!companyName.trim()) {
        toast.error("Please enter your company name");
        return;
      }
      
      // Create company
      setIsLoading(true);
      try {
        // Generate slug
        const { data: slugData, error: slugError } = await supabase
          .rpc("generate_unique_slug", { company_name: companyName });
        
        if (slugError) throw slugError;

        // Create company
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .insert({
            name: companyName,
            slug: slugData,
            address: companyAddress || null,
            phone: companyPhone || null,
            email: companyEmail || null,
          })
          .select()
          .single();

        if (companyError) throw companyError;

        // Update profile with company_id
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ company_id: company.id })
          .eq("user_id", user!.id);

        if (profileError) throw profileError;

        // Add owner role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: user!.id,
            role: "owner",
          });

        if (roleError) throw roleError;

        // Create owner license
        const { error: licenseError } = await supabase
          .from("user_licenses")
          .insert({
            company_id: company.id,
            user_id: user!.id,
            email: user!.email,
            status: "active",
            license_type: "owner",
            assigned_by: user!.id,
          });

        if (licenseError) throw licenseError;

        await refreshProfile();
        setCurrentStep(3);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create company");
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 3) {
      // Proceed to checkout
      handleCheckout();
    }
  };

  const handleCheckout = async () => {
    if (!selectedTier) return;

    setIsLoading(true);
    try {
      const config = SUBSCRIPTION_TIERS[selectedTier];
      const priceId = isAnnual && "annual_price_id" in config 
        ? config.annual_price_id 
        : config.price_id;

      await createCheckout(priceId, licenseCount, companyName, selectedTier);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">FC</span>
            </div>
            <span className="font-semibold text-lg">F-Gas Comply</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Exit
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isComplete = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                      isComplete ? "bg-green-500 text-white" :
                      isActive ? "bg-primary text-primary-foreground" : 
                      "bg-muted text-muted-foreground"
                    )}>
                      {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-4 mt-[-1.5rem]",
                      isComplete ? "bg-green-500" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Step content */}
        <div className="space-y-6">
          {currentStep === 1 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
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

              {selectedTier && (
                <LicenseCounter
                  tier={selectedTier}
                  licenseCount={licenseCount}
                  onLicenseCountChange={setLicenseCount}
                  isAnnual={isAnnual}
                />
              )}
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Company Details</h1>
                <p className="text-muted-foreground">
                  Tell us about your business
                </p>
              </div>

              <Card className="max-w-xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    This information will appear on your reports and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Company Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <Textarea
                      id="companyAddress"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="123 Business Street, City, Postcode"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Phone</Label>
                      <Input
                        id="companyPhone"
                        type="tel"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="+44 123 456 7890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Email</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        placeholder="info@company.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Complete Your Subscription</h1>
                <p className="text-muted-foreground">
                  Review your order and proceed to payment
                </p>
              </div>

              <Card className="max-w-xl mx-auto">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-semibold">
                      {selectedTier && SUBSCRIPTION_TIERS[selectedTier].name}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Licenses</span>
                    <span className="font-semibold">{licenseCount}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Billing</span>
                    <span className="font-semibold">{isAnnual ? "Annual" : "Monthly"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-semibold">{companyName}</span>
                  </div>
                  {selectedTier && (
                    <div className="flex justify-between py-2 text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">
                        £{(() => {
                          const config = SUBSCRIPTION_TIERS[selectedTier];
                          const price = isAnnual && "annual_price" in config 
                            ? config.annual_price 
                            : config.price;
                          return (price * licenseCount).toFixed(0);
                        })()}/{isAnnual ? "month" : "month"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleNextStep}
            disabled={isLoading || (currentStep === 1 && !selectedTier)}
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {currentStep === 3 ? "Proceed to Payment" : "Continue"}
            {currentStep < 3 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </main>
    </div>
  );
}
