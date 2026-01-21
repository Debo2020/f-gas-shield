import { useEffect, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeamMemberList, UnifiedTeamMember } from "@/components/team/TeamMemberList";
import { InviteMemberDialog, InviteMemberData } from "@/components/team/InviteMemberDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  roles: string[];
  licenseStatus: "active" | "disabled" | "pending" | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export default function Team() {
  const { user, profile, hasRole, hasActiveLicense } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const isOwner = hasRole("owner");
  const canInvite = isOwner || hasRole("manager");
  const canInviteWithLicense = canInvite && (isOwner || hasActiveLicense);
  const canManage = isOwner || hasRole("manager");

  const fetchTeamData = async () => {
    if (!profile?.company_id) return;

    try {
      // Fetch team members with their roles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, avatar_url")
        .eq("company_id", profile.company_id);

      if (profilesError) throw profilesError;

      // Fetch roles for each member
      const memberIds = profilesData?.map((p) => p.user_id) || [];
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", memberIds);

      if (rolesError) throw rolesError;

      // Fetch license status for each member
      const { data: licensesData, error: licensesError } = await supabase
        .from("user_licenses")
        .select("user_id, status")
        .eq("company_id", profile.company_id);

      if (licensesError) throw licensesError;

      // Combine profiles with roles and license status
      const membersWithRolesAndLicenses = profilesData?.map((p) => ({
        ...p,
        roles: rolesData?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
        licenseStatus: (licensesData?.find((l) => l.user_id === p.user_id)?.status as "active" | "disabled" | "pending") || null,
      })) || [];

      setMembers(membersWithRolesAndLicenses);

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("team_invitations")
        .select("id, email, role, expires_at, created_at")
        .eq("company_id", profile.company_id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });

      if (invitationsError) throw invitationsError;

      setInvitations(invitationsData || []);
    } catch (error: any) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [profile?.company_id]);

  const handleInvite = async (inviteData: InviteMemberData) => {
    if (!profile?.company_id || !user) return;

    const { data, error } = await supabase.functions.invoke("invite-member", {
      body: {
        org_id: profile.company_id,
        email: inviteData.email.toLowerCase(),
        role: inviteData.role,
        full_name: inviteData.fullName,
        phone: inviteData.phone,
        send_invite: inviteData.sendInvite,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to add team member");
      throw error || new Error(data?.error);
    }

    toast.success(
      inviteData.sendInvite 
        ? `Invitation sent to ${inviteData.email}` 
        : `${inviteData.fullName} added as inactive. You can send them a login link later.`
    );
    fetchTeamData();
  };

  const handleDeleteInvitation = async (id: string) => {
    const { error } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete invitation");
      return;
    }

    toast.success("Invitation deleted");
    fetchTeamData();
  };

  const handleResendInvitation = async (invitation: { id: string; email: string; role: string }) => {
    if (!profile?.company_id) return;

    // Delete old invitation first
    await supabase.from("team_invitations").delete().eq("id", invitation.id);

    // Send new invitation via edge function
    const { data, error } = await supabase.functions.invoke("invite-member", {
      body: {
        org_id: profile.company_id,
        email: invitation.email.toLowerCase(),
        role: invitation.role,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to resend invitation");
      return;
    }

    toast.success(`Invitation resent to ${invitation.email}`);
    fetchTeamData();
  };

  const handleToggleAccess = async (userId: string, enable: boolean) => {
    if (!profile?.company_id) return;

    const { error } = await supabase
      .from("user_licenses")
      .update({
        status: enable ? "active" : "disabled",
        disabled_at: enable ? null : new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("company_id", profile.company_id);

    if (error) {
      toast.error("Failed to update access");
      return;
    }

    toast.success(enable ? "Access enabled" : "Access disabled");
    fetchTeamData();
  };

  const handleDeleteMember = async (userId: string) => {
    if (!profile?.company_id) return;

    try {
      // Remove user's roles first
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (rolesError) throw rolesError;

      // Delete user license
      const { error: licenseError } = await supabase
        .from("user_licenses")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", profile.company_id);

      if (licenseError) throw licenseError;

      // Remove company association from profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: null })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast.success("Team member removed");
      fetchTeamData();
    } catch (error: any) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  // Create unified list of members and pending invitations
  const unifiedMembers: UnifiedTeamMember[] = [
    // Active team members
    ...members.map((m) => ({
      id: m.id,
      type: "member" as const,
      name: m.full_name,
      email: m.email,
      avatar_url: m.avatar_url,
      roles: m.roles,
      status: m.licenseStatus,
      user_id: m.user_id,
    })),
    // Pending invitations
    ...invitations.map((inv) => ({
      id: inv.id,
      type: "pending" as const,
      name: inv.email.split("@")[0],
      email: inv.email,
      avatar_url: null,
      roles: [inv.role],
      status: (new Date(inv.expires_at) < new Date() ? "expired" : "invited") as "expired" | "invited",
      invitation: {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expires_at: inv.expires_at,
      },
    })),
  ];

  // Get all existing emails (members + pending invitations)
  const existingEmails = [
    ...members.map((m) => m.email.toLowerCase()),
    ...invitations.map((i) => i.email.toLowerCase()),
  ];

  const activeCount = members.filter(m => m.licenseStatus === "active" || m.roles.includes("owner")).length;
  const pendingCount = invitations.length;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Team Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members and invitations
            </p>
          </div>

          {canInvite && (
            <Button 
              onClick={() => setIsInviteOpen(true)}
              disabled={!canInviteWithLicense}
              title={!canInviteWithLicense ? "License required to add members" : undefined}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {activeCount} active{pendingCount > 0 && ` · ${pendingCount} pending`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading team members...
              </div>
            ) : (
              <TeamMemberList
                members={unifiedMembers}
                currentUserId={user?.id || ""}
                isOwner={isOwner}
                canManage={canManage}
                onToggleAccess={handleToggleAccess}
                onDeleteMember={handleDeleteMember}
                onResendInvitation={handleResendInvitation}
                onDeleteInvitation={handleDeleteInvitation}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <InviteMemberDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onInvite={handleInvite}
        existingEmails={existingEmails}
      />
    </AppLayout>
  );
}
