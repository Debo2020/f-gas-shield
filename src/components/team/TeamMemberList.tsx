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
import { MoreVertical, Shield, UserCog, Wrench, Trash2, Package, Ban, CheckCircle } from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  roles: string[];
  licenseStatus?: "active" | "disabled" | "pending" | null;
}

interface TeamMemberListProps {
  members: TeamMember[];
  currentUserId: string;
  isOwner: boolean;
  canManage?: boolean;
  onToggleAccess?: (userId: string, enable: boolean) => void;
  onDeleteMember?: (userId: string) => void;
  /** @deprecated Use onDeleteMember instead */
  onRemoveMember?: (userId: string) => void;
}

export function TeamMemberList({
  members,
  currentUserId,
  isOwner,
  canManage = false,
  onToggleAccess,
  onDeleteMember,
  onRemoveMember,
}: TeamMemberListProps) {
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

  const getAccessStatusBadge = (status: string | null | undefined, roles: string[]) => {
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
      default:
        return <Badge variant="outline" className="text-muted-foreground">No License</Badge>;
    }
  };

  // Use onDeleteMember if provided, otherwise fall back to deprecated onRemoveMember
  const handleDelete = onDeleteMember || onRemoveMember;

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
        const hasLicense = member.licenseStatus && member.licenseStatus !== null;

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.full_name}</span>
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Roles */}
              <div className="flex gap-1">
                {member.roles.map((role) => (
                  <Badge key={role} variant={getRoleBadgeVariant(role)} className="flex items-center gap-1">
                    {getRoleIcon(role)}
                    {role}
                  </Badge>
                ))}
              </div>

              {/* Access Status */}
              {member.licenseStatus !== undefined && getAccessStatusBadge(member.licenseStatus, member.roles)}

              {/* Actions dropdown */}
              {canManageMember && (onToggleAccess || handleDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onToggleAccess && hasLicense && (
                      <>
                        {member.licenseStatus === "active" && (
                          <DropdownMenuItem onClick={() => onToggleAccess(member.user_id, false)}>
                            <Ban className="h-4 w-4 mr-2" />
                            Disable Access
                          </DropdownMenuItem>
                        )}
                        {member.licenseStatus === "disabled" && (
                          <DropdownMenuItem onClick={() => onToggleAccess(member.user_id, true)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Enable Access
                          </DropdownMenuItem>
                        )}
                        {handleDelete && <DropdownMenuSeparator />}
                      </>
                    )}
                    {handleDelete && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(member.user_id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from Team
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Legacy support: show dropdown for owners without new props */}
              {isOwner && !canManage && !isCurrentUser && onRemoveMember && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onRemoveMember(member.user_id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove from Team
                    </DropdownMenuItem>
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
