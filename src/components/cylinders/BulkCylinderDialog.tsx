import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownToLine, ArrowUpFromLine, Package } from "lucide-react";
import { CylinderStatusBadge } from "./CylinderStatusBadge";
import type { Database } from "@/integrations/supabase/types";

type Cylinder = Database["public"]["Tables"]["refrigerant_cylinders"]["Row"];

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
}

interface BulkCylinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  cylinders: Cylinder[];
  action: "bulk_check_out" | "bulk_check_in";
}

export function BulkCylinderDialog({
  open,
  onOpenChange,
  onSuccess,
  cylinders,
  action,
}: BulkCylinderDialogProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>("");

  // Filter cylinders based on action
  const availableCylinders = cylinders.filter((c) =>
    action === "bulk_check_out"
      ? c.status === "in_stock"
      : c.status === "checked_out"
  );

  // Fetch team members for check-out
  useEffect(() => {
    if (open && profile?.company_id && action === "bulk_check_out") {
      const fetchTeamMembers = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .eq("company_id", profile.company_id);

        if (!error && data) {
          setTeamMembers(data);
        }
      };
      fetchTeamMembers();
    }
  }, [open, profile?.company_id, action]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      if (user?.id) {
        setSelectedEngineerId(user.id);
      }
    }
  }, [open, user?.id]);

  const toggleCylinder = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === availableCylinders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableCylinders.map((c) => c.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!user || !profile?.company_id) {
      toast.error("Missing required information");
      return;
    }

    if (selectedIds.size === 0) {
      toast.error("Please select at least one cylinder");
      return;
    }

    if (action === "bulk_check_out" && !selectedEngineerId) {
      toast.error("Please select an engineer");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCylinders = availableCylinders.filter((c) =>
        selectedIds.has(c.id)
      );

      if (action === "bulk_check_out") {
        const selectedMember = teamMembers.find(
          (m) => m.user_id === selectedEngineerId
        );

        // Update all selected cylinders
        const { error: updateError } = await supabase
          .from("refrigerant_cylinders")
          .update({
            status: "checked_out",
            checked_out_to: selectedEngineerId,
            checked_out_at: new Date().toISOString(),
          })
          .in(
            "id",
            selectedCylinders.map((c) => c.id)
          );

        if (updateError) throw updateError;

        // Create movement records for each cylinder
        const movements = selectedCylinders.map((cylinder) => ({
          company_id: profile.company_id!,
          engineer_id: selectedEngineerId,
          engineer_name: selectedMember?.full_name || "Unknown",
          movement_type: "book_out" as const,
          refrigerant_type: cylinder.refrigerant_type as any,
          weight_kg: cylinder.current_weight_kg,
          cylinder_reference: cylinder.cylinder_code,
          cylinder_id: cylinder.id,
          movement_date: new Date().toISOString().split("T")[0],
          notes: `Bulk check-out to ${selectedMember?.full_name}${
            selectedEngineerId !== user.id ? ` by ${profile.full_name}` : ""
          }`,
        }));

        await supabase.from("refrigerant_movements").insert(movements);

        toast.success(
          `${selectedCylinders.length} cylinders checked out to ${selectedMember?.full_name}`
        );
      } else {
        // Bulk check-in
        const { error: updateError } = await supabase
          .from("refrigerant_cylinders")
          .update({
            status: "in_stock",
            checked_out_to: null,
            checked_out_at: null,
          })
          .in(
            "id",
            selectedCylinders.map((c) => c.id)
          );

        if (updateError) throw updateError;

        // Create movement records for each cylinder
        const movements = selectedCylinders.map((cylinder) => ({
          company_id: profile.company_id!,
          engineer_id: user.id,
          engineer_name: profile.full_name || "Unknown",
          movement_type: "book_in" as const,
          refrigerant_type: cylinder.refrigerant_type as any,
          weight_kg: cylinder.current_weight_kg,
          cylinder_reference: cylinder.cylinder_code,
          cylinder_id: cylinder.id,
          movement_date: new Date().toISOString().split("T")[0],
          notes: `Bulk check-in`,
        }));

        await supabase.from("refrigerant_movements").insert(movements);

        toast.success(`${selectedCylinders.length} cylinders checked in`);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to complete bulk action");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalWeight = availableCylinders
    .filter((c) => selectedIds.has(c.id))
    .reduce((sum, c) => sum + Number(c.current_weight_kg), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "bulk_check_out" ? (
              <>
                <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                Bulk Check Out
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-5 w-5 text-green-500" />
                Bulk Check In
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === "bulk_check_out"
              ? "Select multiple cylinders to check out to a team member"
              : "Select multiple cylinders to return to inventory"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {action === "bulk_check_out" && (
            <div className="space-y-2">
              <Label htmlFor="engineer-select">Assign To</Label>
              <Select
                value={selectedEngineerId}
                onValueChange={setSelectedEngineerId}
              >
                <SelectTrigger id="engineer-select">
                  <SelectValue placeholder="Select engineer" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <span>{member.full_name}</span>
                      {member.user_id === user?.id && (
                        <span className="text-muted-foreground ml-1">
                          (You)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Select Cylinders ({selectedIds.size} of{" "}
                {availableCylinders.length})
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="h-auto py-1 px-2 text-xs"
              >
                {selectedIds.size === availableCylinders.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            {availableCylinders.length === 0 ? (
              <div className="p-6 text-center border rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No cylinders available for{" "}
                  {action === "bulk_check_out" ? "check-out" : "check-in"}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[250px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {availableCylinders.map((cylinder) => (
                    <label
                      key={cylinder.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(cylinder.id)}
                        onCheckedChange={() => toggleCylinder(cylinder.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-bold text-sm">
                          {cylinder.cylinder_code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cylinder.refrigerant_type} •{" "}
                          {Number(cylinder.current_weight_kg).toFixed(1)} kg
                        </p>
                      </div>
                      <CylinderStatusBadge status={cylinder.status} />
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selected</span>
                <span className="font-medium">
                  {selectedIds.size} cylinder{selectedIds.size !== 1 && "s"}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total Weight</span>
                <span className="font-medium">{totalWeight.toFixed(1)} kg</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkAction}
            disabled={isSubmitting || selectedIds.size === 0}
          >
            {isSubmitting
              ? "Processing..."
              : action === "bulk_check_out"
              ? `Check Out ${selectedIds.size} Cylinder${
                  selectedIds.size !== 1 ? "s" : ""
                }`
              : `Check In ${selectedIds.size} Cylinder${
                  selectedIds.size !== 1 ? "s" : ""
                }`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
