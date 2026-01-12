import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LicenseInvitationRequest {
  email: string;
  licenseType: "manager" | "engineer";
  companyName: string;
  invitedByName?: string;
  appUrl?: string;
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
    const { email, licenseType, companyName, invitedByName, appUrl }: LicenseInvitationRequest = await req.json();

    logStep("Received invitation request", { email, licenseType, companyName, invitedByName });

    if (!email || !licenseType || !companyName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, licenseType, companyName" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const roleDisplay = licenseType === "manager" ? "Manager" : "Engineer";
    const invitedByText = invitedByName ? `${invitedByName} from ` : "";
    const signUpUrl = appUrl || "https://ftrack.lovable.app/auth";

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
                ${invitedByText}<strong style="color: #0a2540;">${companyName}</strong> has invited you to join their team on FTrack as a <strong style="color: #0a2540;">${roleDisplay}</strong>.
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
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${signUpUrl}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="20%" strokecolor="#0284c7" fillcolor="#0ea5e9">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Accept Invitation</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${signUpUrl}" style="display: inline-block; padding: 16px 40px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600;">Accept Invitation</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${signUpUrl}" style="color: #0ea5e9; text-decoration: underline;">${signUpUrl}</a>
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
