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
import { Separator } from "@/components/ui/separator";
import { ADDON_MODULES } from "@/lib/gas-addons";
import { formatPrice } from "@/lib/subscription";
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

interface TeamMemberWithLicense {
  user_id: string;
  full_name: string;
  email: string;
  hasLicense: boolean;
  licenseId?: string;
  licenseType?: string;
  licenseStatus?: string;
  hasGasAddon: boolean;
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
    tier,
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
  const [addCount, setAddCount] = useState(1);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("premium");
  const [isAnnual, setIsAnnual] = useState(true);

  // All team members with license info
  const [allMembers, setAllMembers] = useState<TeamMemberWithLicense[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [inlineAssignType, setInlineAssignType] = useState<Record<string, "manager" | "engineer">>({});

  const tierConfig = useMemo(() => SUBSCRIPTION_TIERS[selectedTier], [selectedTier]);

  // Fetch all team members with license and gas addon status
  const fetchAllMembers = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoadingMembers(true);

    try {
      // Fetch profiles, licenses, owner roles, and gas addon licenses in parallel
      const [profilesRes, licensesRes, ownerRolesRes, addonRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .eq("company_id", profile.company_id),
        supabase
          .from("user_licenses")
          .select("id, user_id, license_type, status")
          .eq("company_id", profile.company_id),
        supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "owner"),
        supabase
          .from("addon_licenses")
          .select("user_id")
          .eq("company_id", profile.company_id)
          .eq("addon_type", "natural_gas")
          .eq("status", "active"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (licensesRes.error) throw licensesRes.error;

      const ownerIds = new Set(ownerRolesRes.data?.map((r) => r.user_id) || []);
      const licenseMap = new Map(
        licensesRes.data?.filter((l) => l.user_id).map((l) => [l.user_id!, l]) || []
      );
      const gasAddonSet = new Set(addonRes.data?.map((a) => a.user_id).filter(Boolean) || []);

      const members: TeamMemberWithLicense[] = (profilesRes.data || [])
        .filter((p) => !ownerIds.has(p.user_id))
        .map((p) => {
          const license = licenseMap.get(p.user_id);
          return {
            user_id: p.user_id,
            full_name: p.full_name,
            email: p.email,
            hasLicense: !!license,
            licenseId: license?.id,
            licenseType: license?.license_type,
            licenseStatus: license?.status,
            hasGasAddon: gasAddonSet.has(p.user_id),
          };
        })
        .sort((a, b) => {
          // Licensed first, then by name
          if (a.hasLicense !== b.hasLicense) return a.hasLicense ? -1 : 1;
          return a.full_name.localeCompare(b.full_name);
        });

      setAllMembers(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoadingMembers(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchAllMembers();
  }, [fetchAllMembers, licenses]);

  // Re-fetch when assign dialog opens to ensure fresh data
  useEffect(() => {
    if (assignDialogOpen) {
      fetchAllMembers();
    }
  }, [assignDialogOpen, fetchAllMembers]);

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

  const handleAssignInline = async (userId: string) => {
    if (!profile?.company_id) return;
    setIsSubmitting(true);
    setAssigningUserId(userId);

    const type = inlineAssignType[userId] || "engineer";
    const success = await assignLicense(userId, type, true);
    if (success) {
      // If gas addon checkbox was ticked, also assign gas addon license
      if (includeGasAddon && companyHasAddon) {
        try {
          await supabase.from("addon_licenses").insert({
            company_id: profile.company_id,
            addon_type: "natural_gas" as any,
            user_id: userId,
            status: "active",
            assigned_by: profile.user_id,
          });
          await fetchGasAddonLicenses();
          const { error: syncError } = await supabase.functions.invoke("update-addon-license-count");
          if (syncError) {
            console.error("Failed to sync addon license count to Stripe:", syncError);
          }
        } catch (err) {
          console.error("Failed to assign gas addon:", err);
        }
      }
      setIncludeGasAddon(false);
      // Refresh members list in-place
      await fetchAllMembers();
    }
    setIsSubmitting(false);
    setAssigningUserId(null);
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
          {canManage && (
            <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Manage Licenses
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

      {/* Cost Summary Footer */}
      {subscribed && tier && stats.active > 0 && (
        (() => {
          const currentTier = SUBSCRIPTION_TIERS[tier];
          const basePrice = currentTier.price ?? 0;
          const baseLicenseCount = stats.active;
          const baseCost = baseLicenseCount * basePrice;
          const gasAddonCount = companyHasAddon ? gasAddonUserIds.size : 0;
          const gasAddonPrice = ADDON_MODULES.natural_gas.price;
          const gasAddonCost = gasAddonCount * gasAddonPrice;
          const totalCost = baseCost + gasAddonCost;

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Monthly Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Base Licenses ({baseLicenseCount} × {formatPrice(basePrice, currentTier.currency)}/user)
                  </span>
                  <span className="font-medium">{formatPrice(baseCost, currentTier.currency)}</span>
                </div>
                {companyHasAddon && gasAddonCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      Gas Add-on ({gasAddonCount} × {formatPrice(gasAddonPrice, "GBP")}/user)
                    </span>
                    <span className="font-medium">{formatPrice(gasAddonCost, "GBP")}</span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Monthly</span>
                  <span className="text-lg font-bold text-primary">{formatPrice(totalCost, currentTier.currency)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })()
      )}

      {/* Manage Team Licenses Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Team Licenses</DialogTitle>
            <DialogDescription>View all team members and manage their license and gas add-on status</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-2">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No team members found</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/organisation?tab=team">Add team members first</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>License</TableHead>
                    {companyHasAddon && <TableHead>Gas Add-on</TableHead>}
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMembers.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.hasLicense ? (
                          <Badge className={cn(
                            member.licenseStatus === "active"
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-muted text-muted-foreground"
                          )}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {member.licenseStatus === "active" ? "Active" : member.licenseStatus}
                            {member.licenseType && ` (${member.licenseType})`}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Not Assigned
                          </Badge>
                        )}
                      </TableCell>
                      {companyHasAddon && (
                        <TableCell>
                          {member.hasLicense && member.licenseStatus === "active" ? (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={member.hasGasAddon}
                                onCheckedChange={(checked) => {
                                  // Find the matching license to use existing toggle handler
                                  const lic = licenses.find((l) => l.user_id === member.user_id);
                                  if (lic) handleToggleGasAddon(lic, !!checked);
                                }}
                                disabled={!canManage || togglingGas !== null}
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
                      <TableCell className="text-right">
                        {!member.hasLicense ? (
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={inlineAssignType[member.user_id] || "engineer"}
                              onValueChange={(v) =>
                                setInlineAssignType((prev) => ({ ...prev, [member.user_id]: v as "manager" | "engineer" }))
                              }
                            >
                              <SelectTrigger className="w-[110px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="engineer">Engineer</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => handleAssignInline(member.user_id)}
                              disabled={isSubmitting || stats.available <= 0}
                            >
                              {assigningUserId === member.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Assign
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {companyHasAddon && allMembers.some((m) => !m.hasLicense) && (
            <div className="flex items-center space-x-2 rounded-lg border p-3 mt-2">
              <Checkbox
                id="include-gas-dialog"
                checked={includeGasAddon}
                onCheckedChange={(checked) => setIncludeGasAddon(!!checked)}
              />
              <Label htmlFor="include-gas-dialog" className="flex items-center gap-2 cursor-pointer text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                Include Gas Add-on when assigning (+£15/user/mo)
              </Label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Close
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
