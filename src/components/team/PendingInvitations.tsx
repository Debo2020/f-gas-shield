import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Mail, Trash2, UserCog, Wrench } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface PendingInvitationsProps {
  invitations: PendingInvitation[];
  isOwner: boolean;
  onDelete?: (id: string) => void;
}

export function PendingInvitations({
  invitations,
  isOwner,
  onDelete,
}: PendingInvitationsProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
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
      case "manager":
        return "secondary";
      case "engineer":
        return "outline";
      default:
        return "outline";
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => {
        const expired = isExpired(invitation.expires_at);
        
        return (
          <div
            key={invitation.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              expired ? "bg-muted/50 opacity-60" : "bg-card"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{invitation.email}</span>
                  {expired && (
                    <Badge variant="destructive" className="text-xs">
                      Expired
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {expired
                    ? `Expired ${formatDistanceToNow(new Date(invitation.expires_at))} ago`
                    : `Expires in ${formatDistanceToNow(new Date(invitation.expires_at))}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={getRoleBadgeVariant(invitation.role)} className="flex items-center gap-1">
                {getRoleIcon(invitation.role)}
                {invitation.role}
              </Badge>

              {isOwner && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(invitation.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
