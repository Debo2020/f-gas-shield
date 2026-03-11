import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, logError } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ACCEPT-INVITATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields: token, password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate password server-side
    if (password.length < 12) {
      return new Response(JSON.stringify({ error: "Password must be at least 12 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return new Response(JSON.stringify({ error: "Password must contain uppercase, lowercase, number, and special character" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch invitation by token
    const { data: invitation, error: inviteError } = await adminClient
      .from("team_invitations")
      .select(`
        id,
        email,
        role,
        expires_at,
        accepted_at,
        company_id,
        companies:company_id (
          id,
          name
        )
      `)
      .eq("token", token)
      .maybeSingle();

    if (inviteError || !invitation) {
      logStep("ERROR: Invitation not found", { error: inviteError?.message });
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.accepted_at) {
      return new Response(JSON.stringify({ error: "This invitation has already been accepted" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This invitation has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = invitation.email.toLowerCase();
    logStep("Invitation validated", { email, role: invitation.role });

    // Find existing auth user by email
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (!existingUser) {
      logStep("ERROR: Auth user not found for email", { email });
      return new Response(JSON.stringify({ error: "Account not found. Please contact your administrator." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUserId = existingUser.id;
    logStep("Auth user found", { authUserId });

    // Set password and confirm email
    const { error: updateError } = await adminClient.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
    });

    if (updateError) {
      logStep("ERROR: Failed to update user password", { error: updateError.message });
      return new Response(JSON.stringify({ error: "Failed to set password" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Password set and email confirmed");

    const companyId = invitation.company_id;

    // Update profile with company_id
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ company_id: companyId })
      .eq("user_id", authUserId);

    if (profileError) {
      logStep("ERROR: Failed to update profile", { error: profileError.message });
      // Don't fail - password is set, user can still sign in
    }

    // Insert user_roles
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert(
        { user_id: authUserId, role: invitation.role },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      logStep("ERROR: Failed to insert role", { error: roleError.message });
    }

    // Insert organization_memberships
    const { error: membershipError } = await adminClient
      .from("organization_memberships")
      .upsert(
        { org_id: companyId, user_id: authUserId, role: invitation.role },
        { onConflict: "org_id,user_id" }
      );

    if (membershipError) {
      logStep("ERROR: Failed to insert membership", { error: membershipError.message });
    }

    // Create user_license
    const { error: licenseError } = await adminClient
      .from("user_licenses")
      .insert({
        company_id: companyId,
        user_id: authUserId,
        email,
        status: "active",
        license_type: invitation.role,
        assigned_by: invitation.company_id, // company context
      });

    if (licenseError && !licenseError.message.includes("duplicate")) {
      logStep("WARN: Failed to create license", { error: licenseError.message });
    }

    // Mark invitation as accepted
    const { error: acceptError } = await adminClient
      .from("team_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (acceptError) {
      logStep("ERROR: Failed to mark invitation accepted", { error: acceptError.message });
    }

    // Log audit event
    try {
      await adminClient.rpc("log_audit_event", {
        _org_id: companyId,
        _action: "membership_created",
        _target_table: "team_invitations",
        _target_id: invitation.id,
        _metadata: { email, role: invitation.role, accepted_via: "set-password" },
      });
    } catch (auditErr) {
      logStep("WARN: Audit log failed", { error: String(auditErr) });
    }

    logStep("Invitation accepted successfully", { email, role: invitation.role });

    return new Response(JSON.stringify({ 
      success: true, 
      email,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logError("accept-invitation", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
