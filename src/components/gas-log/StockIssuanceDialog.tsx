import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Truck } from "lucide-react";

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
}

interface Cylinder {
  id: string;
  cylinder_code: string;
  refrigerant_type: string;
  current_weight_kg: number;
}

interface Site {
  id: string;
  name: string;
}

interface StockIssuanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StockIssuanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: StockIssuanceDialogProps) {
  const { user, profile } = useAuth();
  const [engineers, setEngineers] = useState<TeamMember[]>([]);
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    engineer_id: "",
    cylinder_id: "",
    job_reference: "",
    site_id: "",
    notes: "",
  });

  const [selectedCylinder, setSelectedCylinder] = useState<Cylinder | null>(null);

  useEffect(() => {
    if (open && profile?.company_id) {
      fetchData();
    }
  }, [open, profile?.company_id]);

  useEffect(() => {
    if (formData.cylinder_id) {
      const cyl = cylinders.find((c) => c.id === formData.cylinder_id);
      setSelectedCylinder(cyl || null);
    } else {
      setSelectedCylinder(null);
    }
  }, [formData.cylinder_id, cylinders]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch engineers (team members)
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("company_id", profile!.company_id);

    if (profilesData) {
      setEngineers(profilesData);
    }

    // Fetch available cylinders (in_stock only)
    const { data: cylindersData } = await supabase
      .from("refrigerant_cylinders")
      .select("id, cylinder_code, refrigerant_type, current_weight_kg")
      .eq("company_id", profile!.company_id)
      .eq("status", "in_stock")
      .gt("current_weight_kg", 0)
      .order("cylinder_code");

    if (cylindersData) {
      setCylinders(cylindersData);
    }

    // Fetch sites
    const { data: sitesData } = await supabase
      .from("sites")
      .select("id, name")
      .eq("company_id", profile!.company_id)
      .eq("is_deleted", false)
      .order("name");

    if (sitesData) {
      setSites(sitesData);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.company_id || !selectedCylinder) return;

    if (!formData.engineer_id) {
      toast.error("Please select an engineer");
      return;
    }
    if (!formData.cylinder_id) {
      toast.error("Please select a cylinder");
      return;
    }
    if (!formData.job_reference && !formData.site_id) {
      toast.error("Please enter a job reference or select a site");
      return;
    }

    setSubmitting(true);

    try {
      const engineer = engineers.find((e) => e.user_id === formData.engineer_id);
      const site = sites.find((s) => s.id === formData.site_id);

      // Update cylinder status to checked_out
      const { error: cylinderError } = await supabase
        .from("refrigerant_cylinders")
        .update({
          status: "checked_out",
          checked_out_to: formData.engineer_id,
          checked_out_at: new Date().toISOString(),
        })
        .eq("id", formData.cylinder_id);

      if (cylinderError) throw cylinderError;

      // Create book_out movement record
      const { error: movementError } = await supabase
        .from("refrigerant_movements")
        .insert({
          company_id: profile.company_id,
          engineer_id: formData.engineer_id,
          engineer_name: engineer?.full_name || "Unknown",
          movement_type: "book_out",
          refrigerant_type: selectedCylinder.refrigerant_type as any,
          weight_kg: selectedCylinder.current_weight_kg,
          cylinder_id: formData.cylinder_id,
          cylinder_reference: selectedCylinder.cylinder_code,
          job_reference: formData.job_reference || null,
          site_id: formData.site_id || null,
          issued_to_engineer_id: formData.engineer_id,
          issued_by_user_id: user.id,
          source: site ? `Site: ${site.name}` : `Job: ${formData.job_reference}`,
          notes: formData.notes || null,
          movement_date: new Date().toISOString().split("T")[0],
        });

      if (movementError) throw movementError;

      toast.success(`Cylinder ${selectedCylinder.cylinder_code} issued to ${engineer?.full_name}`);
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData({
        engineer_id: "",
        cylinder_id: "",
        job_reference: "",
        site_id: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to issue stock");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Issue Stock to Engineer
          </DialogTitle>
          <DialogDescription>
            Assign a refrigerant cylinder to an engineer by job or site
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Engineer *</Label>
            <Select
              value={formData.engineer_id}
              onValueChange={(value) =>
                setFormData({ ...formData, engineer_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select engineer" />
              </SelectTrigger>
              <SelectContent>
                {engineers.map((eng) => (
                  <SelectItem key={eng.user_id} value={eng.user_id}>
                    {eng.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cylinder *</Label>
            <Select
              value={formData.cylinder_id}
              onValueChange={(value) =>
                setFormData({ ...formData, cylinder_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cylinder" />
              </SelectTrigger>
              <SelectContent>
                {cylinders.map((cyl) => (
                  <SelectItem key={cyl.id} value={cyl.id}>
                    {cyl.cylinder_code} - {cyl.refrigerant_type} ({Number(cyl.current_weight_kg).toFixed(1)} kg)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cylinders.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                No cylinders available in stock.
              </p>
            )}
          </div>

          {selectedCylinder && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <div className="font-medium">{selectedCylinder.cylinder_code}</div>
              <div className="text-muted-foreground">
                {selectedCylinder.refrigerant_type} • {Number(selectedCylinder.current_weight_kg).toFixed(1)} kg available
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Assignment Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_reference">Job Reference</Label>
                <Input
                  id="job_reference"
                  value={formData.job_reference}
                  onChange={(e) =>
                    setFormData({ ...formData, job_reference: e.target.value })
                  }
                  placeholder="e.g., JOB-12345"
                />
              </div>
              <div className="space-y-2">
                <Label>Or Select Site</Label>
                <Select
                  value={formData.site_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, site_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedCylinder}>
              {submitting ? "Processing..." : "Issue Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
