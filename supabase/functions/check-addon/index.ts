import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CHECK-ADDON] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = claimsData.claims.email as string;
    if (!userEmail) throw new Error("User email not available");
    logStep("User authenticated", { email: userEmail });

    // Check for addon_type in request body (optional)
    let requestedAddonType: string | null = null;
    try {
      const body = await req.json();
      requestedAddonType = body?.addon_type || null;
    } catch {
      // No body — check all addons (backward compatible)
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ has_addon: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId, status: "active", limit: 10,
    });

    const addonResults: Record<string, boolean> = {};
    const productsToCheck = requestedAddonType && ADDON_PRODUCTS[requestedAddonType]
      ? { [requestedAddonType]: ADDON_PRODUCTS[requestedAddonType] }
      : ADDON_PRODUCTS;

    for (const [addonType, productId] of Object.entries(productsToCheck)) {
      let found = false;
      for (const sub of subscriptions.data) {
        for (const item of sub.items.data) {
          if (item.price.product === productId) {
            found = true;

            // Upsert addon record
            const userId = claimsData.claims.sub;
            const { data: profile } = await supabaseAdmin
              .from("profiles").select("company_id").eq("user_id", userId).single();

            if (profile?.company_id) {
              await supabaseAdmin.from("company_addons").upsert({
                company_id: profile.company_id,
                addon_type: addonType,
                stripe_subscription_id: sub.id,
                stripe_price_id: item.price.id,
                status: "active",
                current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
                current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
              }, { onConflict: "company_id,addon_type" });
            }
            break;
          }
        }
        if (found) break;
      }
      addonResults[addonType] = found;
    }

    // Backward-compatible response
    const response: Record<string, unknown> = { ...addonResults };
    if (requestedAddonType) {
      response.has_addon = addonResults[requestedAddonType] ?? false;
    } else {
      // Default: has_addon = true if any addon is active (backward compat for natural_gas check)
      response.has_addon = addonResults.natural_gas ?? false;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
