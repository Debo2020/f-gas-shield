import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TRANSFER-OWNERSHIP] ${step}${detailsStr}`);
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

    const currentOwnerId = claimsData.claims.sub as string;
    const { new_owner_id } = await req.json();

    if (!new_owner_id) {
      return new Response(JSON.stringify({ error: "Missing required field: new_owner_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new_owner_id === currentOwnerId) {
      return new Response(JSON.stringify({ error: "Cannot transfer ownership to yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is owner
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentOwnerId)
      .eq("role", "owner")
      .single();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Only the owner can transfer ownership" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current owner's company
    const { data: ownerProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", currentOwnerId)
      .single();

    if (!ownerProfile?.company_id) {
      return new Response(JSON.stringify({ error: "Owner has no company" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = ownerProfile.company_id;

    // Verify target is in same company
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("company_id, full_name")
      .eq("user_id", new_owner_id)
      .single();

    if (!targetProfile || targetProfile.company_id !== companyId) {
      return new Response(JSON.stringify({ error: "Target user is not in your company" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Transferring ownership", { from: currentOwnerId, to: new_owner_id, company: companyId });

    // Step 1: Remove owner role from current owner
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", currentOwnerId)
      .eq("role", "owner");

    // Step 2: Add manager role to former owner
    await adminClient
      .from("user_roles")
      .upsert(
        { user_id: currentOwnerId, role: "manager" },
        { onConflict: "user_id,role" }
      );

    // Step 3: Remove existing roles from new owner (they'll get owner)
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", new_owner_id)
      .in("role", ["manager", "engineer", "stores_manager", "admin"]);

    // Step 4: Assign owner role to new owner (trigger is safe - old owner already removed)
    const { error: newOwnerRoleError } = await adminClient
      .from("user_roles")
      .upsert(
        { user_id: new_owner_id, role: "owner" },
        { onConflict: "user_id,role" }
      );

    if (newOwnerRoleError) {
      // Rollback: restore original owner
      await adminClient.from("user_roles").delete().eq("user_id", currentOwnerId).eq("role", "manager");
      await adminClient.from("user_roles").upsert(
        { user_id: currentOwnerId, role: "owner" },
        { onConflict: "user_id,role" }
      );
      logStep("ERROR: Failed to assign owner role, rolled back", { error: newOwnerRoleError.message });
      return new Response(JSON.stringify({ error: "Failed to transfer ownership" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 5: Update organization_memberships
    await adminClient
      .from("organization_memberships")
      .update({ role: "manager" })
      .eq("user_id", currentOwnerId)
      .eq("org_id", companyId);

    await adminClient
      .from("organization_memberships")
      .update({ role: "owner" })
      .eq("user_id", new_owner_id)
      .eq("org_id", companyId);

    // Step 6: Update user_licenses
    await adminClient
      .from("user_licenses")
      .update({ license_type: "manager" })
      .eq("user_id", currentOwnerId)
      .eq("company_id", companyId);

    await adminClient
      .from("user_licenses")
      .update({ license_type: "owner" })
      .eq("user_id", new_owner_id)
      .eq("company_id", companyId);

    // Step 7: Log audit event
    try {
      await adminClient.rpc("log_audit_event", {
        _org_id: companyId,
        _action: "membership_updated",
        _target_table: "user_roles",
        _target_id: new_owner_id,
        _metadata: {
          action: "ownership_transferred",
          from_user: currentOwnerId,
          to_user: new_owner_id,
          to_user_name: targetProfile.full_name,
        },
      });
    } catch (auditErr) {
      logStep("WARN: Audit log failed", { error: String(auditErr) });
    }

    logStep("Ownership transferred successfully", { newOwner: new_owner_id });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStep("ERROR: Unexpected error", { error: String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
