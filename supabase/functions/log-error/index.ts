import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cap raw body to 16KB to prevent spam/DoS via huge payloads.
    const rawBody = await req.text();
    if (rawBody.length > 16 * 1024) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { message, stack, component, url, userAgent, metadata } = parsed as {
      message?: unknown; stack?: unknown; component?: unknown;
      url?: unknown; userAgent?: unknown; metadata?: unknown;
    };

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap metadata to 1KB to prevent table bloat from oversized JSON.
    let safeMetadata: Record<string, unknown> = {};
    if (metadata && typeof metadata === "object") {
      const serialized = JSON.stringify(metadata);
      if (serialized.length <= 1024) {
        safeMetadata = metadata as Record<string, unknown>;
      } else {
        safeMetadata = { _truncated: true, _size: serialized.length };
      }
    }



    // Optionally extract user info from auth header
    let userId: string | null = null;
    let companyId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData } = await supabaseClient.auth.getClaims(token);
        if (claimsData?.claims) {
          userId = claimsData.claims.sub as string;
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("company_id")
            .eq("user_id", userId)
            .single();
          companyId = profile?.company_id || null;
        }
      } catch {
        // Non-critical — log without user context
      }
    }

    await supabaseAdmin.from("error_logs").insert({
      user_id: userId,
      company_id: companyId,
      error_message: String(message).slice(0, 2000),
      error_stack: stack ? String(stack).slice(0, 5000) : null,
      component_name: component || null,
      url: url || null,
      user_agent: userAgent || null,
      metadata: metadata || {},
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      context: "log-error",
      message: error instanceof Error ? error.message : String(error),
    }));
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
