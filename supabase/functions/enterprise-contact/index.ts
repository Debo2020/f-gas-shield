import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface EnterpriseContactRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  numberOfSites: number;
  numberOfEngineers: number;
  preferredCallbackTime?: string;
  integrationInterests?: string[];
  additionalNotes?: string;
}

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Simple hash for IP-based rate limiting
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Disposable email domain blocklist
const disposableDomains = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "dispostable.com", "trashmail.com", "10minutemail.com", "temp-mail.org",
]);

const callbackTimeLabels: Record<string, string> = {
  morning: "Morning (9am - 12pm)",
  afternoon: "Afternoon (12pm - 5pm)",
  evening: "Evening (5pm - 7pm)",
  any: "Any time",
};

const integrationLabels: Record<string, string> = {
  "bms-trend": "BMS - Trend",
  "bms-honeywell": "BMS - Honeywell",
  "bms-siemens": "BMS - Siemens",
  "erp-sap": "ERP - SAP",
  "erp-oracle": "ERP - Oracle",
  "erp-sage": "ERP - Sage",
  "custom-branding": "Custom Branding / White-label",
  "volume-licensing": "Volume Licensing",
};

const MAX_SUBMISSIONS_PER_HOUR = 5;

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Rate limiting ---
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIp(ip);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count } = await supabaseAdmin
      .from("contact_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if ((count || 0) >= MAX_SUBMISSIONS_PER_HOUR) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data: EnterpriseContactRequest = await req.json();

    // Validate required fields
    if (!data.companyName || !data.contactName || !data.email || !data.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Input length limits
    if (
      data.companyName.length > 200 ||
      data.contactName.length > 200 ||
      data.email.length > 255 ||
      data.phone.length > 30 ||
      (data.additionalNotes && data.additionalNotes.length > 2000)
    ) {
      return new Response(
        JSON.stringify({ error: "Input exceeds maximum length" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Reject disposable email domains
    const emailDomain = data.email.split("@")[1]?.toLowerCase();
    if (emailDomain && disposableDomains.has(emailDomain)) {
      return new Response(
        JSON.stringify({ error: "Please use a business email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Record submission for rate limiting
    await supabaseAdmin.from("contact_rate_limits").insert({ ip_hash: ipHash });

    // Escape all user inputs
    const safeData = {
      companyName: escapeHtml(data.companyName),
      contactName: escapeHtml(data.contactName),
      email: escapeHtml(data.email),
      phone: escapeHtml(data.phone),
      numberOfSites: data.numberOfSites,
      numberOfEngineers: data.numberOfEngineers,
      preferredCallbackTime: data.preferredCallbackTime ? escapeHtml(data.preferredCallbackTime) : null,
      integrationInterests: data.integrationInterests?.map(i => escapeHtml(i)) || [],
      additionalNotes: data.additionalNotes ? escapeHtml(data.additionalNotes) : null,
    };

    // Build integration interests HTML
    const integrationsHtml = safeData.integrationInterests.length > 0
      ? safeData.integrationInterests
          .map(i => `<li style="color: #374151;">✓ ${integrationLabels[i] || i}</li>`)
          .join("")
      : "<li style=\"color: #6b7280;\">None specified</li>";

    // Send notification email to sales team
    const salesEmailHtml = buildSalesEmailHtml(safeData, integrationsHtml);

    await resend.emails.send({
      from: "F-Gas Comply <noreply@ftrack.uk>",
      to: ["Darren.allison@build-iq.co.uk"],
      subject: `🏢 Enterprise Inquiry - ${safeData.companyName}`,
      html: salesEmailHtml,
    });

    // Send confirmation email to prospect
    const confirmationHtml = buildConfirmationHtml(safeData);

    await resend.emails.send({
      from: "F-Gas Comply <noreply@ftrack.uk>",
      to: [data.email],
      subject: "Thank you for your enterprise inquiry - F-Gas Comply",
      html: confirmationHtml,
    });

    console.log("Enterprise contact form submitted:", {
      company: safeData.companyName,
      sites: safeData.numberOfSites,
      engineers: safeData.numberOfEngineers,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error processing enterprise contact form:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function buildSalesEmailHtml(safeData: any, integrationsHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background-color: #0a2540; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🏢 New Enterprise Inquiry</h1>
    </div>
    <div style="padding: 24px;">
      <h2 style="color: #0a2540; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">Contact Information</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Company</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${safeData.companyName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Contact Name</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${safeData.contactName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0; color: #111827;"><a href="mailto:${safeData.email}" style="color: #2563eb;">${safeData.email}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Phone</td><td style="padding: 8px 0; color: #111827;"><a href="tel:${safeData.phone}" style="color: #2563eb;">${safeData.phone}</a></td></tr>
      </table>
      <h2 style="color: #0a2540; margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">Organisation Size</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Sites</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${safeData.numberOfSites}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Engineers</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${safeData.numberOfEngineers}</td></tr>
      </table>
      <h2 style="color: #0a2540; margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">Callback Preference</h2>
      <p style="color: #374151; margin: 8px 0;">${safeData.preferredCallbackTime ? callbackTimeLabels[safeData.preferredCallbackTime] || safeData.preferredCallbackTime : "Not specified"}</p>
      <h2 style="color: #0a2540; margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">Integration Interests</h2>
      <ul style="padding-left: 20px; margin: 8px 0;">${integrationsHtml}</ul>
      ${safeData.additionalNotes ? `<h2 style="color: #0a2540; margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">Additional Notes</h2><p style="color: #374151; margin: 8px 0; white-space: pre-wrap;">${safeData.additionalNotes}</p>` : ""}
    </div>
    <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0; font-size: 12px;">Submitted via F-Gas Comply Enterprise Contact Form</p>
    </div>
  </div>
</body>
</html>`;
}

function buildConfirmationHtml(safeData: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background-color: #0a2540; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Thank You for Your Inquiry</h1>
    </div>
    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${safeData.contactName},</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">Thank you for your interest in F-Gas Comply Enterprise. We've received your inquiry and our team will be in touch within <strong>24 business hours</strong>.</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">In the meantime, if you have any urgent questions, please don't hesitate to email us at <a href="mailto:sales@ftrack.uk" style="color: #2563eb;">sales@ftrack.uk</a>.</p>
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 14px;">What's Next?</h3>
        <ul style="color: #374151; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
          <li>Our enterprise team will review your requirements</li>
          <li>We'll prepare a tailored proposal for ${safeData.companyName}</li>
          <li>You'll receive a call at your preferred time${safeData.preferredCallbackTime ? ` (${callbackTimeLabels[safeData.preferredCallbackTime] || safeData.preferredCallbackTime})` : ""}</li>
        </ul>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">Best regards,<br><strong>The F-Gas Comply Team</strong></p>
    </div>
    <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} F-Gas Comply. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);
