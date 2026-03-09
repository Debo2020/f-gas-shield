import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const safeTimestampToISO = (timestamp: unknown): string | null => {
  if (typeof timestamp === "number" && !isNaN(timestamp) && timestamp > 0) {
    try { return new Date(timestamp * 1000).toISOString(); } catch { return null; }
  }
  return null;
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response("Missing signature", { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("ERROR: Signature verification failed", { error: String(err) });
      return new Response("Invalid signature", { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id, customerId: session.customer });
        // Subscription sync will happen via subscription events below
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

        if (!customerId) break;

        const tier = subscription.metadata?.tier || "basic";
        const licenseCount = subscription.items?.data?.[0]?.quantity || 1;
        const userId = subscription.metadata?.user_id;

        // Find company by stripe_customer_id or user_id metadata
        let companyId: string | null = null;

        const { data: existingSub } = await adminClient
          .from("company_subscriptions")
          .select("company_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingSub) {
          companyId = existingSub.company_id;
        } else if (userId) {
          const { data: profile } = await adminClient
            .from("profiles")
            .select("company_id")
            .eq("user_id", userId)
            .single();
          companyId = profile?.company_id || null;
        }

        if (!companyId) {
          logStep("WARN: Could not find company for subscription", { customerId, userId });
          break;
        }

        const upsertData: Record<string, unknown> = {
          company_id: companyId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          tier,
          license_count: licenseCount,
          status: subscription.status,
        };

        const periodStart = safeTimestampToISO(subscription.current_period_start);
        const periodEnd = safeTimestampToISO(subscription.current_period_end);
        if (periodStart) upsertData.current_period_start = periodStart;
        if (periodEnd) upsertData.current_period_end = periodEnd;

        // Find metered subscription item for AI credits
        const meteredItem = subscription.items?.data?.find(
          (item) => item.price?.recurring?.usage_type === "metered"
        );
        if (meteredItem) {
          upsertData.metered_subscription_item_id = meteredItem.id;
        }

        const { error } = await adminClient
          .from("company_subscriptions")
          .upsert(upsertData, { onConflict: "company_id" });

        if (error) {
          logStep("ERROR: Failed to upsert subscription", { error: error.message });
        } else {
          logStep("Subscription synced", { companyId, status: subscription.status, tier });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

        if (!customerId) break;

        const { error } = await adminClient
          .from("company_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_customer_id", customerId);

        if (error) {
          logStep("ERROR: Failed to cancel subscription", { error: error.message });
        } else {
          logStep("Subscription canceled", { customerId });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

        if (!customerId) break;

        const { error } = await adminClient
          .from("company_subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);

        if (error) {
          logStep("ERROR: Failed to update past_due status", { error: error.message });
        } else {
          logStep("Subscription marked past_due", { customerId });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR: Unexpected error", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
