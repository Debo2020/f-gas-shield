import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Shield, UserCog, Wrench, Trash2, Package, Ban, CheckCircle, Mail, RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export interface UnifiedTeamMember {
  id: string;
  type: "member" | "pending";
  name: string;
  email: string;
  avatar_url: string | null;
  roles: string[];
  status: "active" | "disabled" | "pending" | "invited" | "expired" | null;
  user_id?: string;
  invitation?: {
    id: string;
    email: string;
    role: string;
    expires_at: string;
  };
}

interface TeamMemberListProps {
  members: UnifiedTeamMember[];
  currentUserId: string;
  isOwner: boolean;
  canManage?: boolean;
  onToggleAccess?: (userId: string, enable: boolean) => void;
  onDeleteMember?: (userId: string) => void;
  onResendInvitation?: (invitation: { id: string; email: string; role: string }) => Promise<void>;
  onDeleteInvitation?: (id: string) => void;
}

export function TeamMemberList({
  members,
  currentUserId,
  isOwner,
  canManage = false,
  onToggleAccess,
  onDeleteMember,
  onResendInvitation,
  onDeleteInvitation,
}: TeamMemberListProps) {
  const [resendingId, setResendingId] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Shield className="h-3 w-3" />;
      case "manager":
        return <UserCog className="h-3 w-3" />;
      case "stores_manager":
        return <Package className="h-3 w-3" />;
      case "engineer":
        return <Wrench className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "manager":
        return "secondary";
      case "stores_manager":
        return "default";
      case "engineer":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadge = (status: string | null, roles: string[]) => {
    if (roles.includes("owner")) {
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Owner</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "disabled":
        return <Badge variant="secondary">Disabled</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-500/30">Pending</Badge>;
      case "invited":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Invited</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">No License</Badge>;
    }
  };

  const handleResend = async (invitation: { id: string; email: string; role: string }) => {
    if (!onResendInvitation) return;
    setResendingId(invitation.id);
    try {
      await onResendInvitation(invitation);
    } finally {
      setResendingId(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No team members yet. Invite your first team member to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isCurrentUser = member.user_id === currentUserId;
        const isMemberOwner = member.roles.includes("owner");
        const canManageMember = canManage && !isCurrentUser && !isMemberOwner;
        const hasLicense = member.status && member.status !== null && member.type === "member";
        const isPending = member.type === "pending";
        const isResending = resendingId === member.invitation?.id;

        return (
          <div
            key={member.id}
            className={`flex items-center justify-between p-4 rounded-lg border bg-card ${
              member.status === "expired" ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              {isPending ? (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} alt={member.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{isPending ? member.email : member.name}</span>
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                {isPending && member.invitation ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {member.status === "expired"
                      ? `Expired ${formatDistanceToNow(new Date(member.invitation.expires_at))} ago`
                      : `Expires in ${formatDistanceToNow(new Date(member.invitation.expires_at))}`}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Roles */}
              <div className="flex gap-1">
                {member.roles.filter(r => r !== "owner").map((role) => (
                  <Badge key={role} variant={getRoleBadgeVariant(role)} className="flex items-center gap-1">
                    {getRoleIcon(role)}
                    {role}
                  </Badge>
                ))}
              </div>

              {/* Status */}
              {getStatusBadge(member.status, member.roles)}

              {/* Actions dropdown */}
              {canManageMember && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* For pending/invited members */}
                    {isPending && member.invitation && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => handleResend(member.invitation!)}
                          disabled={isResending}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isResending ? "animate-spin" : ""}`} />
                          {isResending ? "Sending..." : member.status === "expired" ? "Resend Invitation" : "Send Login Link"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDeleteInvitation?.(member.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancel Invitation
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* For active members */}
                    {!isPending && (
                      <>
                        {onToggleAccess && hasLicense && (
                          <>
                            {member.status === "active" && (
                              <DropdownMenuItem onClick={() => onToggleAccess(member.user_id!, false)}>
                                <Ban className="h-4 w-4 mr-2" />
                                Disable Access
                              </DropdownMenuItem>
                            )}
                            {member.status === "disabled" && (
                              <DropdownMenuItem onClick={() => onToggleAccess(member.user_id!, true)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Enable Access
                              </DropdownMenuItem>
                            )}
                            {onDeleteMember && <DropdownMenuSeparator />}
                          </>
                        )}
                        {onDeleteMember && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDeleteMember(member.user_id!)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
