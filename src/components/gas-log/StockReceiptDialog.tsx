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
import { Package } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface Supplier {
  id: string;
  name: string;
}

interface StockReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const REFRIGERANT_TYPES = Constants.public.Enums.refrigerant_type;

export function StockReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
}: StockReceiptDialogProps) {
  const { user, profile } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: "",
    purchase_order_number: "",
    delivery_note_reference: "",
    cylinder_code: "",
    refrigerant_type: "",
    initial_weight_kg: "",
    tare_weight_kg: "",
    batch_number: "",
    notes: "",
  });

  useEffect(() => {
    if (open && profile?.company_id) {
      fetchSuppliers();
      // Generate cylinder code
      setFormData((prev) => ({
        ...prev,
        cylinder_code: `CYL-${Date.now().toString(36).toUpperCase()}`,
      }));
    }
  }, [open, profile?.company_id]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("company_id", profile!.company_id)
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setSuppliers(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.company_id) return;

    if (!formData.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }
    if (!formData.refrigerant_type) {
      toast.error("Please select refrigerant type");
      return;
    }
    if (!formData.initial_weight_kg || parseFloat(formData.initial_weight_kg) <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    setSubmitting(true);

    try {
      // Create new cylinder with supplier info
      const { data: cylinder, error: cylinderError } = await supabase
        .from("refrigerant_cylinders")
        .insert({
          company_id: profile.company_id,
          cylinder_code: formData.cylinder_code,
          refrigerant_type: formData.refrigerant_type as any,
          initial_weight_kg: parseFloat(formData.initial_weight_kg),
          current_weight_kg: parseFloat(formData.initial_weight_kg),
          tare_weight_kg: formData.tare_weight_kg ? parseFloat(formData.tare_weight_kg) : 0,
          status: "in_stock",
          supplier_id: formData.supplier_id,
          purchase_order_number: formData.purchase_order_number || null,
          delivery_note_reference: formData.delivery_note_reference || null,
          batch_number: formData.batch_number || null,
          notes: formData.notes || null,
          purchase_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (cylinderError) throw cylinderError;

      // Get supplier name for the movement record
      const supplier = suppliers.find((s) => s.id === formData.supplier_id);

      // Create book_in movement record
      const { error: movementError } = await supabase
        .from("refrigerant_movements")
        .insert({
          company_id: profile.company_id,
          engineer_id: user.id,
          engineer_name: profile.full_name,
          movement_type: "book_in",
          refrigerant_type: formData.refrigerant_type as any,
          weight_kg: parseFloat(formData.initial_weight_kg),
          cylinder_id: cylinder.id,
          cylinder_reference: formData.cylinder_code,
          source: `Supplier: ${supplier?.name || "Unknown"}`,
          notes: `PO: ${formData.purchase_order_number || "N/A"}, Delivery Note: ${formData.delivery_note_reference || "N/A"}`,
          issued_by_user_id: user.id,
          movement_date: new Date().toISOString().split("T")[0],
        });

      if (movementError) throw movementError;

      toast.success("Stock received and cylinder added to inventory");
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData({
        supplier_id: "",
        purchase_order_number: "",
        delivery_note_reference: "",
        cylinder_code: "",
        refrigerant_type: "",
        initial_weight_kg: "",
        tare_weight_kg: "",
        batch_number: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to receive stock");
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
            <Package className="h-5 w-5" />
            Receive Stock from Supplier
          </DialogTitle>
          <DialogDescription>
            Log incoming refrigerant delivery from a supplier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) =>
                setFormData({ ...formData, supplier_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {suppliers.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                No suppliers configured. Add suppliers in Settings → Suppliers.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po_number">Purchase Order No.</Label>
              <Input
                id="po_number"
                value={formData.purchase_order_number}
                onChange={(e) =>
                  setFormData({ ...formData, purchase_order_number: e.target.value })
                }
                placeholder="e.g., PO-12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_note">Delivery Note Ref.</Label>
              <Input
                id="delivery_note"
                value={formData.delivery_note_reference}
                onChange={(e) =>
                  setFormData({ ...formData, delivery_note_reference: e.target.value })
                }
                placeholder="e.g., DN-67890"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Cylinder Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cylinder_code">Cylinder Code *</Label>
                <Input
                  id="cylinder_code"
                  value={formData.cylinder_code}
                  onChange={(e) =>
                    setFormData({ ...formData, cylinder_code: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Refrigerant Type *</Label>
                <Select
                  value={formData.refrigerant_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, refrigerant_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRIGERANT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="initial_weight">Net Weight (kg) *</Label>
                <Input
                  id="initial_weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.initial_weight_kg}
                  onChange={(e) =>
                    setFormData({ ...formData, initial_weight_kg: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tare_weight">Tare Weight (kg)</Label>
                <Input
                  id="tare_weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.tare_weight_kg}
                  onChange={(e) =>
                    setFormData({ ...formData, tare_weight_kg: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch_number">Batch No.</Label>
                <Input
                  id="batch_number"
                  value={formData.batch_number}
                  onChange={(e) =>
                    setFormData({ ...formData, batch_number: e.target.value })
                  }
                />
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
              placeholder="Additional delivery notes..."
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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Processing..." : "Receive Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
