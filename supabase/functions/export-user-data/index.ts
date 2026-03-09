import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[EXPORT-USER-DATA] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Collect all user data
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const { data: inspections } = await adminClient
      .from("inspections")
      .select("*")
      .eq("inspector_id", userId);

    const { data: movements } = await adminClient
      .from("refrigerant_movements")
      .select("*")
      .eq("engineer_id", userId);

    const { data: certificates } = await adminClient
      .from("gas_certificates")
      .select("id, certificate_number, certificate_type, status, inspection_date, customer_name, job_address")
      .eq("engineer_id", userId);

    const { data: documents } = await adminClient
      .from("documents")
      .select("id, name, document_type, created_at, file_size, mime_type")
      .or(`uploaded_by.eq.${userId},profile_id.eq.${profile?.id || "00000000-0000-0000-0000-000000000000"}`);

    const { data: qualifications } = await adminClient
      .from("qualifications")
      .select("*")
      .eq("user_id", userId);

    const { data: licenses } = await adminClient
      .from("user_licenses")
      .select("id, status, license_type, assigned_at")
      .eq("user_id", userId);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile || null,
      roles: roles?.map((r) => r.role) || [],
      licenses: licenses || [],
      inspections: inspections || [],
      refrigerant_movements: movements || [],
      gas_certificates: certificates || [],
      documents_metadata: documents || [],
      qualifications: qualifications || [],
    };

    logStep("Export complete", {
      inspections: inspections?.length || 0,
      movements: movements?.length || 0,
      certificates: certificates?.length || 0,
    });

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ftrack-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
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
