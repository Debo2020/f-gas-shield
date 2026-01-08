import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Shield, UserCog, Wrench, Trash2 } from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  roles: string[];
}

interface TeamMemberListProps {
  members: TeamMember[];
  currentUserId: string;
  isOwner: boolean;
  onRemoveMember?: (userId: string) => void;
}

export function TeamMemberList({
  members,
  currentUserId,
  isOwner,
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
      case "engineer":
        return "outline";
      default:
        return "outline";
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
      {members.map((member) => (
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
                {member.user_id === currentUserId && (
                  <Badge variant="outline" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {member.roles.map((role) => (
                <Badge key={role} variant={getRoleBadgeVariant(role)} className="flex items-center gap-1">
                  {getRoleIcon(role)}
                  {role}
                </Badge>
              ))}
            </div>

            {isOwner && member.user_id !== currentUserId && onRemoveMember && (
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
      ))}
    </div>
  );
}
