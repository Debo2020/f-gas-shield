import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { Loader2 } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { subscribed, loading: subLoading } = useSubscription();

  // Redirect authenticated users appropriately
  useEffect(() => {
    if (!authLoading && !subLoading && user) {
      if (subscribed) {
        navigate("/dashboard");
      }
      // If user is logged in but not subscribed, let them see the landing page
      // They can choose to go to onboarding from here
    }
  }, [user, subscribed, authLoading, subLoading, navigate]);

  // Show loading while checking auth status
  if (authLoading || (user && subLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        <TrustSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
      </main>
      <FooterSection />
    </div>
  );
}
