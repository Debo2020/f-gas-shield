import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[INVITE-MEMBER] ${step}${detailsStr}`);
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
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("ERROR: Authentication failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    const { org_id, email, role } = await req.json();

    if (!org_id || !email || !role) {
      logStep("ERROR: Missing required fields", { org_id, email, role });
      return new Response(JSON.stringify({ error: "Missing required fields: org_id, email, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is admin in org
    const { data: membership, error: membershipError } = await adminClient
      .from("organization_memberships")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", userId)
      .single();

    // Also check legacy user_roles table as fallback
    let isAdmin = membership && ["owner", "admin"].includes(membership.role);
    
    if (!isAdmin) {
      // Check legacy company-based permissions
      const { data: profile } = await adminClient
        .from("profiles")
        .select("company_id")
        .eq("user_id", userId)
        .single();

      if (profile?.company_id === org_id) {
        const { data: legacyRole } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["owner", "manager"])
          .single();

        isAdmin = !!legacyRole;
      }
    }

    if (!isAdmin) {
      logStep("ERROR: Insufficient permissions", { userId, org_id });
      return new Response(JSON.stringify({ error: "Insufficient permissions. Owner or Admin role required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Authorization verified", { role: membership?.role });

    // Validate role is a valid app_role
    const validRoles = ["owner", "manager", "engineer", "admin", "auditor", "read_only"];
    if (!validRoles.includes(role)) {
      logStep("ERROR: Invalid role", { role });
      return new Response(JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if invitation already exists
    const { data: existingInvite } = await adminClient
      .from("team_invitations")
      .select("id, accepted_at")
      .eq("company_id", org_id)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .single();

    if (existingInvite) {
      logStep("WARN: Pending invitation exists", { email });
      return new Response(JSON.stringify({ error: "A pending invitation already exists for this email" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create invitation record first
    const { data: invitation, error: inviteError } = await adminClient
      .from("team_invitations")
      .insert({
        company_id: org_id,
        email: email.toLowerCase(),
        role,
        invited_by: userId,
      })
      .select()
      .single();

    if (inviteError) {
      logStep("ERROR: Failed to create invitation", { error: inviteError.message });
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Invitation created", { invitationId: invitation.id, email, role });

    // Get the app URL for redirect
    const appUrl = Deno.env.get("APP_URL") || "https://ftrack.lovable.app";
    const setPasswordUrl = `${appUrl}/set-password?token=${invitation.token}`;

    // Invite user via Supabase Auth - this creates the user and sends a magic link
    const { data: inviteAuthData, error: inviteAuthError } = await adminClient.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: setPasswordUrl,
        data: {
          invited_to_company: org_id,
          invited_role: role,
          invitation_token: invitation.token,
        }
      }
    );

    if (inviteAuthError) {
      logStep("ERROR: Failed to send auth invitation", { error: inviteAuthError.message });
      // Don't fail completely - the invitation record exists, they can still be re-invited
      // or use password reset flow
    } else {
      logStep("Auth invitation sent", { userId: inviteAuthData?.user?.id });
    }

    // Log audit event
    try {
      await adminClient.rpc("log_audit_event", {
        _org_id: org_id,
        _action: "membership_created",
        _target_table: "team_invitations",
        _target_id: invitation.id,
        _metadata: { email, role, invited_by: userId },
      });
      logStep("Audit event logged");
    } catch (auditError) {
      logStep("WARN: Failed to log audit event", { error: String(auditError) });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        token: invitation.token,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStep("ERROR: Unexpected error", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
