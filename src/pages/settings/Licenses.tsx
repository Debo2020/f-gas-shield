import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useLicenses, License } from "@/hooks/useLicenses";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { SUBSCRIPTION_TIERS, SubscriptionTier, formatPrice } from "@/lib/subscription";
import { toast } from "sonner";
import { 
  Users, 
  Plus, 
  Minus, 
  UserPlus, 
  UserX, 
  UserCheck, 
  CreditCard,
  Loader2,
  Mail,
  Shield,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Licenses() {
  const { hasRole } = useAuth();
  const { licenses, stats, loading, refetch, assignLicense, toggleLicense, revokeLicense, updateLicenseCount, resendInvitation } = useLicenses();
  const { tier, openCustomerPortal, subscribed, checkSubscription, createCheckout, loading: subscriptionLoading } = useSubscription();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [addLicensesDialogOpen, setAddLicensesDialogOpen] = useState(false);
  const [confirmDisableDialog, setConfirmDisableDialog] = useState<License | null>(null);
  const [confirmRevokeDialog, setConfirmRevokeDialog] = useState<License | null>(null);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);

  const [newLicenseEmail, setNewLicenseEmail] = useState("");
  const [newLicenseType, setNewLicenseType] = useState<"manager" | "engineer">("engineer");
  const [licensesToAdd, setLicensesToAdd] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<"basic" | "premium">("premium");
  const [isAnnual, setIsAnnual] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canManage = isOwner || isManager;

  const handleRefreshSubscription = async () => {
    setIsRefreshing(true);
    await checkSubscription();
    await refetch();
    setIsRefreshing(false);
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

  const utilizationPercent = stats.total > 0 
    ? ((stats.active + stats.pending) / stats.total) * 100 
    : 0;

  const handleAssignLicense = async () => {
    if (!newLicenseEmail.trim()) return;
    setIsSubmitting(true);
    const success = await assignLicense(newLicenseEmail, newLicenseType);
    setIsSubmitting(false);
    if (success) {
      setAssignDialogOpen(false);
      setNewLicenseEmail("");
      setNewLicenseType("engineer");
    }
  };

  const handleAddLicenses = async () => {
    setIsSubmitting(true);
    const success = await updateLicenseCount(stats.total + licensesToAdd);
    setIsSubmitting(false);
    if (success) {
      setAddLicensesDialogOpen(false);
      setLicensesToAdd(1);
    }
  };

  const handleToggleLicense = async (license: License) => {
    if (license.status === "active") {
      setConfirmDisableDialog(license);
    } else {
      await toggleLicense(license.id, true);
    }
  };

  const confirmDisable = async () => {
    if (!confirmDisableDialog) return;
    await toggleLicense(confirmDisableDialog.id, false);
    setConfirmDisableDialog(null);
  };

  const confirmRevoke = async () => {
    if (!confirmRevokeDialog) return;
    await revokeLicense(confirmRevokeDialog.id);
    setConfirmRevokeDialog(null);
  };

  const handleResendInvitation = async (license: License) => {
    setResendingId(license.id);
    await resendInvitation(license);
    setResendingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case "disabled":
        return <Badge variant="destructive">Disabled</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const tierConfig = tier ? SUBSCRIPTION_TIERS[tier] : null;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">License Management</h1>
            <p className="text-muted-foreground">
              Manage user licenses and access for your team
            </p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button onClick={() => setAssignDialogOpen(true)} disabled={stats.available <= 0}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign License
              </Button>
            )}
            {isOwner && subscribed && (
              <Button variant="outline" onClick={() => openCustomerPortal()}>
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Licenses</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <Mail className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold">{stats.available}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Status Warning */}
        {!subscribed && !subscriptionLoading && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                      No Active Subscription
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      License management requires an active subscription. Activate now to start adding team members.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshSubscription}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Refresh</span>
                  </Button>
                  {isOwner && (
                    <Button
                      size="sm"
                      onClick={() => setSubscribeDialogOpen(true)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Activate Subscription
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Utilization */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>License Utilization</CardTitle>
                <CardDescription>
                  {stats.active + stats.pending} of {stats.total} licenses in use
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefreshSubscription}
                  disabled={isRefreshing}
                  title="Refresh subscription status"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                {isOwner && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setAddLicensesDialogOpen(true)}
                    disabled={!subscribed}
                    title={!subscribed ? "Requires active subscription" : "Add more licenses"}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Licenses
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress 
              value={utilizationPercent} 
              className={cn(
                "h-3",
                utilizationPercent >= 90 && "bg-red-100 [&>div]:bg-red-500"
              )} 
            />
            {utilizationPercent >= 80 && subscribed && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ You're approaching your license limit. Consider adding more licenses.
              </p>
            )}
          </CardContent>
        </Card>

        {/* License table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Licenses</CardTitle>
            <CardDescription>
              All assigned and pending licenses for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      No licenses assigned yet
                    </TableCell>
                  </TableRow>
                ) : (
                  licenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell className="font-medium">
                        {license.profile?.full_name || "—"}
                      </TableCell>
                      <TableCell>{license.email || license.profile?.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{license.license_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(license.status)}</TableCell>
                      <TableCell>
                        {license.assigned_at 
                          ? format(new Date(license.assigned_at), "MMM d, yyyy")
                          : "—"
                        }
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          {license.license_type !== "owner" && (
                            <div className="flex justify-end gap-2">
                              {license.status === "pending" ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendInvitation(license)}
                                    disabled={resendingId === license.id}
                                    title="Resend invitation"
                                  >
                                    <RefreshCw className={`h-4 w-4 ${resendingId === license.id ? "animate-spin" : ""}`} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConfirmRevokeDialog(license)}
                                    title="Revoke license"
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleLicense(license)}
                                >
                                  {license.status === "active" ? (
                                    <UserX className="h-4 w-4" />
                                  ) : (
                                    <UserCheck className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Assign License Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign License</DialogTitle>
            <DialogDescription>
              Assign an available license to a team member. They will receive an invitation email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={newLicenseEmail}
                onChange={(e) => setNewLicenseEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newLicenseType} onValueChange={(v) => setNewLicenseType(v as "manager" | "engineer")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignLicense} disabled={isSubmitting || !newLicenseEmail.trim()}>
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
            <DialogDescription>
              Add more licenses to your subscription. You'll be charged prorated for the remainder of your billing cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLicensesToAdd(Math.max(1, licensesToAdd - 1))}
                disabled={licensesToAdd <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="w-20">
                <Input
                  type="number"
                  min={1}
                  value={licensesToAdd}
                  onChange={(e) => setLicensesToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center text-xl font-bold"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLicensesToAdd(licensesToAdd + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Current: {stats.total} licenses</p>
              <p className="font-semibold text-foreground">New total: {stats.total + licensesToAdd} licenses</p>
            </div>
            {tierConfig && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Additional monthly cost</p>
                <p className="text-2xl font-bold">
                  £{(tierConfig.price * licensesToAdd).toFixed(0)}/month
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLicensesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLicenses} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {licensesToAdd} License{licensesToAdd > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Disable Dialog */}
      <AlertDialog open={!!confirmDisableDialog} onOpenChange={() => setConfirmDisableDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable License?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access for {confirmDisableDialog?.profile?.full_name || confirmDisableDialog?.email}. 
              They won't be able to use the platform until you re-enable their license.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disable License
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Revoke Dialog */}
      <AlertDialog open={!!confirmRevokeDialog} onOpenChange={() => setConfirmRevokeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Pending License?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the pending invitation for {confirmRevokeDialog?.email}. 
              They won't be able to join your organization with this license.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke License
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subscribe Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>
              Select a subscription to enable license management and team features
            </DialogDescription>
          </DialogHeader>
          
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 py-4">
            <Label htmlFor="billing-toggle" className={cn(!isAnnual && "font-semibold")}>Monthly</Label>
            <Switch 
              id="billing-toggle"
              checked={isAnnual} 
              onCheckedChange={setIsAnnual} 
            />
            <Label htmlFor="billing-toggle" className={cn("flex items-center gap-2", isAnnual && "font-semibold")}>
              Annual <Badge variant="secondary" className="text-xs">Save 17%</Badge>
            </Label>
          </div>
          
          {/* Plan cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {(["basic", "premium"] as const).map((planTier) => {
              const config = SUBSCRIPTION_TIERS[planTier];
              const price = isAnnual && "annual_price" in config ? config.annual_price : config.price;
              const isPopular = planTier === "premium";
              const TierIcon = planTier === "premium" ? Sparkles : Users;
              
              return (
                <Card 
                  key={planTier}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md relative",
                    selectedTier === planTier && "ring-2 ring-primary",
                    isPopular && "border-primary"
                  )}
                  onClick={() => setSelectedTier(planTier)}
                >
                  {isPopular && (
                    <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TierIcon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                    </div>
                    <div className="text-2xl font-bold mt-2">
                      {formatPrice(price as number, config.currency)}
                      <span className="text-sm font-normal text-muted-foreground">/user/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>Up to {config.limits.users} users</p>
                    <p>Up to {config.limits.sites} sites</p>
                    <p>{config.limits.ai_credits_monthly} AI credits/month</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-center">
            <Button 
              variant="link" 
              className="text-muted-foreground"
              onClick={() => {
                setSubscribeDialogOpen(false);
                window.location.href = "/enterprise-contact";
              }}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Need Enterprise? Contact us
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscribeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleQuickSubscribe}
              disabled={isCheckingOut}
            >
              {isCheckingOut && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continue to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
