import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-ADDON-LICENSE-COUNT] ${step}${detailsStr}`);
};

const ADDON_PRODUCTS: Record<string, string> = {
  natural_gas: "prod_U66CcCxINGyl6y",
  client_portal: "prod_U7FoTWg9bH1Tr8",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAnonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

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
    logStep("User authenticated", { userId, email: userEmail });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user's company
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (!profileData?.company_id) throw new Error("User has no company");
    const companyId = profileData.company_id;
    logStep("Company found", { companyId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const results: Record<string, number> = {};

    // Process each addon type
    for (const [addonType, productId] of Object.entries(ADDON_PRODUCTS)) {
      // Count active addon licenses for this type
      const { count: addonLicenseCount } = await supabaseAdmin
        .from("addon_licenses")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("addon_type", addonType)
        .eq("status", "active");

      const newQuantity = addonLicenseCount || 0;
      results[addonType] = newQuantity;
      logStep(`Active ${addonType} addon licenses counted`, { newQuantity });

      // Get addon record for Stripe subscription ID
      const { data: addonRecord } = await supabaseAdmin
        .from("company_addons")
        .select("stripe_subscription_id")
        .eq("company_id", companyId)
        .eq("addon_type", addonType)
        .single();

      let stripeSubscriptionId = addonRecord?.stripe_subscription_id;

      // If no subscription ID in DB, find it from Stripe
      if (!stripeSubscriptionId) {
        logStep(`No ${addonType} addon subscription in DB, searching Stripe`, { email: userEmail });

        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length === 0) {
          logStep(`No Stripe customer found, skipping ${addonType}`);
          continue;
        }

        const customerId = customers.data[0].id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 10,
        });

        for (const sub of subscriptions.data) {
          for (const item of sub.items.data) {
            if (item.price.product === productId) {
              stripeSubscriptionId = sub.id;
              break;
            }
          }
          if (stripeSubscriptionId) break;
        }

        if (!stripeSubscriptionId) {
          logStep(`No active ${addonType} addon subscription found in Stripe, skipping`);
          continue;
        }
        logStep(`Found ${addonType} addon subscription in Stripe`, { subscriptionId: stripeSubscriptionId });
      }

      // Get subscription item for the product
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      let subscriptionItemId: string | null = null;

      for (const item of stripeSubscription.items.data) {
        if (item.price.product === productId) {
          subscriptionItemId = item.id;
          break;
        }
      }

      if (!subscriptionItemId) {
        logStep(`${addonType} product not found in subscription items, skipping`);
        continue;
      }

      logStep(`Updating Stripe quantity for ${addonType}`, { subscriptionItemId, newQuantity: Math.max(newQuantity, 1) });

      // Update quantity (minimum 1 to keep subscription active)
      await stripe.subscriptions.update(stripeSubscriptionId, {
        items: [{
          id: subscriptionItemId,
          quantity: Math.max(newQuantity, 1),
        }],
        proration_behavior: "always_invoice",
      });

      logStep(`Stripe subscription updated for ${addonType}`);
    }

    return new Response(JSON.stringify({
      success: true,
      addon_license_counts: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
