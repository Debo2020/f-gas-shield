import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { MapPin, Loader2, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SiteDialog } from "@/components/sites/SiteDialog";
import { SiteFormValues } from "@/components/sites/SiteForm";

interface Client {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  client_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
}

interface ClientSitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onSuccess: () => void;
}

export function ClientSitesDialog({ open, onOpenChange, client, onSuccess }: ClientSitesDialogProps) {
  const { profile } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Site dialog state
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation state
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);

  useEffect(() => {
    if (open && profile?.company_id) {
      fetchSites();
    }
  }, [open, profile?.company_id]);

  const fetchSites = async () => {
    if (!profile?.company_id) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from("sites")
      .select("id, name, address, city, postcode, client_id, contact_name, contact_phone, contact_email, notes")
      .eq("company_id", profile.company_id)
      .or("is_deleted.is.null,is_deleted.eq.false")
      .order("name");

    if (error) {
      toast.error("Failed to load sites");
      console.error(error);
    } else {
      setSites(data || []);
      // Pre-select sites already allocated to this client
      const allocatedIds = new Set(
        (data || []).filter(s => s.client_id === client.id).map(s => s.id)
      );
      setSelectedSiteIds(allocatedIds);
    }
    setLoading(false);
  };

  const handleToggleSite = (siteId: string) => {
    const newSelected = new Set(selectedSiteIds);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSiteIds(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Get all sites that were previously allocated to this client
      const previouslyAllocated = sites.filter(s => s.client_id === client.id);
      
      // Sites to unallocate (were allocated, now unchecked)
      const toUnallocate = previouslyAllocated.filter(s => !selectedSiteIds.has(s.id));
      
      // Sites to allocate (now checked, weren't allocated to this client)
      const toAllocate = sites.filter(s => 
        selectedSiteIds.has(s.id) && s.client_id !== client.id
      );

      // Unallocate sites
      if (toUnallocate.length > 0) {
        const { error } = await supabase
          .from("sites")
          .update({ client_id: null })
          .in("id", toUnallocate.map(s => s.id));
        
        if (error) throw error;
      }

      // Allocate sites
      if (toAllocate.length > 0) {
        const { error } = await supabase
          .from("sites")
          .update({ client_id: client.id })
          .in("id", toAllocate.map(s => s.id));
        
        if (error) throw error;
      }

      toast.success("Site allocations updated");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update site allocations");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSite = () => {
    setEditingSite(null);
    setSiteDialogOpen(true);
  };

  const handleEditSite = (site: Site) => {
    setEditingSite(site);
    setSiteDialogOpen(true);
  };

  const handleSiteSubmit = async (values: SiteFormValues) => {
    if (!profile?.company_id) return;
    
    setIsSubmitting(true);
    
    try {
      if (editingSite) {
        // Update existing site
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
      } else {
        // Create new site and auto-allocate to this client
        const { error } = await supabase
          .from("sites")
          .insert({
            company_id: profile.company_id,
            client_id: client.id,
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
      }
      
      setSiteDialogOpen(false);
      setEditingSite(null);
      await fetchSites();
    } catch (error: any) {
      toast.error(error.message || "Failed to save site");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!deletingSite) return;
    
    try {
      const { error } = await supabase
        .from("sites")
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: profile?.id || null
        })
        .eq("id", deletingSite.id);

      if (error) throw error;
      
      toast.success("Site deleted successfully");
      setDeletingSite(null);
      await fetchSites();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete site");
    }
  };

  const formatAddress = (site: Site) => {
    return [site.address, site.city, site.postcode].filter(Boolean).join(", ");
  };

  // Filter sites: show client's sites and unallocated sites
  const availableSites = sites.filter(s => s.client_id === client.id || !s.client_id);
  const otherClientSites = sites.filter(s => s.client_id && s.client_id !== client.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Sites for {client.name}</DialogTitle>
            <DialogDescription>
              Add new sites or select existing unallocated sites to assign to this client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={handleAddSite} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Site
            </Button>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableSites.length === 0 && otherClientSites.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No sites yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Add New Site" to create one</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px] pr-4">
                <div className="space-y-2">
                  {availableSites.map((site) => {
                    const isChecked = selectedSiteIds.has(site.id);
                    const isClientSite = site.client_id === client.id;
                    
                    return (
                      <div
                        key={site.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          isChecked 
                            ? "border-primary bg-primary/5" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleSite(site.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{site.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {formatAddress(site)}
                          </div>
                          {!isClientSite && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Unallocated
                            </div>
                          )}
                        </div>
                        {isClientSite && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSite(site)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Site
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingSite(site)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Site
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                  
                  {otherClientSites.length > 0 && (
                    <>
                      <div className="text-xs text-muted-foreground pt-4 pb-2 font-medium">
                        Allocated to other clients
                      </div>
                      {otherClientSites.map((site) => (
                        <div
                          key={site.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-dashed opacity-60"
                        >
                          <Checkbox
                            checked={false}
                            disabled
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{site.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {formatAddress(site)}
                            </div>
                            <div className="text-xs text-amber-600 mt-1">
                              Allocated to another client
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteDialog
        open={siteDialogOpen}
        onOpenChange={setSiteDialogOpen}
        onSubmit={handleSiteSubmit}
        site={editingSite ? {
          id: editingSite.id,
          name: editingSite.name,
          address: editingSite.address,
          city: editingSite.city,
          postcode: editingSite.postcode,
          contact_name: editingSite.contact_name,
          contact_phone: editingSite.contact_phone,
          contact_email: editingSite.contact_email,
          notes: editingSite.notes,
        } : undefined}
        isSubmitting={isSubmitting}
      />

      <AlertDialog open={!!deletingSite} onOpenChange={(open) => !open && setDeletingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSite?.name}"? This action cannot be undone.
              All equipment and inspection records associated with this site will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSite} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
