import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[COMPLIANCE-EXPORT] ${step}${detailsStr}`);
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
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("ERROR: Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    const { org_id, site_id, asset_id, format = "csv" } = await req.json();

    if (!org_id) {
      logStep("ERROR: Missing org_id");
      return new Response(JSON.stringify({ error: "org_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify membership - check both new and legacy tables
    const { data: membership } = await adminClient
      .from("organization_memberships")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", userId)
      .single();

    let isMember = !!membership;

    if (!isMember) {
      // Check legacy company-based permissions
      const { data: profile } = await adminClient
        .from("profiles")
        .select("company_id")
        .eq("user_id", userId)
        .single();

      isMember = profile?.company_id === org_id;
    }

    if (!isMember) {
      logStep("ERROR: Not a member of organization", { userId, org_id });
      return new Response(JSON.stringify({ error: "Not a member of this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Authorization verified");

    // Fetch equipment data
    let query = adminClient
      .from("equipment")
      .select(`
        id, name, asset_tag, manufacturer, model, serial_number,
        refrigerant_type, refrigerant_charge_kg, gwp, co2_equivalent_tonnes,
        last_inspection_date, next_inspection_due, inspection_frequency_months,
        is_active, installation_date, location_description,
        sites(name, address, city, postcode)
      `)
      .eq("company_id", org_id)
      .eq("is_active", true);

    if (site_id) {
      query = query.eq("site_id", site_id);
    }
    if (asset_id) {
      query = query.eq("id", asset_id);
    }

    const { data: equipment, error: equipError } = await query;

    if (equipError) {
      logStep("ERROR: Failed to fetch equipment", { error: equipError.message });
      return new Response(JSON.stringify({ error: equipError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Equipment data fetched", { count: equipment?.length || 0 });

    // Fetch company info
    const { data: company } = await adminClient
      .from("companies")
      .select("name, address")
      .eq("id", org_id)
      .single();

    // Fetch recent inspections for context
    const { data: recentInspections } = await adminClient
      .from("inspections")
      .select("equipment_id, inspection_date, result, leak_detected")
      .eq("company_id", org_id)
      .order("inspection_date", { ascending: false })
      .limit(100);

    // Create inspection lookup map
    const inspectionMap = new Map();
    recentInspections?.forEach((insp: any) => {
      if (!inspectionMap.has(insp.equipment_id)) {
        inspectionMap.set(insp.equipment_id, insp);
      }
    });

    // Generate CSV content
    const timestamp = new Date().toISOString().split("T")[0];
    const headers = [
      "Asset Tag",
      "Equipment Name",
      "Site Name",
      "Site Address",
      "Manufacturer",
      "Model",
      "Serial Number",
      "Refrigerant Type",
      "Charge (kg)",
      "GWP",
      "CO2e (tonnes)",
      "Installation Date",
      "Location Description",
      "Inspection Frequency (months)",
      "Last Inspection",
      "Next Inspection Due",
      "Last Inspection Result",
      "Last Leak Detected",
    ];

    const rows = (equipment || []).map((e: any) => {
      const lastInspection = inspectionMap.get(e.id);
      const site = e.sites as { name: string; address: string; city: string; postcode: string } | null;
      
      return [
        e.asset_tag || "",
        e.name || "",
        site?.name || "",
        [site?.address, site?.city, site?.postcode].filter(Boolean).join(", "),
        e.manufacturer || "",
        e.model || "",
        e.serial_number || "",
        e.refrigerant_type || "",
        e.refrigerant_charge_kg?.toString() || "",
        e.gwp?.toString() || "",
        e.co2_equivalent_tonnes?.toString() || "",
        e.installation_date || "",
        e.location_description || "",
        e.inspection_frequency_months?.toString() || "",
        e.last_inspection_date || "",
        e.next_inspection_due || "",
        lastInspection?.result || "",
        lastInspection?.leak_detected ? "Yes" : "No",
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",");
    });

    // Add header with company info
    const companyHeader = `# F-Gas Compliance Export\n# Company: ${company?.name || "Unknown"}\n# Generated: ${new Date().toISOString()}\n# Total Equipment: ${equipment?.length || 0}\n\n`;
    const csvContent = companyHeader + headers.join(",") + "\n" + rows.join("\n");

    const fileName = `compliance-export-${timestamp}-${Date.now()}.csv`;
    const filePath = `${org_id}/${fileName}`;

    logStep("CSV generated", { fileName, rows: rows.length });

    // Upload to storage
    const { error: uploadError } = await adminClient.storage
      .from("audit-exports")
      .upload(filePath, csvContent, {
        contentType: "text/csv",
        upsert: false,
      });

    if (uploadError) {
      logStep("ERROR: Upload failed", { error: uploadError.message });
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("File uploaded to storage", { filePath });

    // Generate signed URL (1 hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("audit-exports")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      logStep("ERROR: Failed to generate signed URL", { error: signedUrlError.message });
      return new Response(JSON.stringify({ error: signedUrlError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit event
    try {
      await adminClient.rpc("log_audit_event", {
        _org_id: org_id,
        _action: "export_generated",
        _target_table: "equipment",
        _metadata: { format, site_id, asset_id, file_path: filePath, equipment_count: equipment?.length || 0 },
      });
      logStep("Audit event logged");
    } catch (auditError) {
      logStep("WARN: Failed to log audit event", { error: String(auditError) });
    }

    logStep("Export complete", { url: signedUrlData?.signedUrl });

    return new Response(
      JSON.stringify({
        success: true,
        url: signedUrlData?.signedUrl,
        file_name: fileName,
        equipment_count: equipment?.length || 0,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logStep("ERROR: Unexpected error", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
