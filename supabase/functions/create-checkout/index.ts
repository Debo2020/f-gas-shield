import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
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
    logStep("User authenticated via getClaims", { userId });
    
    const { priceId, quantity = 1, companyName, tier, trial = false } = await req.json();
    if (!priceId) throw new Error("Price ID is required");
    logStep("Request received", { priceId, quantity, companyName, tier, trial });

    // Overage price IDs for metered AI credits billing
    const OVERAGE_PRICES: Record<string, string> = {
      basic: "price_1SpoFQF9KjzL48NkD2Sd2SCv",
      premium: "price_1SpoHNF9KjzL48Nk0IHKeD8O",
    };

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Build line items - base subscription + metered overage price (if applicable)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: priceId,
        quantity: quantity,
      },
    ];

    // Add metered overage price for basic and premium tiers (monthly billing only)
    // Annual subscriptions can't mix with monthly metered prices - Stripe limitation
    const tierLower = tier?.toLowerCase();
    const ANNUAL_PRICE_IDS = [
      "price_1SnLZ9F9KjzL48Nkwq1dmZOH", // basic annual
      "price_1SnLZZF9KjzL48Nk6IJW7XR9", // premium annual
    ];
    const isAnnualBilling = ANNUAL_PRICE_IDS.includes(priceId);
    
    if (tierLower && OVERAGE_PRICES[tierLower] && !isAnnualBilling) {
      lineItems.push({
        price: OVERAGE_PRICES[tierLower],
        // No quantity for metered prices - Stripe handles this via meter events
      });
      logStep("Added metered overage price", { tier: tierLower, overagePrice: OVERAGE_PRICES[tierLower] });
    } else if (isAnnualBilling) {
      logStep("Skipping overage price for annual billing", { tier: tierLower, priceId });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    const subscriptionData: Record<string, unknown> = {
      metadata: {
        user_id: userId,
        company_name: companyName || "",
        tier: tier || "",
        license_count: quantity.toString(),
      },
    };

    // Add trial period if requested
    if (trial) {
      subscriptionData.trial_period_days = 7;
      logStep("Trial enabled", { trial_period_days: 7 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/pricing?subscription=cancelled`,
      metadata: {
        user_id: userId,
        company_name: companyName || "",
        tier: tier || "",
        license_count: quantity.toString(),
      },
      subscription_data: subscriptionData as Stripe.Checkout.SessionCreateParams.SubscriptionData,
    });

    logStep("Checkout session created", { sessionId: session.id, quantity });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
