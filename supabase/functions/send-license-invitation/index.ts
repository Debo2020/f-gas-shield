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
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">FTrack</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">F-Gas Compliance Management</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 24px; font-weight: 600;">
                You've Been Invited!
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                ${invitedByText}<strong style="color: #18181b;">${companyName}</strong> has invited you to join their team on FTrack as a <strong style="color: #18181b;">${roleDisplay}</strong>.
              </p>
              
              <!-- Role Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 8px 16px; background-color: ${licenseType === "manager" ? "#dbeafe" : "#dcfce7"}; color: ${licenseType === "manager" ? "#1e40af" : "#166534"}; border-radius: 9999px; font-size: 14px; font-weight: 600;">
                      ${roleDisplay} License
                    </span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 32px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                FTrack helps refrigeration and HVAC companies manage F-Gas compliance, track equipment inspections, and maintain regulatory records.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${signUpUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${signUpUrl}" style="color: #0ea5e9; text-decoration: underline;">${signUpUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                This invitation was sent by ${companyName} via FTrack.<br>
                If you didn't expect this email, you can safely ignore it.
              </p>
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
      from: "FTrack <onboarding@resend.dev>",
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
