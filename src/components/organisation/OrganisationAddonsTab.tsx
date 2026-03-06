import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
  Users,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useGasAddon } from "@/hooks/useGasAddon";
import { ADDON_MODULES } from "@/lib/gas-addons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";



interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
}

interface AddonLicense {
  id: string;
  company_id: string;
  addon_type: string;
  user_id: string | null;
  email: string | null;
  status: string;
  assigned_by: string | null;
  assigned_at: string | null;
  created_at: string;
  profile?: { full_name: string; email: string } | null;
}

export function OrganisationAddonsTab() {
  const { hasRole, profile, user } = useAuth();
  const { companyHasAddon, addon } = useGasAddon();
  const queryClient = useQueryClient();

  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canManage = isOwner || isManager;
  const companyId = profile?.company_id;

  // Auto-sync addon status from Stripe when tab loads and addon appears inactive
  useEffect(() => {
    if (companyHasAddon || !canManage || !companyId) return;
    const sync = async () => {
      try {
        await supabase.functions.invoke("check-addon");
        queryClient.invalidateQueries({ queryKey: ["gas-addon"] });
      } catch {
        // Silent
      }
    };
    sync();
  }, [companyHasAddon, canManage, companyId]);

  const [addonLoading, setAddonLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<AddonLicense | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch addon licenses
  const { data: licenses = [], isLoading: licensesLoading, refetch } = useQuery({
    queryKey: ["addon-licenses", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("addon_licenses")
        .select("*")
        .eq("company_id", companyId)
        .eq("addon_type", "natural_gas")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Enrich with profile data
      const userIds = data.filter(l => l.user_id).map(l => l.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(l => ({
          ...l,
          profile: l.user_id ? profileMap.get(l.user_id) || null : null,
        })) as AddonLicense[];
      }

      return data as AddonLicense[];
    },
    enabled: !!companyId,
  });

  // Fetch team members without gas addon license
  const { data: unlicensedMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["unlicensed-gas-members", companyId, licenses],
    queryFn: async () => {
      if (!companyId) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("company_id", companyId);

      if (!profiles) return [];

      const licensedUserIds = new Set(licenses.filter(l => l.user_id).map(l => l.user_id));
      // Exclude owners from needing licenses
      const { data: ownerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "owner");
      const ownerIds = new Set(ownerRoles?.map(r => r.user_id) || []);

      return profiles.filter(
        p => !licensedUserIds.has(p.user_id) && !ownerIds.has(p.user_id)
      ) as TeamMember[];
    },
    enabled: !!companyId && companyHasAddon,
  });

  const gasModule = ADDON_MODULES.natural_gas;
  const activeCount = licenses.filter(l => l.status === "active").length;
  const disabledCount = licenses.filter(l => l.status === "disabled").length;

  const handleAssignLicense = async () => {
    if (!selectedUserId || !companyId || !user?.id) return;
    setIsSubmitting(true);
    try {
      const member = unlicensedMembers.find(m => m.user_id === selectedUserId);
      const { error } = await supabase.from("addon_licenses").insert({
        company_id: companyId,
        addon_type: "natural_gas" as any,
        user_id: selectedUserId,
        email: member?.email || null,
        status: "active",
        assigned_by: user.id,
      });
      if (error) throw error;
      toast.success(`Gas add-on license assigned to ${member?.full_name || "member"}`);
      setAssignDialogOpen(false);
      setSelectedUserId("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["addon-license"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to assign license");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLicense = async (license: AddonLicense) => {
    const newStatus = license.status === "active" ? "disabled" : "active";
    try {
      const { error } = await supabase
        .from("addon_licenses")
        .update({ status: newStatus })
        .eq("id", license.id);
      if (error) throw error;
      toast.success(`License ${newStatus === "active" ? "enabled" : "disabled"}`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["addon-license"] });
    } catch {
      toast.error("Failed to update license");
    }
  };

  const handleRevokeLicense = async () => {
    if (!selectedLicense) return;
    try {
      const { error } = await supabase
        .from("addon_licenses")
        .delete()
        .eq("id", selectedLicense.id);
      if (error) throw error;
      toast.success("License revoked");
      setRevokeConfirmOpen(false);
      setSelectedLicense(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["addon-license"] });
    } catch {
      toast.error("Failed to revoke license");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
          </Badge>
        );
      case "disabled":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" /> Disabled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (licensesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add-on Modules Sub-heading */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          Add-on Modules
        </h3>
        <p className="text-sm text-muted-foreground">
          Optional modules that can be added to your monthly subscription
        </p>
      </div>

      {/* Natural Gas Add-on Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">{gasModule.name}</CardTitle>
                <CardDescription>{gasModule.description}</CardDescription>
              </div>
            </div>
            <Badge variant={companyHasAddon ? "default" : "secondary"}>
              {companyHasAddon ? "Active" : "Not Subscribed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Features list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {gasModule.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-2xl font-bold">£{gasModule.price}</span>
            <span className="text-sm text-muted-foreground">/user/month</span>
          </div>

          {!companyHasAddon && (
            <div className="pt-2">
              <Button
                disabled={addonLoading}
                onClick={async () => {
                  setAddonLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("create-addon-checkout", {
                      body: { priceId: ADDON_MODULES.natural_gas.price_id, quantity: 1 },
                    });
                    if (error) throw error;
                    if (data?.url) window.open(data.url, "_blank");
                  } catch {
                    toast.error("Failed to start add-on checkout");
                  } finally {
                    setAddonLoading(false);
                  }
                }}
              >
                {addonLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flame className="h-4 w-4 mr-2" />}
                Subscribe to Add-on
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Management (only if subscribed) */}
      {companyHasAddon && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{licenses.length}</p>
                    <p className="text-xs text-muted-foreground">Total Licenses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{disabledCount}</p>
                    <p className="text-xs text-muted-foreground">Disabled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* License Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gas Add-on Licenses</CardTitle>
                <CardDescription>Team members with access to gas certificates</CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign License
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {licenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No gas licenses assigned yet</p>
                  {canManage && (
                    <Button variant="link" onClick={() => setAssignDialogOpen(true)} className="mt-2">
                      Assign your first gas license
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                      {canManage && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {license.profile?.full_name || license.email || "—"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {license.profile?.email || license.email || "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(license.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(license.created_at), "dd MMM yyyy")}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Switch
                                checked={license.status === "active"}
                                onCheckedChange={() => handleToggleLicense(license)}
                              />
                              {isOwner && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setSelectedLicense(license);
                                    setRevokeConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Assign License Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Gas Add-on License</DialogTitle>
            <DialogDescription>
              Select a team member to grant access to gas certificates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {unlicensedMembers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    All team members already have licenses
                  </SelectItem>
                ) : (
                  unlicensedMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name} ({member.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignLicense}
              disabled={!selectedUserId || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeConfirmOpen} onOpenChange={setRevokeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Gas License</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove gas certificate access for{" "}
              {selectedLicense?.profile?.full_name || selectedLicense?.email || "this user"}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeLicense}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke License
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
