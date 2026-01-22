import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Users, Loader2, Plus, MoreHorizontal, Mail, Trash2, RefreshCw, Power, PowerOff } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface ClientUser {
  id: string;
  email: string;
  status: string;
  user_id: string | null;
  created_at: string;
}

interface ClientUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onSuccess: () => void;
}

export function ClientUsersDialog({ open, onOpenChange, client, onSuccess }: ClientUsersDialogProps) {
  const { profile, user } = useAuth();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
      setShowInviteForm(false);
      setInviteEmail("");
    }
  }, [open, client.id]);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("client_users")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load users");
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !user?.id) return;

    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === inviteEmail.toLowerCase());
    if (existingUser) {
      toast.error("This email has already been invited");
      return;
    }

    setInviting(true);

    try {
      const { error } = await supabase.from("client_users").insert({
        client_id: client.id,
        email: inviteEmail.toLowerCase(),
        status: "pending",
        invited_by: user.id,
      });

      if (error) throw error;

      toast.success("User invited successfully");
      setInviteEmail("");
      setShowInviteForm(false);
      fetchUsers();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  const handleToggleStatus = async (clientUser: ClientUser) => {
    const newStatus = clientUser.status === "active" ? "disabled" : "active";
    
    const { error } = await supabase
      .from("client_users")
      .update({ status: newStatus })
      .eq("id", clientUser.id);

    if (error) {
      toast.error("Failed to update user status");
    } else {
      toast.success(`User ${newStatus === "active" ? "enabled" : "disabled"}`);
      fetchUsers();
    }
  };

  const handleResendInvite = async (clientUser: ClientUser) => {
    // For now, just show a toast - in a full implementation, 
    // you would call an edge function to resend the email
    toast.success("Invitation resent (email functionality coming soon)");
  };

  const handleDeleteUser = async (clientUser: ClientUser) => {
    if (!confirm(`Remove access for ${clientUser.email}?`)) return;

    const { error } = await supabase
      .from("client_users")
      .delete()
      .eq("id", clientUser.id);

    if (error) {
      toast.error("Failed to remove user");
    } else {
      toast.success("User removed");
      fetchUsers();
      onSuccess();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "disabled":
        return <Badge variant="secondary">Disabled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Portal Users for {client.name}</DialogTitle>
          <DialogDescription>
            Manage users who can access this client's portal to view their sites and compliance data.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {users.length === 0 && !showInviteForm ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No portal users yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Invite users to give them access to view this client's sites
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {users.map((clientUser) => (
                    <div
                      key={clientUser.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{clientUser.email}</div>
                          <div className="text-xs text-muted-foreground">
                            Invited {new Date(clientUser.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(clientUser.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {clientUser.status === "pending" && (
                              <DropdownMenuItem onClick={() => handleResendInvite(clientUser)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleToggleStatus(clientUser)}>
                              {clientUser.status === "active" ? (
                                <>
                                  <PowerOff className="h-4 w-4 mr-2" />
                                  Disable Access
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 mr-2" />
                                  Enable Access
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(clientUser)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {showInviteForm ? (
              <form onSubmit={handleInviteUser} className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="client@example.com"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInviteForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={inviting}>
                    {inviting ? "Inviting..." : "Send Invite"}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowInviteForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
