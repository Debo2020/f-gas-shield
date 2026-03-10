import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlanSelector } from "@/components/onboarding/PlanSelector";
import { LicenseCounter } from "@/components/onboarding/LicenseCounter";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUBSCRIPTION_TIERS, SubscriptionTier, formatPrice } from "@/lib/subscription";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Sparkles,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const STEPS = [
  { id: 1, title: "Your Details", icon: User },
  { id: 2, title: "Select Plan", icon: Sparkles },
  { id: 3, title: "Trial or Pay", icon: CreditCard },
];

const emailSchema = z.string().trim().email("Please enter a valid email address");
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(100);
const companySchema = z.string().trim().min(2, "Company name must be at least 2 characters").max(200);

export default function GetStarted() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { createCheckout } = useSubscription();

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 — Account details
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2 — Plan selection
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const [licenseCount, setLicenseCount] = useState(3);

  // If user is already authenticated with a company & subscription, redirect
  useEffect(() => {
    if (user) {
      // User already signed in — they likely refreshed mid-flow.
      // We won't redirect, let them finish the flow.
    }
  }, [user]);

  const validateStep1 = (): boolean => {
    setError(null);
    const nameResult = nameSchema.safeParse(fullName);
    if (!nameResult.success) {
      setError(nameResult.error.errors[0].message);
      return false;
    }
    const companyResult = companySchema.safeParse(companyName);
    if (!companyResult.success) {
      setError(companyResult.error.errors[0].message);
      return false;
    }
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return false;
    }
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!selectedTier) {
        toast.error("Please select a plan");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSubmit = async (isTrial: boolean) => {
    setError(null);
    setIsLoading(true);

    try {
      // 1. Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (!authData.session) {
        // Email confirmation is required
        toast.success("Please check your email to confirm your account, then return here to complete setup.");
        setError("We've sent a confirmation email. Please verify your email and then sign in to continue.");
        return;
      }

      // 2. Create company via atomic RPC
      const { data: companyId, error: companyError } = await supabase.rpc(
        "create_company_for_current_user",
        {
          company_name: companyName.trim(),
          company_phone: phone.trim() || null,
          company_email: email.trim(),
        }
      );

      if (companyError) throw companyError;

      // 3. Create owner license
      const { error: licenseError } = await supabase.from("user_licenses").insert({
        company_id: companyId,
        user_id: authData.user!.id,
        email: email.trim(),
        status: "active",
        license_type: "owner",
        assigned_by: authData.user!.id,
      });

      if (licenseError) throw licenseError;

      await refreshProfile();

      // 4. Redirect to Stripe checkout
      const config = SUBSCRIPTION_TIERS[selectedTier!];
      const priceId =
        isAnnual && "annual_price_id" in config ? config.annual_price_id : config.price_id;

      await createCheckout(priceId, licenseCount, companyName.trim(), selectedTier!, isTrial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src="/favicon.png" alt="FTrack Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-lg text-foreground">FTrack</span>
          </button>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline font-medium"
            >
              Sign In
            </button>
          </p>
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

        {/* Step 1 — Account Details */}
        {currentStep === 1 && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
              <p className="text-muted-foreground">
                Enter your details to get started with FTrack
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Ltd"
                    autoComplete="organization"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.co.uk"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min 12 characters with uppercase, lowercase, number &amp; special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 123 456 7890"
                    autoComplete="tel"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2 — Plan Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
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
          </div>
        )}

        {/* Step 3 — Trial or Pay */}
        {currentStep === 3 && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">How Would You Like to Start?</h1>
              <p className="text-muted-foreground">
                Choose a 7-day free trial or subscribe now
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{companyName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">
                    {selectedTier && SUBSCRIPTION_TIERS[selectedTier].name}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Licenses</span>
                  <span className="font-medium">{licenseCount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Billing</span>
                  <span className="font-medium">{isAnnual ? "Annual" : "Monthly"}</span>
                </div>
                {selectedTier && (
                  <div className="flex justify-between py-1.5 text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-primary">
                      {(() => {
                        const config = SUBSCRIPTION_TIERS[selectedTier];
                        const price =
                          isAnnual && "annual_price" in config
                            ? config.annual_price
                            : config.price;
                        return formatPrice((price as number) * licenseCount, config.currency);
                      })()}
                      /month
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trial Option */}
            <Card
              className="cursor-pointer border-2 hover:border-primary transition-colors"
              onClick={() => !isLoading && handleSubmit(true)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-accent/10">
                    <Shield className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Start 7-Day Free Trial</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      No charge today. Your payment method will be captured during checkout.
                      Your subscription starts automatically after 7 days unless cancelled.
                    </p>
                    <Button disabled={isLoading} className="w-full sm:w-auto">
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Start Free Trial
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pay Now Option */}
            <Card
              className="cursor-pointer border-2 hover:border-primary transition-colors"
              onClick={() => !isLoading && handleSubmit(false)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Subscribe Now</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Pay immediately and get instant access. Your subscription starts today.
                    </p>
                    <Button variant="outline" disabled={isLoading} className="w-full sm:w-auto">
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Pay Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < 3 && (
            <Button
              onClick={handleNext}
              disabled={isLoading || (currentStep === 2 && !selectedTier)}
              size="lg"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          By creating an account, you agree to our{" "}
          <a href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
      </main>
    </div>
  );
}
