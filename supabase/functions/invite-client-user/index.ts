import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[INVITE-CLIENT-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    const { clientId, email } = await req.json();
    if (!clientId || !email) {
      return new Response(JSON.stringify({ error: "Missing clientId or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is owner/manager in their company
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (!callerProfile?.company_id) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["owner", "manager"])
      .single();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify client belongs to caller's company
    const { data: client } = await adminClient
      .from("clients")
      .select("id, name, company_id")
      .eq("id", clientId)
      .single();

    if (!client || client.company_id !== callerProfile.company_id) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Authorization verified", { companyId: callerProfile.company_id, clientId });

    // Check for existing client_user
    const { data: existing } = await adminClient
      .from("client_users")
      .select("id, status")
      .eq("client_id", clientId)
      .eq("email", email.toLowerCase())
      .single();

    if (existing && existing.status !== "pending") {
      return new Response(JSON.stringify({ error: "This email already has access" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company name
    const { data: company } = await adminClient
      .from("companies")
      .select("name")
      .eq("id", callerProfile.company_id)
      .single();
    const companyName = company?.name || "Your service provider";

    // Get inviter name
    const { data: inviterProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();
    const inviterName = inviterProfile?.full_name || "A team administrator";

    // Create or update client_users row
    let clientUserId: string;
    if (existing) {
      // Resend scenario — reuse existing row
      clientUserId = existing.id;
      logStep("Resending invite for existing client user", { clientUserId });
    } else {
      const { data: newRow, error: insertError } = await adminClient
        .from("client_users")
        .insert({
          client_id: clientId,
          email: email.toLowerCase(),
          status: "pending",
          invited_by: userId,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      clientUserId = newRow.id;
      logStep("Client user row created", { clientUserId });
    }

    // Create auth user if needed
    const { data: linkCheck, error: linkCheckError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
    });
    const userExists = !linkCheckError && !!linkCheck?.user?.id;

    if (!userExists) {
      const { error: createUserError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: false,
        user_metadata: {
          full_name: email.split("@")[0],
          invited_as_client_user: true,
          client_id: clientId,
        },
      });

      if (createUserError && !createUserError.message.includes("already been registered")) {
        logStep("WARN: Failed to create auth user", { error: createUserError.message });
      } else {
        logStep("Auth user created or exists");
      }
    }

    // Generate magic link
    const appUrl = Deno.env.get("APP_URL") || "https://ftrack.lovable.app";
    const acceptUrl = `${appUrl}/set-password?client_invite=${clientUserId}`;

    const { data: magicLinkData, error: magicLinkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
      options: { redirectTo: acceptUrl },
    });

    let actionUrl = acceptUrl;
    if (magicLinkData?.properties?.action_link) {
      actionUrl = magicLinkData.properties.action_link;
      logStep("Magic link generated");
    } else if (magicLinkError) {
      logStep("WARN: Magic link failed, using direct URL", { error: magicLinkError.message });
    }

    // Send branded invitation email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const inviteeName = email.split("@")[0];

    const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Client Portal Invitation</title></head><body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background-color: #18181b; padding: 32px 40px; text-align: center;"><img src="https://ftrack.lovable.app/ftrack-logo.png" alt="FTrack" width="160" height="40" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" /></td></tr><tr><td style="padding: 40px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="text-align: center; padding-bottom: 24px;"><h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">Hi ${inviteeName}, You've Been Invited!</h1></td></tr><tr><td style="padding-bottom: 24px;"><p style="margin: 0; font-size: 16px; line-height: 24px; color: #3f3f46;"><strong>${inviterName}</strong> from <strong>${companyName}</strong> has invited you to access the <strong>${client.name}</strong> client portal on FTrack.</p></td></tr><tr><td align="center" style="padding-bottom: 24px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color: #0891b2; color: #ffffff; font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">Client Portal</td></tr></table></td></tr><tr><td style="padding-bottom: 16px;"><p style="margin: 0; font-size: 16px; line-height: 24px; color: #3f3f46;">You'll be able to view your allocated sites, compliance data, and equipment inspection history. Click below to set up your account:</p></td></tr><tr><td align="center" style="padding-bottom: 32px;"><a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #18181b; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Accept Invitation</a></td></tr><tr><td style="border-top: 1px solid #e4e4e7; padding-top: 24px;"><p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">If you didn't expect this invitation, you can safely ignore this email.</p></td></tr></table></td></tr><tr><td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;"><p style="margin: 0; font-size: 12px; color: #a1a1aa;">FTrack - F-Gas Compliance Made Simple</p><p style="margin: 8px 0 0 0; font-size: 12px; color: #a1a1aa;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

    let emailSent = false;
    try {
      const emailResponse = await resend.emails.send({
        from: "FTrack <onboarding@resend.dev>",
        to: [email.toLowerCase()],
        subject: `You've been invited to the ${client.name} portal on FTrack`,
        html: emailHtml,
      });

      if (emailResponse.error) {
        logStep("ERROR: Resend error", { error: emailResponse.error });
      } else {
        emailSent = true;
        logStep("Invitation email sent", { emailId: emailResponse.data?.id });
      }
    } catch (emailError) {
      logStep("ERROR: Failed to send email", { error: String(emailError) });
    }

    // Log audit event
    try {
      await adminClient.rpc("log_audit_event", {
        _org_id: callerProfile.company_id,
        _action: "membership_created",
        _target_table: "client_users",
        _target_id: clientUserId,
        _metadata: { email: email.toLowerCase(), client_id: clientId, client_name: client.name },
      });
    } catch (auditError) {
      logStep("WARN: Audit log failed", { error: String(auditError) });
    }

    return new Response(JSON.stringify({ success: true, email_sent: emailSent, client_user_id: clientUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
