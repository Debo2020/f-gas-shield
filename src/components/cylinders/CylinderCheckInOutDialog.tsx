import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { CylinderStatusBadge } from "./CylinderStatusBadge";

interface Cylinder {
  id: string;
  cylinder_code: string;
  refrigerant_type: string;
  current_weight_kg: number;
  status: "in_stock" | "checked_out" | "empty" | "disposed";
  checked_out_to: string | null;
}

interface CylinderCheckInOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  cylinder: Cylinder | null;
  action: "check_out" | "check_in";
}

export function CylinderCheckInOutDialog({
  open,
  onOpenChange,
  onSuccess,
  cylinder,
  action,
}: CylinderCheckInOutDialogProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newWeight, setNewWeight] = useState<string>("");

  const handleAction = async () => {
    if (!user || !profile?.company_id || !cylinder) {
      toast.error("Missing required information");
      return;
    }

    setIsSubmitting(true);
    try {
      if (action === "check_out") {
        // Check out cylinder to current user
        const { error } = await supabase
          .from("refrigerant_cylinders")
          .update({
            status: "checked_out",
            checked_out_to: user.id,
            checked_out_at: new Date().toISOString(),
          })
          .eq("id", cylinder.id);

        if (error) throw error;

        // Record movement
        await supabase.from("refrigerant_movements").insert([{
          company_id: profile.company_id,
          engineer_id: user.id,
          engineer_name: profile.full_name || "Unknown",
          movement_type: "book_out" as const,
          refrigerant_type: cylinder.refrigerant_type as any,
          weight_kg: cylinder.current_weight_kg,
          cylinder_reference: cylinder.cylinder_code,
          cylinder_id: cylinder.id,
          movement_date: new Date().toISOString().split("T")[0],
          notes: `Checked out cylinder ${cylinder.cylinder_code}`,
        }]);

        toast.success(`Cylinder ${cylinder.cylinder_code} checked out`);
      } else {
        // Check in cylinder
        const weight = newWeight ? parseFloat(newWeight) : cylinder.current_weight_kg;
        const isEmpty = weight <= 0;

        const { error } = await supabase
          .from("refrigerant_cylinders")
          .update({
            status: isEmpty ? "empty" : "in_stock",
            current_weight_kg: weight,
            checked_out_to: null,
            checked_out_at: null,
          })
          .eq("id", cylinder.id);

        if (error) throw error;

        // Record movement
        await supabase.from("refrigerant_movements").insert([{
          company_id: profile.company_id,
          engineer_id: user.id,
          engineer_name: profile.full_name || "Unknown",
          movement_type: "book_in" as const,
          refrigerant_type: cylinder.refrigerant_type as any,
          weight_kg: weight,
          cylinder_reference: cylinder.cylinder_code,
          cylinder_id: cylinder.id,
          movement_date: new Date().toISOString().split("T")[0],
          notes: `Checked in cylinder ${cylinder.cylinder_code}`,
        }]);

        toast.success(`Cylinder ${cylinder.cylinder_code} checked in`);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to complete action");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cylinder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "check_out" ? (
              <>
                <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                Check Out Cylinder
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-5 w-5 text-green-500" />
                Check In Cylinder
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === "check_out"
              ? "Assign this cylinder to yourself for field use"
              : "Return this cylinder to inventory"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-mono font-bold">{cylinder.cylinder_code}</p>
              <p className="text-sm text-muted-foreground">
                {cylinder.refrigerant_type}
              </p>
            </div>
            <CylinderStatusBadge status={cylinder.status} />
          </div>

          <div className="space-y-2">
            <Label>Current Weight</Label>
            <p className="text-2xl font-bold">{cylinder.current_weight_kg} kg</p>
          </div>

          {action === "check_in" && (
            <div className="space-y-2">
              <Label htmlFor="new-weight">New Weight (kg)</Label>
              <Input
                id="new-weight"
                type="number"
                step="0.01"
                min="0"
                placeholder={cylinder.current_weight_kg.toString()}
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep current weight. Set to 0 to mark as empty.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            disabled={isSubmitting}
            variant={action === "check_out" ? "default" : "default"}
          >
            {isSubmitting
              ? "Processing..."
              : action === "check_out"
              ? "Check Out"
              : "Check In"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
