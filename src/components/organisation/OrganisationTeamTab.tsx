import { useEffect, useState } from "react";
import { Users, UserPlus, Mail, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMemberList } from "@/components/team/TeamMemberList";
import { PendingInvitations } from "@/components/team/PendingInvitations";
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

export function OrganisationTeamTab() {
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
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, avatar_url")
        .eq("company_id", profile.company_id);

      if (profilesError) throw profilesError;

      const memberIds = profilesData?.map((p) => p.user_id) || [];
      
      // Fetch roles
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

      const membersWithRolesAndLicenses = profilesData?.map((p) => ({
        ...p,
        roles: rolesData?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
        licenseStatus: (licensesData?.find((l) => l.user_id === p.user_id)?.status as "active" | "disabled" | "pending") || null,
      })) || [];

      setMembers(membersWithRolesAndLicenses);

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

  const handleInvite = async (data: InviteMemberData) => {
    if (!profile?.company_id || !user) return;

    const { data: result, error } = await supabase.functions.invoke("invite-member", {
      body: {
        org_id: profile.company_id,
        email: data.email.toLowerCase(),
        role: data.role,
        full_name: data.fullName,
        phone: data.phone,
      },
    });

    if (error || result?.error) {
      toast.error(result?.error || error?.message || "Failed to send invitation");
      throw error || new Error(result?.error);
    }

    toast.success(`Invitation sent to ${data.email}`);
    fetchTeamData();
  };

  const handleDeleteInvitation = async (id: string) => {
    const { error } = await supabase.from("team_invitations").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete invitation");
      return;
    }
    toast.success("Invitation deleted");
    fetchTeamData();
  };

  const handleResendInvitation = async (invitation: { id: string; email: string; role: string }) => {
    if (!profile?.company_id) return;
    await supabase.from("team_invitations").delete().eq("id", invitation.id);

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
      // 1. Delete user roles
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (rolesError) throw rolesError;

      // 2. Delete user license
      const { error: licenseError } = await supabase
        .from("user_licenses")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", profile.company_id);

      if (licenseError) throw licenseError;

      // 3. Unlink from company
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

  const existingEmails = [
    ...members.map((m) => m.email.toLowerCase()),
    ...invitations.map((i) => i.email.toLowerCase()),
  ];

  const pendingCount = invitations.filter((i) => new Date(i.expires_at) > new Date()).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your team members and their access levels
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

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Pending
            {pendingCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                People who have access to your company's FTrack account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamMemberList
                members={members}
                currentUserId={user?.id || ""}
                isOwner={isOwner}
                canManage={canManage}
                onToggleAccess={handleToggleAccess}
                onDeleteMember={handleDeleteMember}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                People who have been invited but haven't joined yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending invitations
                </div>
              ) : (
                <PendingInvitations
                  invitations={invitations}
                  isOwner={isOwner}
                  onDelete={handleDeleteInvitation}
                  onResend={handleResendInvitation}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteMemberDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onInvite={handleInvite}
        existingEmails={existingEmails}
      />
    </div>
  );
}
