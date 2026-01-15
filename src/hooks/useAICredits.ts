import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/subscription";

interface AICreditsState {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  isUnlimited: boolean;
  loading: boolean;
  error: string | null;
  // Overage billing fields
  overageCredits: number;
  overageRate: number; // in pence
  estimatedOverageCost: number; // in pence
  isInOverage: boolean;
  tier: SubscriptionTier;
}

export function useAICredits() {
  const [state, setState] = useState<AICreditsState>({
    used: 0,
    limit: 50,
    remaining: 50,
    percentUsed: 0,
    isUnlimited: false,
    loading: true,
    error: null,
    overageCredits: 0,
    overageRate: 10,
    estimatedOverageCost: 0,
    isInOverage: false,
    tier: "basic",
  });

  const fetchCredits = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get subscription tier
      const { data: subscription } = await supabase
        .from("company_subscriptions")
        .select("tier")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      const tier = (subscription?.tier || "basic") as SubscriptionTier;
      const tierConfig = SUBSCRIPTION_TIERS[tier];
      const limit = tierConfig?.limits?.ai_credits_monthly ?? 50;
      const isUnlimited = limit === -1;
      const overageRate = tierConfig?.ai_credit_overage_rate ?? 10;

      // Get this month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error: countError } = await supabase
        .from("ai_credit_usage")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .gte("created_at", startOfMonth.toISOString());

      if (countError) {
        console.error("Failed to fetch credit usage:", countError);
      }

      const used = count || 0;
      const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);
      const percentUsed = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
      
      // Calculate overage
      const overageCredits = isUnlimited ? 0 : Math.max(0, used - limit);
      const isInOverage = overageCredits > 0;
      const estimatedOverageCost = overageCredits * overageRate;

      setState({
        used,
        limit,
        remaining,
        percentUsed,
        isUnlimited,
        loading: false,
        error: null,
        overageCredits,
        overageRate,
        estimatedOverageCost,
        isInOverage,
        tier,
      });
    } catch (error) {
      console.error("Failed to fetch AI credits:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Failed to load credit usage",
      }));
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    ...state,
    refetch: fetchCredits,
  };
}
