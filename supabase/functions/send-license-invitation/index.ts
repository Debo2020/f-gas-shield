import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Hosted logo URL — base64 data URIs are stripped by most email clients
const FTRACK_LOGO_URL = "https://f-gas-shield.lovable.app/ftrack-logo.png";

interface LicenseInvitationRequest {
  licenseId: string;
  origin?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[send-license-invitation] ${step}`, details ? JSON.stringify(details) : "");
};

const getRoleBadgeColor = (licenseType: string): string => {
  switch (licenseType) {
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

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication: verify caller identity ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims) {
      logStep("JWT verification failed", { claimsError });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const callerUserId = claimsData.claims.sub as string;
    logStep("Authenticated caller", { callerUserId });

    // --- Authorization: verify caller is owner or manager ---
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", callerUserId)
      .single();

    if (!callerProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: no company association" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId);

    const roleSet = new Set((callerRoles || []).map((r: { role: string }) => r.role));
    if (!roleSet.has("owner") && !roleSet.has("manager")) {
      logStep("Caller lacks required role", { roles: Array.from(roleSet) });
      return new Response(
        JSON.stringify({ error: "Forbidden: insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { licenseId, origin }: LicenseInvitationRequest = await req.json();
    logStep("Received invitation request", { licenseId, origin });

    if (!licenseId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: licenseId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch license details
    const { data: license, error: licenseError } = await adminClient
      .from("user_licenses")
      .select(`
        id, email, license_type, status, token, company_id,
        companies:company_id ( name )
      `)
      .eq("id", licenseId)
      .single();

    if (licenseError || !license) {
      logStep("License not found", { licenseError });
      return new Response(
        JSON.stringify({ error: "License not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (license.company_id !== callerProfile.company_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: license belongs to another company" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!license.email) {
      return new Response(
        JSON.stringify({ error: "License has no email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const email = license.email.toLowerCase();
    const companiesData = license.companies as unknown as { name: string } | null;
    const companyName = companiesData?.name || "Your Company";
    const licenseType = license.license_type;
    const token = license.token;

    logStep("License details fetched", { email, companyName, licenseType });

    // Determine the app URL
    const appUrl = origin || Deno.env.get("APP_URL") || "https://ftrack.lovable.app";
    // Direct link — no magic link needed
    const actionUrl = `${appUrl}/accept-license?token=${token}`;
    logStep("Using direct URL", { actionUrl });

    // Create auth user if not exists (with email pre-confirmed)
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (!existingUser) {
      logStep("Creating new auth user", { email });
      const { error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          pending_license_id: licenseId,
          invited_company_id: license.company_id,
        },
      });

      if (createError) {
        logStep("Failed to create user", { error: createError.message });
        throw new Error(`Failed to create user: ${createError.message}`);
      }
    } else {
      logStep("User already exists", { userId: existingUser.id });
    }

    const formattedRole = formatRole(licenseType);
    const roleBadgeColor = getRoleBadgeColor(licenseType);

    const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>You've Been Invited!</title><!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--></head><body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background-color: #18181b; padding: 32px 40px; text-align: center;"><img src="${FTRACK_LOGO_URL}" alt="FTrack" width="160" height="40" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" /></td></tr><tr><td style="padding: 40px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="text-align: center; padding-bottom: 24px;"><h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">You've Been Invited!</h1></td></tr><tr><td style="padding-bottom: 24px;"><p style="margin: 0; font-size: 16px; line-height: 24px; color: #3f3f46;"><strong>${companyName}</strong> has invited you to join their team on FTrack as a <strong>${formattedRole}</strong>.</p></td></tr><tr><td align="center" style="padding-bottom: 24px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color: ${roleBadgeColor}; color: #ffffff; font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">${formattedRole} License</td></tr></table></td></tr><tr><td style="padding-bottom: 32px;"><p style="margin: 0; font-size: 16px; line-height: 24px; color: #3f3f46;">Click the button below to set your password and activate your account.</p></td></tr><tr><td align="center" style="padding-bottom: 32px;"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#18181b"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Accept Invitation</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #18181b; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Accept Invitation</a><!--<![endif]--></td></tr><tr><td style="border-top: 1px solid #e4e4e7; padding-top: 24px;"><p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">If you didn't expect this invitation, you can safely ignore this email.</p><p style="margin: 12px 0 0 0; font-size: 13px; line-height: 18px; color: #a1a1aa;">If the button doesn't work, copy and paste this link:<br /><a href="${actionUrl}" style="color: #71717a; text-decoration: underline; word-break: break-all;">${actionUrl}</a></p></td></tr></table></td></tr><tr><td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;"><p style="margin: 0; font-size: 12px; color: #a1a1aa;">FTrack - F-Gas Compliance Made Simple</p><p style="margin: 8px 0 0 0; font-size: 12px; color: #a1a1aa;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

    logStep("Sending email via Resend");

    const emailResponse = await resend.emails.send({
      from: "FTrack <noreply@ftrack.uk>",
      to: [email],
      subject: `${companyName} has invited you to FTrack`,
      html: emailHtml,
    });

    logStep("Email sent successfully", { emailResponse });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-license-invitation] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
