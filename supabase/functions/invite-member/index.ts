import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[INVITE-MEMBER] ${step}${detailsStr}`);
};

const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case "owner": return "#9333ea";
    case "admin": return "#2563eb";
    case "manager": return "#0891b2";
    case "stores_manager": return "#f97316";
    case "engineer": return "#059669";
    case "auditor": return "#d97706";
    case "read_only": return "#6b7280";
    default: return "#6b7280";
  }
};

const formatRole = (role: string): string => {
  return role.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("ERROR: No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("ERROR: Authentication failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    const { org_id, email, role, full_name, phone } = await req.json();

    if (!org_id || !email || !role) {
      logStep("ERROR: Missing required fields", { org_id, email, role });
      return new Response(JSON.stringify({ error: "Missing required fields: org_id, email, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is admin in org
    const { data: membership, error: membershipError } = await adminClient
      .from("organization_memberships")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", userId)
      .single();

    // Also check legacy user_roles table as fallback
    let isAdmin = membership && ["owner", "admin"].includes(membership.role);
    
    if (!isAdmin) {
      // Check legacy company-based permissions
      const { data: profile } = await adminClient
        .from("profiles")
        .select("company_id")
        .eq("user_id", userId)
        .single();

      if (profile?.company_id === org_id) {
        const { data: legacyRole } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["owner", "manager"])
          .single();

        isAdmin = !!legacyRole;
      }
    }

    if (!isAdmin) {
      logStep("ERROR: Insufficient permissions", { userId, org_id });
      return new Response(JSON.stringify({ error: "Insufficient permissions. Owner or Admin role required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Authorization verified", { role: membership?.role });

    // Validate role is a valid app_role
    const validRoles = ["owner", "manager", "stores_manager", "engineer", "admin", "auditor", "read_only"];
    if (!validRoles.includes(role)) {
      logStep("ERROR: Invalid role", { role });
      return new Response(JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if invitation already exists
    const { data: existingInvite } = await adminClient
      .from("team_invitations")
      .select("id, accepted_at")
      .eq("company_id", org_id)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .single();

    if (existingInvite) {
      logStep("WARN: Pending invitation exists", { email });
      return new Response(JSON.stringify({ error: "A pending invitation already exists for this email" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company name for the email
    const { data: company } = await adminClient
      .from("companies")
      .select("name")
      .eq("id", org_id)
      .single();

    const companyName = company?.name || "Your Organization";

    // Get inviter's name
    const { data: inviterProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();

    const inviterName = inviterProfile?.full_name || "A team administrator";

    // Create invitation record first
    const { data: invitation, error: inviteError } = await adminClient
      .from("team_invitations")
      .insert({
        company_id: org_id,
        email: email.toLowerCase(),
        role,
        invited_by: userId,
      })
      .select()
      .single();

    if (inviteError) {
      logStep("ERROR: Failed to create invitation", { error: inviteError.message });
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Invitation created", { invitationId: invitation.id, email, role });

    // Get the app URL for redirect
    const appUrl = Deno.env.get("APP_URL") || "https://ftrack.lovable.app";
    const acceptUrl = `${appUrl}/set-password?token=${invitation.token}`;

    // Create user in auth system (without sending default email)
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!userExists) {
      // Create new user with a random password (they'll set their own via magic link)
      const { error: createUserError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: false,
        user_metadata: {
          full_name: full_name || email.split("@")[0],
          phone: phone || null,
          invited_to_company: org_id,
          invited_role: role,
          invitation_token: invitation.token,
        }
      });

      if (createUserError && !createUserError.message.includes("already been registered")) {
        logStep("WARN: Failed to create auth user", { error: createUserError.message });
      } else {
        logStep("Auth user created or exists", { full_name, phone });
      }
    }

    // Generate magic link for the user
    const { data: magicLinkData, error: magicLinkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
      options: {
        redirectTo: acceptUrl,
      }
    });

    let actionUrl = acceptUrl;
    if (magicLinkData?.properties?.action_link) {
      actionUrl = magicLinkData.properties.action_link;
      logStep("Magic link generated");
    } else if (magicLinkError) {
      logStep("WARN: Failed to generate magic link, using direct URL", { error: magicLinkError.message });
    }

    // Send branded invitation email via Resend
    const roleBadgeColor = getRoleBadgeColor(role);
    const formattedRole = formatRole(role);
    const inviteeName = full_name ? full_name.split(" ")[0] : "there";

    const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>You've Been Invited!</title><!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--></head><body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background-color: #18181b; padding: 32px 40px; text-align: center;"><img src="https://ftrack.lovable.app/ftrack-logo.png" alt="FTrack" width="160" height="40" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" /></td></tr><tr><td style="padding: 40px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="text-align: center; padding-bottom: 24px;"><h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">Hi ${inviteeName}, You've Been Invited!</h1></td></tr><tr><td style="padding-bottom: 24px;"><p style="margin: 0; font-size: 16px; line-height: 24px; color: #3f3f46;"><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on FTrack, the F-Gas compliance management platform.</p></td></tr><tr><td align="center" style="padding-bottom: 24px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color: ${roleBadgeColor}; color: #ffffff; font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">${formattedRole}</td></tr></table></td></tr><tr><td style="padding-bottom: 32px;"><p style="margin: 0; font-size: 16px; line-height: 24px; color: #3f3f46;">Click the button below to accept your invitation and set up your account. This link will expire in 7 days.</p></td></tr><tr><td align="center" style="padding-bottom: 32px;"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#18181b"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Accept Invitation</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #18181b; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Accept Invitation</a><!--<![endif]--></td></tr><tr><td style="border-top: 1px solid #e4e4e7; padding-top: 24px;"><p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">If you didn't expect this invitation, you can safely ignore this email.</p></td></tr></table></td></tr><tr><td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;"><p style="margin: 0; font-size: 12px; color: #a1a1aa;">FTrack - F-Gas Compliance Made Simple</p><p style="margin: 8px 0 0 0; font-size: 12px; color: #a1a1aa;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

    try {
      const emailResponse = await resend.emails.send({
        from: "FTrack <onboarding@resend.dev>",
        to: [email.toLowerCase()],
        subject: `You've been invited to join ${companyName} on FTrack`,
        html: emailHtml,
      });

      logStep("Invitation email sent via Resend", { emailId: emailResponse?.data?.id });
    } catch (emailError) {
      logStep("ERROR: Failed to send invitation email", { error: String(emailError) });
      // Don't fail the entire request - the invitation is created, just email failed
    }

    // Log audit event
    try {
      await adminClient.rpc("log_audit_event", {
        _org_id: org_id,
        _action: "membership_created",
        _target_table: "team_invitations",
        _target_id: invitation.id,
        _metadata: { email, role, invited_by: userId },
      });
      logStep("Audit event logged");
    } catch (auditError) {
      logStep("WARN: Failed to log audit event", { error: String(auditError) });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        token: invitation.token,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStep("ERROR: Unexpected error", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
