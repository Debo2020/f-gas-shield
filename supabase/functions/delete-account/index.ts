import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[DELETE-ACCOUNT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    // Get profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, company_id, email")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user is NOT an owner (owners must transfer ownership first)
    const { data: ownerRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle();

    if (ownerRole) {
      return new Response(JSON.stringify({ error: "Account owners must transfer ownership before deleting their account." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = profile.company_id;
    logStep("Deleting user data", { userId, companyId });

    // Delete in order: dependent tables first
    // 1. Documents (+ storage files)
    if (companyId) {
      const { data: docs } = await adminClient
        .from("documents")
        .select("id, file_url, bucket_id")
        .or(`uploaded_by.eq.${userId},profile_id.eq.${profile.id}`);

      if (docs && docs.length > 0) {
        for (const doc of docs) {
          if (doc.bucket_id && doc.file_url) {
            try {
              const path = doc.file_url.split("/").slice(-2).join("/");
              await adminClient.storage.from(doc.bucket_id).remove([path]);
            } catch (e) {
              logStep("WARN: Failed to delete storage file", { docId: doc.id, error: String(e) });
            }
          }
        }
        await adminClient
          .from("documents")
          .delete()
          .or(`uploaded_by.eq.${userId},profile_id.eq.${profile.id}`);
      }

      // 2. Gas certificates
      await adminClient.from("gas_certificates").delete().eq("engineer_id", userId);

      // 3. Inspections
      await adminClient.from("inspections").delete().eq("inspector_id", userId);

      // 4. Refrigerant movements
      await adminClient.from("refrigerant_movements").delete().eq("engineer_id", userId);

      // 5. User licenses
      await adminClient.from("user_licenses").delete().eq("user_id", userId);

      // 6. Addon licenses
      await adminClient.from("addon_licenses").delete().eq("user_id", userId);

      // 7. Organization memberships
      await adminClient.from("organization_memberships").delete().eq("user_id", userId);

      // 8. Qualifications
      await adminClient.from("qualifications").delete().eq("user_id", userId);

      // 9. Leak checks
      await adminClient.from("leak_checks").delete().eq("checked_by", userId);
    }

    // 10. User roles
    await adminClient.from("user_roles").delete().eq("user_id", userId);

    // 11. Log audit event before deleting profile
    if (companyId) {
      try {
        await adminClient.rpc("log_audit_event", {
          _org_id: companyId,
          _action: "membership_deleted",
          _target_table: "profiles",
          _target_id: profile.id,
          _metadata: { email: profile.email, reason: "account_deletion_gdpr" },
        });
      } catch (e) {
        logStep("WARN: Audit log failed", { error: String(e) });
      }
    }

    // 12. Delete profile
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // 13. Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      logStep("ERROR: Failed to delete auth user", { error: deleteError.message });
      return new Response(JSON.stringify({ error: "Failed to delete authentication account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Account deleted successfully", { userId });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
