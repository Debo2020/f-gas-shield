import { useEffect, useState } from "react";
import { Users, UserPlus, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeamMemberList } from "@/components/team/TeamMemberList";
import { PendingInvitations } from "@/components/team/PendingInvitations";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
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

      // Combine profiles with roles
      const membersWithRoles = profilesData?.map((p) => ({
        ...p,
        roles: rolesData
          ?.filter((r) => r.user_id === p.user_id)
          .map((r) => r.role) || [],
      })) || [];

      setMembers(membersWithRoles);

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

  const handleInvite = async (email: string, role: "manager" | "engineer") => {
    if (!profile?.company_id || !user) return;

    const { error } = await supabase.from("team_invitations").insert({
      company_id: profile.company_id,
      email: email.toLowerCase(),
      role,
      invited_by: user.id,
    });

    if (error) {
      toast.error(error.message || "Failed to send invitation");
      throw error;
    }

    toast.success(`Invitation sent to ${email}`);
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

  const handleRemoveMember = async (userId: string) => {
    // Remove user's roles first
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (rolesError) {
      toast.error("Failed to remove team member");
      return;
    }

    // Remove company association from profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ company_id: null })
      .eq("user_id", userId);

    if (profileError) {
      toast.error("Failed to remove team member");
      return;
    }

    toast.success("Team member removed");
    fetchTeamData();
  };

  // Get all existing emails (members + pending invitations)
  const existingEmails = [
    ...members.map((m) => m.email.toLowerCase()),
    ...invitations.map((i) => i.email.toLowerCase()),
  ];

  const pendingCount = invitations.filter(
    (i) => new Date(i.expires_at) > new Date()
  ).length;

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
              title={!canInviteWithLicense ? "License required to invite members" : undefined}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations
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
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading team members...
                  </div>
                ) : (
                  <TeamMemberList
                    members={members}
                    currentUserId={user?.id || ""}
                    isOwner={isOwner}
                    onRemoveMember={handleRemoveMember}
                  />
                )}
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
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading invitations...
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending invitations
                  </div>
                ) : (
                  <PendingInvitations
                    invitations={invitations}
                    isOwner={isOwner}
                    onDelete={handleDeleteInvitation}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
