import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AppLayout } from "@/components/layout/AppLayout";
import { SiteCard } from "@/components/sites/SiteCard";
import { SiteDialog } from "@/components/sites/SiteDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SiteFormValues } from "@/components/sites/SiteForm";
import { LiveClock } from "@/components/ui/live-clock";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface Site {
  id: string;
  name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
}

export default function Sites() {
  const { profile, hasRole, hasActiveLicense } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canEdit = isOwner || isManager;
  const canDelete = isOwner;
  const canPerformActions = canEdit && (isOwner || hasActiveLicense);

  const fetchSites = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, address, city, postcode, contact_name, contact_phone, contact_email, notes")
        .eq("company_id", profile.company_id)
        .order("name");

      if (error) throw error;
      setSites(data || []);
    } catch (error: any) {
      toast.error("Failed to load sites");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [profile?.company_id]);

  // Handle ?action=new from URL
  useEffect(() => {
    if (searchParams.get("action") === "new" && canPerformActions && !isLoading) {
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, canPerformActions, isLoading]);

  const handleAddSite = async (values: SiteFormValues) => {
    if (!profile?.company_id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("sites").insert({
        company_id: profile.company_id,
        name: values.name,
        address: values.address,
        city: values.city || null,
        postcode: values.postcode || null,
        contact_name: values.contact_name || null,
        contact_phone: values.contact_phone || null,
        contact_email: values.contact_email || null,
        notes: values.notes || null,
      });

      if (error) throw error;

      toast.success("Site added successfully");
      setIsDialogOpen(false);
      fetchSites();
    } catch (error: any) {
      toast.error(error.message || "Failed to add site");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSite = async (values: SiteFormValues) => {
    if (!editingSite) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("sites")
        .update({
          name: values.name,
          address: values.address,
          city: values.city || null,
          postcode: values.postcode || null,
          contact_name: values.contact_name || null,
          contact_phone: values.contact_phone || null,
          contact_email: values.contact_email || null,
          notes: values.notes || null,
        })
        .eq("id", editingSite.id);

      if (error) throw error;

      toast.success("Site updated successfully");
      setEditingSite(null);
      fetchSites();
    } catch (error: any) {
      toast.error(error.message || "Failed to update site");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!deletingSite) return;

    try {
      const { error } = await supabase
        .from("sites")
        .delete()
        .eq("id", deletingSite.id);

      if (error) throw error;

      toast.success("Site deleted successfully");
      setDeletingSite(null);
      fetchSites();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete site");
    }
  };

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.postcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 header-gradient p-6 -mx-4 -mt-8 rounded-b-2xl">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 animate-float">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <span className="gradient-text">Sites</span>
            </h1>
            <p className="text-muted-foreground mt-1 ml-14">
              <AnimatedCounter value={sites.length} /> registered locations
            </p>
            <StatusIndicator status="synced" label="Data synced" className="mt-2 ml-14" />
          </div>

          <div className="flex flex-col items-end gap-3">
            <LiveClock showDate className="animate-slide-up" />
            {canEdit && (
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                disabled={!canPerformActions}
                title={!canPerformActions ? "License required" : undefined}
                className="animate-scale-in"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Site
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Sites Grid */}
        <div className="animate-scale-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading sites...
            </div>
          ) : filteredSites.length === 0 ? (
            <Card className="card-interactive">
              <CardContent className="py-12 text-center">
                {sites.length === 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-float">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No sites yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first site to start tracking equipment and inspections
                    </p>
                    {canEdit && (
                      <Button 
                        onClick={() => setIsDialogOpen(true)}
                        disabled={!canPerformActions}
                        title={!canPerformActions ? "License required" : undefined}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Site
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No sites found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search query
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSites.map((site, index) => (
                <div 
                  key={site.id} 
                  className="animate-slide-up opacity-0"
                  style={{ animationDelay: `${(index + 3) * 50}ms`, animationFillMode: 'forwards' }}
                >
                  <SiteCard
                    site={site}
                    canEdit={canPerformActions}
                    canDelete={canDelete && (isOwner || hasActiveLicense)}
                    onEdit={() => setEditingSite(site)}
                    onDelete={() => setDeletingSite(site)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Site Dialog */}
      <SiteDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddSite}
        isSubmitting={isSubmitting}
      />

      {/* Edit Site Dialog */}
      <SiteDialog
        open={!!editingSite}
        onOpenChange={(open) => !open && setEditingSite(null)}
        onSubmit={handleEditSite}
        site={editingSite}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSite} onOpenChange={(open) => !open && setDeletingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSite?.name}"? This action cannot be undone
              and will remove all associated equipment and inspection records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
