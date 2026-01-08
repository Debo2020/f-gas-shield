import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EquipmentForm, type EquipmentFormValues } from "./EquipmentForm";
import { Thermometer, Pencil } from "lucide-react";

interface Equipment {
  id: string;
  site_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  refrigerant_type: string;
  refrigerant_charge_kg: number;
  installation_date: string | null;
  inspection_frequency_months: number | null;
  location_description: string | null;
  notes: string | null;
}

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EquipmentFormValues) => Promise<void>;
  equipment?: Equipment | null;
  isSubmitting?: boolean;
  companyId: string;
}

export function EquipmentDialog({
  open,
  onOpenChange,
  onSubmit,
  equipment,
  isSubmitting = false,
  companyId,
}: EquipmentDialogProps) {
  const isEditing = !!equipment;

  const handleSubmit = async (values: EquipmentFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Edit Equipment
              </>
            ) : (
              <>
                <Thermometer className="h-5 w-5 text-primary" />
                Register New Equipment
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the equipment details below"
              : "Enter the details for your refrigeration equipment"}
          </DialogDescription>
        </DialogHeader>

        <EquipmentForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
          companyId={companyId}
          defaultValues={
            equipment
              ? {
                  site_id: equipment.site_id,
                  name: equipment.name,
                  manufacturer: equipment.manufacturer || "",
                  model: equipment.model || "",
                  serial_number: equipment.serial_number || "",
                  asset_tag: equipment.asset_tag || "",
                  refrigerant_type: equipment.refrigerant_type as any,
                  refrigerant_charge_kg: equipment.refrigerant_charge_kg,
                  installation_date: equipment.installation_date
                    ? new Date(equipment.installation_date)
                    : undefined,
                  inspection_frequency_months: equipment.inspection_frequency_months || 12,
                  location_description: equipment.location_description || "",
                  notes: equipment.notes || "",
                }
              : undefined
          }
          submitLabel={isEditing ? "Save Changes" : "Register Equipment"}
        />
      </DialogContent>
    </Dialog>
  );
}
