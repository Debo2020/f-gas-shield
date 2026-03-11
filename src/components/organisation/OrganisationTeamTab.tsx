import { Users, UserPlus, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamMemberList, UnifiedTeamMember } from "@/components/team/TeamMemberList";
import { InviteMemberDialog, InviteMemberData } from "@/components/team/InviteMemberDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import type { EnrichedTeamMember, PendingInvitation } from "@/hooks/useTeamMembers";

interface OrganisationTeamTabProps {
  members: EnrichedTeamMember[];
  invitations: PendingInvitation[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function OrganisationTeamTab({ members, invitations, isLoading, refetch }: OrganisationTeamTabProps) {
  const { user, profile, hasRole, hasActiveLicense } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const isOwner = hasRole("owner");
  const canInvite = isOwner || hasRole("manager");
  const canInviteWithLicense = canInvite && (isOwner || hasActiveLicense);
  const canManage = isOwner || hasRole("manager");

  const handleInvite = async (data: InviteMemberData) => {
    if (!profile?.company_id || !user) return;

    const { data: result, error } = await supabase.functions.invoke("invite-member", {
      body: {
        org_id: profile.company_id,
        email: data.email.toLowerCase(),
        role: data.role,
        full_name: data.fullName,
        phone: data.phone,
        send_invite: data.sendInvite,
      },
    });

    if (error || result?.error) {
      const errorMsg = result?.error || error?.message || "Failed to add team member";
      const isDuplicate = errorMsg.includes("pending invitation already exists");
      toast.error(isDuplicate 
        ? "This person already has a pending invitation. You can resend it from the team list." 
        : errorMsg
      );
      throw new Error(errorMsg);
    }

    toast.success(
      data.sendInvite 
        ? `Invitation sent to ${data.email}` 
        : `${data.fullName} added as inactive. You can send them a login link later.`
    );
    refetch();
  };

  const handleDeleteInvitation = async (id: string) => {
    const { error } = await supabase.from("team_invitations").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete invitation");
      return;
    }
    toast.success("Invitation deleted");
    refetch();
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
    refetch();
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
    refetch();
  };

  const handleDeleteMember = async (userId: string) => {
    if (!profile?.company_id) return;

    try {
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (rolesError) throw rolesError;

      const { error: licenseError } = await supabase
        .from("user_licenses")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", profile.company_id);
      if (licenseError) throw licenseError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: null })
        .eq("user_id", userId);
      if (profileError) throw profileError;

      toast.success("Team member removed");
      refetch();
    } catch (error: any) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  // Create unified list
  const unifiedMembers: UnifiedTeamMember[] = [
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

  const existingEmails = [
    ...members.map((m) => m.email.toLowerCase()),
    ...invitations.map((i) => i.email.toLowerCase()),
  ];

  const activeCount = members.filter(m => m.licenseStatus === "active" || m.roles.includes("owner")).length;
  const pendingCount = invitations.length;

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

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {activeCount} active{pendingCount > 0 && ` · ${pendingCount} pending`}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <InviteMemberDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onInvite={handleInvite}
        existingEmails={existingEmails}
      />
    </div>
  );
}
