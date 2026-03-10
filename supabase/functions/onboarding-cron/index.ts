import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ONBOARDING-CRON] ${step}${detailsStr}`);
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    logStep("WARN: RESEND_API_KEY not set, skipping email", { to, subject });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "FTrack <noreply@updates.f-gas-shield.lovable.app>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logStep("Email send failed", { to, subject, error: err });
    } else {
      logStep("Email sent", { to, subject });
    }
  } catch (err) {
    logStep("Email error", { to, subject, error: String(err) });
  }
};

serve(async (_req) => {
  try {
    logStep("Cron started");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();

    // === 1. TRIAL REMINDERS ===
    const { data: trials } = await adminClient
      .from("trial_status")
      .select("*, companies!inner(id, name)")
      .eq("status", "active");

    for (const trial of trials || []) {
      const trialEnd = new Date(trial.trial_end);
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Get the owner's email for this company
      const { data: ownerProfile } = await adminClient
        .from("profiles")
        .select("email, full_name, user_id")
        .eq("company_id", trial.company_id)
        .limit(1)
        .single();

      if (!ownerProfile) continue;

      let nudgeType: string | null = null;
      let subject = "";
      let html = "";

      if (daysRemaining === 4) {
        nudgeType = "trial_day3";
        subject = "3 days left in your free trial";
        html = `<p>Hi ${ownerProfile.full_name},</p><p>Your FTrack free trial ends in 3 days. Make sure you've set up your sites, equipment, and recorded your first inspection to get the most out of FTrack.</p><p>Your subscription will begin automatically at the end of your trial.</p>`;
      } else if (daysRemaining === 1) {
        nudgeType = "trial_day6";
        subject = "Your trial ends tomorrow";
        html = `<p>Hi ${ownerProfile.full_name},</p><p>Your FTrack free trial ends tomorrow. Your subscription will activate automatically — no action needed.</p>`;
      } else if (daysRemaining <= 0) {
        nudgeType = "trial_day7";
        subject = "Your subscription starts today";
        html = `<p>Hi ${ownerProfile.full_name},</p><p>Your free trial has ended and your FTrack subscription is now active. Thank you for choosing FTrack for your F-Gas compliance management.</p>`;
      }

      if (nudgeType) {
        // Check if already sent
        const { data: existing } = await adminClient
          .from("onboarding_nudges")
          .select("id")
          .eq("user_id", ownerProfile.user_id)
          .eq("nudge_type", nudgeType)
          .maybeSingle();

        if (!existing) {
          await sendEmail(ownerProfile.email, subject, html);
          await adminClient.from("onboarding_nudges").insert({
            company_id: trial.company_id,
            user_id: ownerProfile.user_id,
            nudge_type: nudgeType,
            delivered_via: "email",
          });
        }
      }

      // === SMART TRIAL EXTENSION ===
      if (daysRemaining <= 1 && !trial.extended) {
        const { data: score } = await adminClient
          .from("activation_scores")
          .select("total_score")
          .eq("user_id", ownerProfile.user_id)
          .maybeSingle();

        if (score && score.total_score >= 50) {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey) {
            try {
              const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

              // Find the subscription for this company
              const { data: sub } = await adminClient
                .from("company_subscriptions")
                .select("stripe_subscription_id")
                .eq("company_id", trial.company_id)
                .maybeSingle();

              if (sub?.stripe_subscription_id) {
                const newTrialEnd = new Date(trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
                await stripe.subscriptions.update(sub.stripe_subscription_id, {
                  trial_end: Math.floor(newTrialEnd.getTime() / 1000),
                });

                await adminClient
                  .from("trial_status")
                  .update({
                    trial_end: newTrialEnd.toISOString(),
                    extended: true,
                    extended_at: now.toISOString(),
                    extension_reason: "high_activation_score",
                    updated_at: now.toISOString(),
                  })
                  .eq("id", trial.id);

                await sendEmail(
                  ownerProfile.email,
                  "We've extended your trial!",
                  `<p>Hi ${ownerProfile.full_name},</p><p>We've extended your free trial by 7 days because you're actively setting up your system. Keep going!</p>`
                );

                logStep("Trial extended", { companyId: trial.company_id, newEnd: newTrialEnd.toISOString() });
              }
            } catch (err) {
              logStep("Trial extension failed", { error: String(err) });
            }
          }
        }
      }
    }

    // === 2. ONBOARDING NUDGES ===
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // Find users with low scores who signed up > 2 hours ago
    const { data: lowScoreUsers } = await adminClient
      .from("activation_scores")
      .select("user_id, company_id, total_score")
      .eq("total_score", 5)
      .lt("updated_at", twoHoursAgo);

    for (const u of lowScoreUsers || []) {
      const { data: existing } = await adminClient
        .from("onboarding_nudges")
        .select("id")
        .eq("user_id", u.user_id)
        .eq("nudge_type", "no_action_2h")
        .maybeSingle();

      if (!existing) {
        const { data: prof } = await adminClient
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", u.user_id)
          .single();

        if (prof) {
          await sendEmail(
            prof.email,
            "Your inspection system is ready",
            `<p>Hi ${prof.full_name},</p><p>Your FTrack account is set up and ready to go. Start by adding your first site and registering your F-Gas equipment.</p><p>Get started now at <a href="https://f-gas-shield.lovable.app/dashboard">your dashboard</a>.</p>`
          );
          await adminClient.from("onboarding_nudges").insert({
            company_id: u.company_id,
            user_id: u.user_id,
            nudge_type: "no_action_2h",
            delivered_via: "email",
          });
        }
      }
    }

    // Users with site but no equipment after 24h
    const { data: siteOnly } = await adminClient
      .from("onboarding_progress")
      .select("user_id, company_id")
      .eq("step_create_site", true)
      .eq("step_add_equipment", false)
      .lt("updated_at", oneDayAgo);

    for (const u of siteOnly || []) {
      const { data: existing } = await adminClient
        .from("onboarding_nudges")
        .select("id")
        .eq("user_id", u.user_id)
        .eq("nudge_type", "no_equipment_24h")
        .maybeSingle();

      if (!existing) {
        const { data: prof } = await adminClient
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", u.user_id)
          .single();

        if (prof) {
          await sendEmail(
            prof.email,
            "Add your first equipment item",
            `<p>Hi ${prof.full_name},</p><p>You've created a site — great start! Now add your first equipment item to begin tracking inspections and F-Gas compliance.</p>`
          );
          await adminClient.from("onboarding_nudges").insert({
            company_id: u.company_id,
            user_id: u.user_id,
            nudge_type: "no_equipment_24h",
            delivered_via: "email",
          });
        }
      }
    }

    // Users with equipment but no inspection after 48h
    const { data: equipOnly } = await adminClient
      .from("onboarding_progress")
      .select("user_id, company_id")
      .eq("step_add_equipment", true)
      .eq("step_first_inspection", false)
      .lt("updated_at", twoDaysAgo);

    for (const u of equipOnly || []) {
      const { data: existing } = await adminClient
        .from("onboarding_nudges")
        .select("id")
        .eq("user_id", u.user_id)
        .eq("nudge_type", "no_inspection_48h")
        .maybeSingle();

      if (!existing) {
        const { data: prof } = await adminClient
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", u.user_id)
          .single();

        if (prof) {
          await sendEmail(
            prof.email,
            "Run your first inspection",
            `<p>Hi ${prof.full_name},</p><p>Your equipment is registered and ready. Run your first inspection in under 60 seconds to start maintaining compliance records.</p>`
          );
          await adminClient.from("onboarding_nudges").insert({
            company_id: u.company_id,
            user_id: u.user_id,
            nudge_type: "no_inspection_48h",
            delivered_via: "email",
          });
        }
      }
    }

    logStep("Cron completed");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
