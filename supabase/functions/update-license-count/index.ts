import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-LICENSE-COUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { newLicenseCount } = await req.json();
    if (!newLicenseCount || newLicenseCount < 1) {
      throw new Error("Invalid license count");
    }
    logStep("Request received", { newLicenseCount });

    // Create service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user's company
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();
    
    if (!profileData?.company_id) {
      throw new Error("User has no company");
    }
    const companyId = profileData.company_id;
    logStep("Company found", { companyId });

    // Check that new count isn't less than current active licenses
    const { count: activeLicenses } = await supabaseClient
      .from("user_licenses")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("status", ["active", "pending"]);

    if (newLicenseCount < (activeLicenses || 0)) {
      throw new Error(`Cannot reduce licenses below current usage (${activeLicenses} active)`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Try to get subscription from database first
    const { data: subscription } = await supabaseClient
      .from("company_subscriptions")
      .select("*")
      .eq("company_id", companyId)
      .single();

    let stripeSubscriptionId = subscription?.stripe_subscription_id;
    let stripeCustomerId = subscription?.stripe_customer_id;

    // If no subscription in DB, or missing subscription ID, try to find it from Stripe directly
    if (!stripeSubscriptionId) {
      logStep("No subscription in DB, looking up from Stripe", { email: userEmail });
      
      // Find customer by email
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length === 0) {
        throw new Error("No Stripe customer found for your email. Please ensure you have an active subscription.");
      }
      
      stripeCustomerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId: stripeCustomerId });
      
      // Find active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "active",
        limit: 1,
      });
      
      if (subscriptions.data.length === 0) {
        throw new Error("No active subscription found in Stripe. Please ensure you have an active subscription.");
      }
      
      stripeSubscriptionId = subscriptions.data[0].id;
      logStep("Found active subscription in Stripe", { subscriptionId: stripeSubscriptionId });
    }

    // Get the subscription from Stripe to get the subscription item ID
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    if (!stripeSubscription.items?.data?.[0]) {
      throw new Error("Subscription has no line items to update");
    }
    
    const subscriptionItemId = stripeSubscription.items.data[0].id;
    logStep("Got subscription item", { subscriptionItemId });

    // Update the subscription quantity
    await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [{
        id: subscriptionItemId,
        quantity: newLicenseCount,
      }],
      proration_behavior: "always_invoice",
    });

    logStep("Stripe subscription updated", { newLicenseCount });

    // Upsert to company_subscriptions to ensure it's synced
    const upsertData: Record<string, unknown> = {
      company_id: companyId,
      license_count: newLicenseCount,
      stripe_subscription_id: stripeSubscriptionId,
    };
    
    if (stripeCustomerId) {
      upsertData.stripe_customer_id = stripeCustomerId;
    }
    
    // Get additional subscription details to sync
    if (stripeSubscription.status) {
      upsertData.status = stripeSubscription.status;
    }
    if (stripeSubscription.metadata?.tier) {
      upsertData.tier = stripeSubscription.metadata.tier;
    } else if (!subscription?.tier) {
      upsertData.tier = "basic"; // Default tier
    }
    
    // Safely handle timestamps
    if (stripeSubscription.current_period_start && typeof stripeSubscription.current_period_start === "number") {
      try {
        upsertData.current_period_start = new Date(stripeSubscription.current_period_start * 1000).toISOString();
      } catch {
        // Skip if invalid
      }
    }
    if (stripeSubscription.current_period_end && typeof stripeSubscription.current_period_end === "number") {
      try {
        upsertData.current_period_end = new Date(stripeSubscription.current_period_end * 1000).toISOString();
      } catch {
        // Skip if invalid
      }
    }

    const { error: upsertError } = await supabaseClient
      .from("company_subscriptions")
      .upsert(upsertData, { onConflict: "company_id" });

    if (upsertError) {
      logStep("Warning: Failed to sync subscription to DB", { error: upsertError.message });
    } else {
      logStep("Database updated/synced");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      license_count: newLicenseCount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in update-license-count", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
