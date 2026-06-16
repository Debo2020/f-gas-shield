import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, logError } from "../_shared/cors.ts";

const log = (s: string, d?: Record<string, unknown>) =>
  console.log(`[CREATE-PARTNER-CODE] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

// Basic + Premium product IDs the discount applies to
const ELIGIBLE_PRODUCTS = ["prod_Tkr6tR0MQAMZ4S", "prod_Tkr6z4LLzOAMfG"];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    // Check owner role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "owner").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: owner role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      partner_name,
      contact_email,
      commission_pct = 0,
      notes,
      code,
      max_redemptions,
      expires_at,
    } = body;

    if (!partner_name || !code) {
      return new Response(JSON.stringify({ error: "partner_name and code are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalisedCode = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normalisedCode.length < 3 || normalisedCode.length > 30) {
      return new Response(JSON.stringify({ error: "Code must be 3-30 alphanumeric chars" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Create coupon (20% off, 3 months)
    const coupon = await stripe.coupons.create({
      percent_off: 20,
      duration: "repeating",
      duration_in_months: 3,
      name: `${partner_name} - 20% off 3mo`,
      applies_to: { products: ELIGIBLE_PRODUCTS },
      metadata: { partner_name },
    });
    log("Coupon created", { id: coupon.id });

    // Create promotion code
    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: coupon.id,
      code: normalisedCode,
      metadata: { partner_name },
    };
    if (max_redemptions && max_redemptions > 0) promoParams.max_redemptions = max_redemptions;
    if (expires_at) promoParams.expires_at = Math.floor(new Date(expires_at).getTime() / 1000);

    const promo = await stripe.promotionCodes.create(promoParams);
    log("Promotion code created", { id: promo.id, code: promo.code });

    // Persist partner + code
    const { data: partner, error: partnerErr } = await admin
      .from("partners")
      .insert({
        name: partner_name,
        contact_email,
        commission_pct,
        notes,
        created_by: userId,
      })
      .select()
      .single();
    if (partnerErr) throw partnerErr;

    const { data: pCode, error: codeErr } = await admin
      .from("partner_codes")
      .insert({
        partner_id: partner.id,
        code: normalisedCode,
        stripe_coupon_id: coupon.id,
        stripe_promotion_code_id: promo.id,
        max_redemptions: max_redemptions || null,
        expires_at: expires_at || null,
      })
      .select()
      .single();
    if (codeErr) throw codeErr;

    return new Response(JSON.stringify({ partner, code: pCode }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logError("create-partner-code", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
