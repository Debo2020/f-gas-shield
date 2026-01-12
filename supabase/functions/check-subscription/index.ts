import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Safely convert a Stripe timestamp to ISO string
const safeTimestampToISO = (timestamp: unknown): string | null => {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }
  // Stripe timestamps are unix seconds (number)
  if (typeof timestamp === "number" && !isNaN(timestamp) && timestamp > 0) {
    try {
      return new Date(timestamp * 1000).toISOString();
    } catch {
      return null;
    }
  }
  // Sometimes could be a string
  if (typeof timestamp === "string") {
    const parsed = parseInt(timestamp, 10);
    if (!isNaN(parsed) && parsed > 0) {
      try {
        return new Date(parsed * 1000).toISOString();
      } catch {
        return null;
      }
    }
  }
  return null;
};

// Safely extract product ID from subscription item
const safeGetProductId = (subscriptionItem: unknown): string | null => {
  if (!subscriptionItem || typeof subscriptionItem !== "object") return null;
  const item = subscriptionItem as Record<string, unknown>;
  const price = item.price;
  if (!price || typeof price !== "object") return null;
  const priceObj = price as Record<string, unknown>;
  const product = priceObj.product;
  // Product can be a string ID or an expanded object with an id property
  if (typeof product === "string") return product;
  if (product && typeof product === "object" && "id" in product) {
    return (product as { id: string }).id;
  }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Authorization header found");

    // Create client with anon key for getClaims validation
    const supabaseAnonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAnonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      logStep("JWT validation failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;
    if (!userEmail) throw new Error("User email not available in claims");
    logStep("User authenticated via getClaims", { userId, email: userEmail });

    // Create service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user's company ID from profile
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();
    
    const companyId = profileData?.company_id;
    logStep("Company ID retrieved", { companyId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        license_count: 0,
        licenses_used: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let currentPeriodStart: string | null = null;
    let licenseCount = 0;
    let licensesUsed = 0;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      
      // Log raw values for debugging
      logStep("Raw subscription data", {
        current_period_end: subscription.current_period_end,
        current_period_end_type: typeof subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        current_period_start_type: typeof subscription.current_period_start,
        items_count: subscription.items?.data?.length,
      });

      // Safely convert timestamps
      subscriptionEnd = safeTimestampToISO(subscription.current_period_end);
      currentPeriodStart = safeTimestampToISO(subscription.current_period_start);
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        startDate: currentPeriodStart,
      });
      
      // Safely get product ID and quantity
      const firstItem = subscription.items?.data?.[0];
      if (!firstItem) {
        logStep("Warning: Subscription has no items", { subscriptionId: subscription.id });
        productId = null;
        licenseCount = 1; // Default to 1 license if no items
      } else {
        productId = safeGetProductId(firstItem);
        licenseCount = firstItem.quantity || 1;
        logStep("Subscription details", { productId, licenseCount, itemId: firstItem.id });
      }

      // Get licenses used from database
      if (companyId) {
        const { count } = await supabaseClient
          .from("user_licenses")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["active", "pending"]);
        
        licensesUsed = count || 0;
        logStep("Licenses used count", { licensesUsed });

        // Sync subscription data to database (even with null dates)
        const upsertData: Record<string, unknown> = {
          company_id: companyId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          tier: subscription.metadata?.tier || "basic",
          license_count: licenseCount,
          status: subscription.status,
        };
        
        // Only include dates if they're valid
        if (currentPeriodStart) {
          upsertData.current_period_start = currentPeriodStart;
        }
        if (subscriptionEnd) {
          upsertData.current_period_end = subscriptionEnd;
        }

        const { error: upsertError } = await supabaseClient
          .from("company_subscriptions")
          .upsert(upsertData, {
            onConflict: "company_id",
          });
        
        if (upsertError) {
          logStep("Warning: Failed to sync subscription", { error: upsertError.message });
        } else {
          logStep("Subscription synced to database");
        }
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      license_count: licenseCount,
      licenses_used: licensesUsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
