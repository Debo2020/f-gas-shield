import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/subscription";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { createCheckout } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitiated, setHasInitiated] = useState(false);

  const tier = searchParams.get("tier") as SubscriptionTier | null;
  const isAnnual = searchParams.get("annual") === "true";

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // Redirect to auth if not authenticated
    if (!user) {
      navigate(`/auth?redirect=checkout&tier=${tier}&annual=${isAnnual}`);
      return;
    }

    // Validate tier
    if (!tier || !SUBSCRIPTION_TIERS[tier]) {
      toast.error("Invalid subscription tier");
      navigate("/pricing");
      return;
    }

    // Prevent double invocation
    if (hasInitiated || isProcessing) return;

    const initiateCheckout = async () => {
      setHasInitiated(true);
      setIsProcessing(true);
      
      try {
        const config = SUBSCRIPTION_TIERS[tier];
        const priceId = isAnnual && "annual_price_id" in config 
          ? config.annual_price_id 
          : config.price_id;
        
        await createCheckout(priceId, 1, undefined, tier);
        // Note: createCheckout opens Stripe in a new tab, so user stays here
        // After a brief moment, redirect them to dashboard or show success message
      } catch (err) {
        console.error("Checkout error:", err);
        toast.error("Failed to start checkout. Please try again.");
        navigate("/pricing");
      } finally {
        setIsProcessing(false);
      }
    };

    initiateCheckout();
  }, [user, authLoading, tier, isAnnual, hasInitiated, isProcessing, navigate, createCheckout]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-8">
        <img 
          src="/favicon.png" 
          alt="FTrack Logo" 
          className="w-12 h-12 rounded-xl"
        />
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">FTrack</h1>
          <p className="text-sm text-muted-foreground">F-Gas Compliance Management</p>
        </div>
      </div>

      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-xl font-semibold">Preparing your checkout...</h2>
        <p className="text-muted-foreground">
          You'll be redirected to our secure payment page shortly.
        </p>
      </div>
    </div>
  );
}
