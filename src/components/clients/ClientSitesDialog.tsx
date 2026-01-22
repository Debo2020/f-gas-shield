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
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";

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
      .select("id, name, address, city, postcode, client_id")
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

  const formatAddress = (site: Site) => {
    return [site.address, site.city, site.postcode].filter(Boolean).join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Sites for {client.name}</DialogTitle>
          <DialogDescription>
            Select which sites are allocated to this client. These sites will be visible in the client's portal.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sites.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No sites available to allocate</p>
            <p className="text-sm text-muted-foreground mt-1">Add sites first from the Sites page</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {sites.map((site) => {
                const isAllocatedToOther = site.client_id && site.client_id !== client.id;
                const isChecked = selectedSiteIds.has(site.id);
                
                return (
                  <label
                    key={site.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked 
                        ? "border-primary bg-primary/5" 
                        : isAllocatedToOther 
                          ? "border-dashed opacity-60" 
                          : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggleSite(site.id)}
                      disabled={isAllocatedToOther}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{site.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatAddress(site)}
                      </div>
                      {isAllocatedToOther && (
                        <div className="text-xs text-amber-600 mt-1">
                          Allocated to another client
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        )}

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
  );
}
