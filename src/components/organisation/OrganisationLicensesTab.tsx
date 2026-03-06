import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Key,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  UserPlus,
  Plus,
  CreditCard,
  AlertCircle,
  Send,
  Building,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useLicenses, type License } from "@/hooks/useLicenses";
import { useSubscription } from "@/hooks/useSubscription";
import { useGasAddon } from "@/hooks/useGasAddon";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UnlicensedMember {
  user_id: string;
  full_name: string;
  email: string;
}

export function OrganisationLicensesTab() {
  const { hasRole, profile, user } = useAuth();
  const {
    licenses,
    stats,
    loading,
    error,
    assignLicense,
    toggleLicense,
    revokeLicense,
    updateLicenseCount,
    resendInvitation,
    refetch,
  } = useLicenses();
  const {
    subscribed,
    loading: subscriptionLoading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  } = useSubscription();
  const { companyHasAddon } = useGasAddon();

  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canManage = isOwner || isManager;

  // Gas addon licenses state
  const [gasAddonUserIds, setGasAddonUserIds] = useState<Set<string>>(new Set());
  const [gasAddonLicenseMap, setGasAddonLicenseMap] = useState<Record<string, string>>({});
  const [includeGasAddon, setIncludeGasAddon] = useState(false);
  const [togglingGas, setTogglingGas] = useState<string | null>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [addLicensesDialogOpen, setAddLicensesDialogOpen] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Form states
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignType, setAssignType] = useState<"manager" | "engineer">("engineer");
  const [addCount, setAddCount] = useState(1);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("premium");
  const [isAnnual, setIsAnnual] = useState(true);

  // Unlicensed team members
  const [unlicensedMembers, setUnlicensedMembers] = useState<UnlicensedMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const tierConfig = useMemo(() => SUBSCRIPTION_TIERS[selectedTier], [selectedTier]);

  // Fetch unlicensed team members
  useEffect(() => {
    const fetchUnlicensedMembers = async () => {
      if (!profile?.company_id) return;
      setLoadingMembers(true);

      try {
        // Get all profiles in company
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .eq("company_id", profile.company_id);

        if (profilesError) throw profilesError;

        // Get existing licenses
        const { data: existingLicenses, error: licensesError } = await supabase
          .from("user_licenses")
          .select("user_id")
          .eq("company_id", profile.company_id);

        if (licensesError) throw licensesError;

        const licensedUserIds = new Set(existingLicenses?.map((l) => l.user_id).filter(Boolean) || []);

        // Get owners (they don't need licenses)
        const { data: ownerRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "owner");

        if (rolesError) throw rolesError;

        const ownerIds = new Set(ownerRoles?.map((r) => r.user_id) || []);

        // Filter to unlicensed members (excluding owners)
        const unlicensed =
          profiles?.filter((p) => !licensedUserIds.has(p.user_id) && !ownerIds.has(p.user_id)) || [];

        setUnlicensedMembers(unlicensed);
      } catch (error) {
        console.error("Error fetching unlicensed members:", error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchUnlicensedMembers();
  }, [profile?.company_id, licenses]);

  // Fetch gas addon licenses for company
  const fetchGasAddonLicenses = useCallback(async () => {
    if (!profile?.company_id) return;
    try {
      const { data, error } = await supabase
        .from("addon_licenses")
        .select("id, user_id")
        .eq("company_id", profile.company_id)
        .eq("addon_type", "natural_gas")
        .eq("status", "active");

      if (error) throw error;

      const ids = new Set<string>();
      const map: Record<string, string> = {};
      data?.forEach((row) => {
        if (row.user_id) {
          ids.add(row.user_id);
          map[row.user_id] = row.id;
        }
      });
      setGasAddonUserIds(ids);
      setGasAddonLicenseMap(map);
    } catch (err) {
      console.error("Error fetching gas addon licenses:", err);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchGasAddonLicenses();
  }, [fetchGasAddonLicenses, licenses]);

  const handleToggleGasAddon = async (license: License, checked: boolean) => {
    if (!profile?.company_id || !license.user_id) return;
    setTogglingGas(license.id);
    try {
    if (checked) {
        const { error } = await supabase.from("addon_licenses").insert({
          company_id: profile.company_id,
          addon_type: "natural_gas" as any,
          user_id: license.user_id,
          status: "active",
          assigned_by: profile.user_id,
        });
        if (error) throw error;
        toast.success("Natural Gas add-on enabled");
      } else {
        const addonId = gasAddonLicenseMap[license.user_id];
        if (addonId) {
          const { error } = await supabase.from("addon_licenses").delete().eq("id", addonId);
          if (error) throw error;
        }
        toast.success("Natural Gas add-on removed");
      }
      await fetchGasAddonLicenses();
      // Sync quantity to Stripe
      const { error: syncError } = await supabase.functions.invoke("update-addon-license-count");
      if (syncError) {
        console.error("Failed to sync addon license count to Stripe:", syncError);
        toast.error("Add-on updated locally but billing sync failed");
      }
    } catch (err) {
      toast.error("Failed to update gas add-on");
    } finally {
      setTogglingGas(null);
    }
  };

  const handleRefreshSubscription = async () => {
    setIsRefreshing(true);
    try {
      await checkSubscription();
      await refetch();
      toast.success("Subscription status refreshed");
    } catch (err) {
      toast.error("Failed to refresh subscription status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickSubscribe = async () => {
    setIsCheckingOut(true);
    try {
      const config = SUBSCRIPTION_TIERS[selectedTier];
      const priceId = isAnnual && "annual_price_id" in config ? config.annual_price_id : config.price_id;
      await createCheckout(priceId, 1, undefined, selectedTier);
      setSubscribeDialogOpen(false);
    } catch (err) {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleAssignToMember = async () => {
    if (!selectedUserId || !profile?.company_id) return;
    setIsSubmitting(true);

    const member = unlicensedMembers.find((m) => m.user_id === selectedUserId);
    if (!member) {
      setIsSubmitting(false);
      return;
    }

    // Assign license to existing user
    const success = await assignLicense(selectedUserId, assignType, true);
    if (success) {
      // If gas addon checkbox was ticked, also assign gas addon license
      if (includeGasAddon && companyHasAddon) {
        try {
          await supabase.from("addon_licenses").insert({
            company_id: profile.company_id,
            addon_type: "natural_gas" as any,
            user_id: selectedUserId,
            status: "active",
            assigned_by: profile.user_id,
          });
          await fetchGasAddonLicenses();
          // Sync quantity to Stripe
          const { error: syncError } = await supabase.functions.invoke("update-addon-license-count");
          if (syncError) {
            console.error("Failed to sync addon license count to Stripe:", syncError);
          }
        } catch (err) {
          console.error("Failed to assign gas addon:", err);
        }
      }
      setAssignDialogOpen(false);
      setSelectedUserId("");
      setAssignType("engineer");
      setIncludeGasAddon(false);
    }
    setIsSubmitting(false);
  };

  const handleAddLicenses = async () => {
    if (addCount < 1) return;
    setIsSubmitting(true);
    const success = await updateLicenseCount(stats.total + addCount);
    if (success) {
      setAddLicensesDialogOpen(false);
      setAddCount(1);
    }
    setIsSubmitting(false);
  };

  const handleToggleLicense = async (license: License) => {
    if (license.status === "active") {
      setSelectedLicense(license);
      setDisableConfirmOpen(true);
    } else {
      await toggleLicense(license.id, true);
    }
  };

  const confirmDisable = async () => {
    if (!selectedLicense) return;
    await toggleLicense(selectedLicense.id, false);
    setDisableConfirmOpen(false);
    setSelectedLicense(null);
  };

  const handleRevokeLicense = (license: License) => {
    setSelectedLicense(license);
    setRevokeConfirmOpen(true);
  };

  const confirmRevoke = async () => {
    if (!selectedLicense) return;
    await revokeLicense(selectedLicense.id);
    setRevokeConfirmOpen(false);
    setSelectedLicense(null);
  };

  const handleResendInvitation = async (license: License) => {
    await resendInvitation(license);
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
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const utilizationPercent = stats.total > 0 ? ((stats.active + stats.pending) / stats.total) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            License Management
          </h2>
          <p className="text-sm text-muted-foreground">Assign licenses to existing team members</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshSubscription} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
          {subscribed && isOwner && (
            <Button variant="outline" size="sm" onClick={() => openCustomerPortal()}>
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </Button>
          )}
          {canManage && stats.available > 0 && (
            <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign License
            </Button>
          )}
        </div>
      </div>

      {/* Subscription Warning */}
      {!subscribed && !subscriptionLoading && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">No Active Subscription</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    License management requires an active subscription. Activate now to start adding team members.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" onClick={handleRefreshSubscription} disabled={isRefreshing}>
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Refresh</span>
                </Button>
                {isOwner && (
                  <Button size="sm" onClick={() => setSubscribeDialogOpen(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Activate Subscription
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.disabled}</p>
                <p className="text-xs text-muted-foreground">Disabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization */}
      {stats.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">License Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={utilizationPercent} className="flex-1" />
              <span className="text-sm font-medium">{Math.round(utilizationPercent)}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.active + stats.pending} of {stats.total} licenses in use
            </p>
          </CardContent>
        </Card>
      )}

      {/* Licenses Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Licenses</CardTitle>
            <CardDescription>All user licenses in your organization</CardDescription>
          </div>
          {canManage && subscribed && (
            <Button variant="outline" size="sm" onClick={() => setAddLicensesDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Licenses
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No licenses assigned yet</p>
              {canManage && subscribed && (
                <Button variant="link" onClick={() => setAssignDialogOpen(true)} className="mt-2">
                  Assign your first license
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  {companyHasAddon && <TableHead>Gas Add-on</TableHead>}
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
                        <p className="font-medium">{license.profile?.full_name || license.email || "—"}</p>
                        <p className="text-sm text-muted-foreground">
                          {license.profile?.email || license.email || license.user_id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {license.license_type}
                      </Badge>
                    </TableCell>
                    {companyHasAddon && (
                      <TableCell>
                        {license.user_id && license.status === "active" ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={gasAddonUserIds.has(license.user_id)}
                              onCheckedChange={(checked) => handleToggleGasAddon(license, !!checked)}
                              disabled={!canManage || togglingGas === license.id}
                            />
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Flame className="h-3 w-3" />
                              +£15/mo
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{getStatusBadge(license.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(license.created_at), "dd MMM yyyy")}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {license.status === "pending" && (
                            <Button variant="ghost" size="sm" onClick={() => handleResendInvitation(license)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <Switch
                            checked={license.status === "active"}
                            onCheckedChange={() => handleToggleLicense(license)}
                            disabled={license.status === "pending"}
                          />
                          {license.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleRevokeLicense(license)}
                            >
                              Revoke
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

      {/* Assign License Dialog - Now with dropdown */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign License</DialogTitle>
            <DialogDescription>Assign a license to an existing team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : unlicensedMembers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No team members without licenses</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/organisation?tab=team">Add team members first</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Team Member</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {unlicensedMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex flex-col">
                            <span>{member.full_name}</span>
                            <span className="text-xs text-muted-foreground">{member.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>License Type</Label>
                  <Select value={assignType} onValueChange={(v) => setAssignType(v as "manager" | "engineer")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {companyHasAddon && (
                  <div className="flex items-center space-x-2 rounded-lg border p-4">
                    <Checkbox
                      id="include-gas"
                      checked={includeGasAddon}
                      onCheckedChange={(checked) => setIncludeGasAddon(!!checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="include-gas" className="flex items-center gap-2 cursor-pointer">
                        <Flame className="h-4 w-4 text-orange-500" />
                        Include Natural Gas Compliance
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">+£15/user/month</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignToMember}
              disabled={isSubmitting || !selectedUserId || unlicensedMembers.length === 0}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Licenses Dialog */}
      <Dialog open={addLicensesDialogOpen} onOpenChange={setAddLicensesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Licenses</DialogTitle>
            <DialogDescription>Increase your license count (billed on next invoice)</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="count">Number of Licenses to Add</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={100}
              value={addCount}
              onChange={(e) => setAddCount(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLicensesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLicenses} disabled={isSubmitting || addCount < 1}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {addCount} License{addCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation */}
      <AlertDialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable License?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access for {selectedLicense?.profile?.full_name || "this user"}. They can be re-enabled
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable}>Disable</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeConfirmOpen} onOpenChange={setRevokeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the pending invitation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} className="bg-destructive text-destructive-foreground">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subscribe Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>Select a subscription to enable license management</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-4 py-4">
            <Label className={cn(!isAnnual && "text-foreground font-medium")}>Monthly</Label>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <Label className={cn("flex items-center gap-2", isAnnual && "text-foreground font-medium")}>
              Annual <Badge variant="secondary">Save 17%</Badge>
            </Label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {(["basic", "premium"] as const).map((tier) => {
              const config = SUBSCRIPTION_TIERS[tier];
              const price = isAnnual && "annual_price" in config ? config.annual_price : config.price;
              const isPopular = tier === "premium";

              return (
                <Card
                  key={tier}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedTier === tier && "ring-2 ring-primary border-primary",
                    isPopular && "border-primary/30"
                  )}
                  onClick={() => setSelectedTier(tier)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      {isPopular && <Badge>Popular</Badge>}
                    </div>
                    <div className="text-2xl font-bold">
                      £{price}
                      <span className="text-sm font-normal text-muted-foreground">/user/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>
                      Up to {config.limits.users} users, {config.limits.sites} sites
                    </p>
                    <p className="mt-1">{config.limits.equipment} equipment items</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => window.open("/enterprise-contact", "_blank")}>
              <Building className="h-4 w-4 mr-2" />
              Need Enterprise?
            </Button>
            <Button onClick={handleQuickSubscribe} disabled={!selectedTier || isCheckingOut}>
              {isCheckingOut && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continue to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
