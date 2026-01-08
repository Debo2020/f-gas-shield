import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SiteForm, type SiteFormValues } from "./SiteForm";
import { MapPin, Pencil } from "lucide-react";

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

interface SiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SiteFormValues) => Promise<void>;
  site?: Site | null;
  isSubmitting?: boolean;
}

export function SiteDialog({
  open,
  onOpenChange,
  onSubmit,
  site,
  isSubmitting = false,
}: SiteDialogProps) {
  const isEditing = !!site;

  const handleSubmit = async (values: SiteFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Edit Site
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5 text-primary" />
                Add New Site
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the site details below"
              : "Enter the details for your new site location"}
          </DialogDescription>
        </DialogHeader>

        <SiteForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
          defaultValues={
            site
              ? {
                  name: site.name,
                  address: site.address,
                  city: site.city || "",
                  postcode: site.postcode || "",
                  contact_name: site.contact_name || "",
                  contact_phone: site.contact_phone || "",
                  contact_email: site.contact_email || "",
                  notes: site.notes || "",
                }
              : undefined
          }
          submitLabel={isEditing ? "Save Changes" : "Add Site"}
        />
      </DialogContent>
    </Dialog>
  );
}
