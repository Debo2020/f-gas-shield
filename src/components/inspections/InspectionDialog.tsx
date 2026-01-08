import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InspectionForm, type InspectionFormValues } from "./InspectionForm";
import { ClipboardCheck } from "lucide-react";

interface InspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InspectionFormValues) => Promise<void>;
  isSubmitting?: boolean;
  companyId: string;
  currentUserName?: string;
  currentUserCertificate?: string | null;
  preselectedEquipmentId?: string;
}

export function InspectionDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  companyId,
  currentUserName,
  currentUserCertificate,
  preselectedEquipmentId,
}: InspectionDialogProps) {
  const handleSubmit = async (values: InspectionFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Record Inspection
          </DialogTitle>
          <DialogDescription>
            Record an inspection for equipment. The next inspection due date will be calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <InspectionForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
          companyId={companyId}
          currentUserName={currentUserName}
          currentUserCertificate={currentUserCertificate}
          defaultValues={
            preselectedEquipmentId ? { equipment_id: preselectedEquipmentId } : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}
