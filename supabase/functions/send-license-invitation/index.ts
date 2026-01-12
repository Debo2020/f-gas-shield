import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LicenseInvitationRequest {
  licenseId: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[send-license-invitation] ${step}`, details ? JSON.stringify(details) : "");
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { licenseId }: LicenseInvitationRequest = await req.json();
    logStep("Received invitation request", { licenseId });

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

    // Determine the app URL based on environment
    const appUrl = Deno.env.get("APP_URL") || "https://ftrack.lovable.app";
    const redirectUrl = `${appUrl}/accept-license?token=${token}`;

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

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
              <img src="https://ftrack.lovable.app/ftrack-logo.png" alt="FTrack" width="72" height="72" style="display: block; margin: 0 auto 16px auto;" />
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
                    <img src="https://ftrack.lovable.app/ftrack-logo.png" alt="FTrack" width="28" height="28" style="display: block; margin: 0 auto 12px auto; opacity: 0.4;" />
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
