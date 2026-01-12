import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get user's company and subscription
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();
    
    if (!profileData?.company_id) {
      throw new Error("User has no company");
    }

    const { data: subscription } = await supabaseClient
      .from("company_subscriptions")
      .select("*")
      .eq("company_id", profileData.company_id)
      .single();

    if (!subscription?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    // Check that new count isn't less than current active licenses
    const { count: activeLicenses } = await supabaseClient
      .from("user_licenses")
      .select("*", { count: "exact", head: true })
      .eq("company_id", profileData.company_id)
      .in("status", ["active", "pending"]);

    if (newLicenseCount < (activeLicenses || 0)) {
      throw new Error(`Cannot reduce licenses below current usage (${activeLicenses} active)`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const subscriptionItemId = stripeSubscription.items.data[0].id;

    // Update the subscription quantity
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{
        id: subscriptionItemId,
        quantity: newLicenseCount,
      }],
      proration_behavior: "always_invoice",
    });

    logStep("Stripe subscription updated", { newLicenseCount });

    // Update local database
    await supabaseClient
      .from("company_subscriptions")
      .update({ license_count: newLicenseCount })
      .eq("company_id", profileData.company_id);

    logStep("Database updated");

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
