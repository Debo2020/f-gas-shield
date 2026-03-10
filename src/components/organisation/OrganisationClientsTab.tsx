import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Building2, MapPin, Users, Power, PowerOff, Upload, Download } from "lucide-react";
import { CSVBatchUploadDialog } from "@/components/batch-upload/CSVBatchUploadDialog";
import { downloadClientTemplate } from "@/lib/csv-templates";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { ClientSitesDialog } from "@/components/clients/ClientSitesDialog";
import { ClientUsersDialog } from "@/components/clients/ClientUsersDialog";

interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  site_count?: number;
  user_count?: number;
}

export function OrganisationClientsTab() {
  const { profile, hasRole } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sitesDialogOpen, setSitesDialogOpen] = useState(false);
  const [selectedClientForSites, setSelectedClientForSites] = useState<Client | null>(null);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedClientForUsers, setSelectedClientForUsers] = useState<Client | null>(null);

  const canManageClients = hasRole("owner") || hasRole("manager");
  const canDelete = hasRole("owner");

  const fetchClients = async () => {
    if (!profile?.company_id) return;

    // Fetch clients
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("name");

    if (clientsError) {
      toast.error("Failed to load clients");
      console.error(clientsError);
      setLoading(false);
      return;
    }

    // Fetch site counts per client
    const { data: siteCounts } = await supabase
      .from("sites")
      .select("client_id")
      .eq("company_id", profile.company_id)
      .not("client_id", "is", null);

    // Fetch user counts per client
    const { data: userCounts } = await supabase
      .from("client_users")
      .select("client_id");

    const siteCountMap = new Map<string, number>();
    siteCounts?.forEach((site) => {
      if (site.client_id) {
        siteCountMap.set(site.client_id, (siteCountMap.get(site.client_id) || 0) + 1);
      }
    });

    const userCountMap = new Map<string, number>();
    userCounts?.forEach((user) => {
      userCountMap.set(user.client_id, (userCountMap.get(user.client_id) || 0) + 1);
    });

    const enrichedClients = (clientsData || []).map((client) => ({
      ...client,
      site_count: siteCountMap.get(client.id) || 0,
      user_count: userCountMap.get(client.id) || 0,
    }));

    setClients(enrichedClients);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [profile?.company_id]);

  const handleOpenDialog = (client?: Client) => {
    setEditingClient(client || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    fetchClients();
  };

  const handleManageSites = (client: Client) => {
    setSelectedClientForSites(client);
    setSitesDialogOpen(true);
  };

  const handleManageUsers = (client: Client) => {
    setSelectedClientForUsers(client);
    setUsersDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Delete client "${client.name}"? This will remove all site allocations but not delete the sites themselves.`)) {
      return;
    }

    const { error } = await supabase.from("clients").delete().eq("id", client.id);

    if (error) {
      toast.error("Failed to delete client");
    } else {
      toast.success("Client deleted");
      fetchClients();
    }
  };

  const handleToggleActive = async (client: Client) => {
    const { error } = await supabase
      .from("clients")
      .update({ is_active: !client.is_active })
      .eq("id", client.id);

    if (error) {
      toast.error("Failed to update client");
    } else {
      toast.success(client.is_active ? "Client deactivated" : "Client activated");
      fetchClients();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Clients
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your client companies and their site allocations
          </p>
        </div>
        {canManageClients && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Sites</TableHead>
                <TableHead>Portal Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No clients added yet</p>
                    {canManageClients && (
                      <Button variant="link" onClick={() => handleOpenDialog()} className="mt-2">
                        Add your first client
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="font-medium">{client.name}</div>
                      {client.address && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {client.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.contact_name && <div>{client.contact_name}</div>}
                      {client.contact_email && (
                        <div className="text-sm text-muted-foreground">{client.contact_email}</div>
                      )}
                      {client.contact_phone && (
                        <div className="text-sm text-muted-foreground">{client.contact_phone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {client.site_count} sites
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {client.user_count} users
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.is_active ? "default" : "secondary"}>
                        {client.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManageClients && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(client)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageSites(client)}>
                              <MapPin className="h-4 w-4 mr-2" />
                              Manage Sites
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageUsers(client)}>
                              <Users className="h-4 w-4 mr-2" />
                              Manage Portal Users
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(client)}>
                              {client.is_active ? (
                                <>
                                  <PowerOff className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(client)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editingClient}
        onSuccess={handleCloseDialog}
      />

      {selectedClientForSites && (
        <ClientSitesDialog
          open={sitesDialogOpen}
          onOpenChange={setSitesDialogOpen}
          client={selectedClientForSites}
          onSuccess={fetchClients}
        />
      )}

      {selectedClientForUsers && (
        <ClientUsersDialog
          open={usersDialogOpen}
          onOpenChange={setUsersDialogOpen}
          client={selectedClientForUsers}
          onSuccess={fetchClients}
        />
      )}
    </div>
  );
}
