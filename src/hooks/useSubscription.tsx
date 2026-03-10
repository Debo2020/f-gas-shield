import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTierFromProductId, SubscriptionTier } from "@/lib/subscription";
import { useAuth } from "./useAuth";

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier | null;
  subscriptionEnd: string | null;
  licenseCount: number;
  licensesUsed: number;
  loading: boolean;
  error: string | null;
  isTrialing: boolean;
  trialEnd: string | null;
  trialDaysRemaining: number;
}

// Global cache to prevent multiple simultaneous calls across component instances
let globalCache: {
  data: SubscriptionState | null;
  timestamp: number;
  pendingPromise: Promise<void> | null;
} = {
  data: null,
  timestamp: 0,
  pendingPromise: null,
};

const CACHE_TTL = 10000; // 10 seconds cache

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>(() => {
    // Initialize from cache if available and fresh
    if (globalCache.data && Date.now() - globalCache.timestamp < CACHE_TTL) {
      return globalCache.data;
    }
    return {
      subscribed: false,
      tier: null,
      subscriptionEnd: null,
      licenseCount: 0,
      licensesUsed: 0,
      loading: true,
      error: null,
      isTrialing: false,
      trialEnd: null,
      trialDaysRemaining: 0,
    };
  });
  
  const isMounted = useRef(true);

  const checkSubscription = useCallback(async (force = false) => {
    if (!user) {
      const emptyState: SubscriptionState = {
        subscribed: false,
        tier: null,
        subscriptionEnd: null,
        licenseCount: 0,
        licensesUsed: 0,
        loading: false,
        error: null,
      };
      globalCache = { data: emptyState, timestamp: Date.now(), pendingPromise: null };
      setState(emptyState);
      return;
    }

    // Check cache first (unless forced refresh)
    if (!force && globalCache.data && Date.now() - globalCache.timestamp < CACHE_TTL) {
      setState(globalCache.data);
      return;
    }

    // If there's already a pending request, wait for it
    if (globalCache.pendingPromise) {
      await globalCache.pendingPromise;
      if (globalCache.data && isMounted.current) {
        setState(globalCache.data);
      }
      return;
    }

    // Create new request
    const fetchPromise = (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (error) throw new Error(error.message);
        
        const tier = getTierFromProductId(data.product_id);
        
        const newState: SubscriptionState = {
          subscribed: data.subscribed,
          tier,
          subscriptionEnd: data.subscription_end,
          licenseCount: data.license_count || 0,
          licensesUsed: data.licenses_used || 0,
          loading: false,
          error: null,
        };
        
        globalCache = { data: newState, timestamp: Date.now(), pendingPromise: null };
        
        if (isMounted.current) {
          setState(newState);
        }
      } catch (err) {
        const errorState: SubscriptionState = {
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to check subscription",
        };
        globalCache = { data: errorState, timestamp: Date.now(), pendingPromise: null };
        
        if (isMounted.current) {
          setState(errorState);
        }
      }
    })();

    globalCache.pendingPromise = fetchPromise;
    await fetchPromise;
  }, [user]);

  useEffect(() => {
    isMounted.current = true;
    checkSubscription();
    
    return () => {
      isMounted.current = false;
    };
  }, [checkSubscription]);

  // Refresh subscription status periodically (every 60 seconds)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => checkSubscription(true), 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const createCheckout = async (priceId: string, quantity = 1, companyName?: string, tier?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, quantity, companyName, tier },
      });
      
      if (error) throw new Error(error.message);
      
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      throw err;
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw new Error(error.message);
      
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      throw err;
    }
  };

  return {
    ...state,
    checkSubscription: () => checkSubscription(true), // Force refresh when manually called
    createCheckout,
    openCustomerPortal,
  };
}
