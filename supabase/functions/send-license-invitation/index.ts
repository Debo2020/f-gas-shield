import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// FTrack logo as Base64 data URI - embedded for maximum email client compatibility
const FTRACK_LOGO_BASE64 = "data:image/png;base64,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";

interface LicenseInvitationRequest {
  licenseId: string;
  origin?: string; // Frontend origin for dynamic redirect URL
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[send-license-invitation] ${step}`, details ? JSON.stringify(details) : "");
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
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
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
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
        id,
        email,
        license_type,
        status,
        token,
        company_id,
        companies:company_id (
          name
        )
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

    // Verify the license belongs to the caller's company
    if (license.company_id !== callerProfile.company_id) {
      logStep("License does not belong to caller's company", { licenseCompany: license.company_id, callerCompany: callerProfile.company_id });
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
    // Cast companies to unknown first, then to the expected type
    const companiesData = license.companies as unknown as { name: string } | null;
    const companyName = companiesData?.name || "Your Company";
    const licenseType = license.license_type;
    const token = license.token;

    logStep("License details fetched", { email, companyName, licenseType, token });

    // Determine the app URL: use origin from frontend, fall back to APP_URL env, then default
    const appUrl = origin || Deno.env.get("APP_URL") || "https://ftrack.lovable.app";
    const redirectUrl = `${appUrl}/accept-license?token=${token}`;
    logStep("Using redirect URL", { appUrl, redirectUrl });

    // Check if user already exists using generateLink (avoids fetching all users)
    const { data: linkCheck, error: linkCheckError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email,
    });
    const existingUser = (!linkCheckError && linkCheck?.user?.id) ? linkCheck.user : null;

    let magicLinkUrl: string;

    if (existingUser) {
      logStep("User exists, generating magic link", { userId: existingUser.id });
      
      // Generate magic link for existing user
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (linkError) {
        logStep("Failed to generate magic link", { linkError });
        throw new Error(`Failed to generate magic link: ${linkError.message}`);
      }

      magicLinkUrl = linkData.properties.action_link;
    } else {
      logStep("Creating new user and generating invite link", { email });

      // Create user and generate invite link
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email: email,
        options: {
          redirectTo: redirectUrl,
          data: {
            pending_license_id: licenseId,
            invited_company_id: license.company_id,
          },
        },
      });

      if (inviteError) {
        logStep("Failed to create user invite", { inviteError });
        throw new Error(`Failed to create user invite: ${inviteError.message}`);
      }

      magicLinkUrl = inviteData.properties.action_link;
    }

    logStep("Magic link generated", { redirectUrl });

    const roleDisplay = licenseType === "manager" ? "Manager" : "Engineer";

    const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>FTrack Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #0a2540; padding: 40px 32px; text-align: center;">
              <img src="${FTRACK_LOGO_BASE64}" alt="FTrack" width="72" height="72" style="display: block; margin: 0 auto 16px auto;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">FTrack</h1>
              <p style="margin: 8px 0 0 0; color: #b0bec5; font-size: 14px; font-weight: 500;">F-Gas Compliance Management</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #0a2540; font-size: 24px; font-weight: 600;">You've Been Invited!</h2>
              
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                <strong style="color: #0a2540;">${companyName}</strong> has invited you to join their team on FTrack as a <strong style="color: #0a2540;">${roleDisplay}</strong>.
              </p>
              
              <!-- Role Badge -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 10px 20px; background-color: ${licenseType === "manager" ? "#e0f2fe" : "#dcfce7"}; color: ${licenseType === "manager" ? "#0369a1" : "#15803d"}; border-radius: 20px; font-size: 14px; font-weight: 600;">
                    ${roleDisplay} License
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                FTrack helps refrigeration and HVAC companies manage F-Gas compliance, track equipment inspections, and maintain regulatory records.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${magicLinkUrl}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="20%" strokecolor="#0284c7" fillcolor="#0ea5e9">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Accept Invitation</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${magicLinkUrl}" style="display: inline-block; padding: 16px 40px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600;">Accept Invitation</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${magicLinkUrl}" style="color: #0ea5e9; text-decoration: underline; word-break: break-all;">${magicLinkUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <img src="${FTRACK_LOGO_BASE64}" alt="FTrack" width="28" height="28" style="display: block; margin: 0 auto 12px auto; opacity: 0.4;" />
                    <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                      This invitation was sent by ${companyName} via FTrack.<br />
                      If you didn't expect this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

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