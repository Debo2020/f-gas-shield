import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, FileText, Upload } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Cylinder = Database["public"]["Tables"]["refrigerant_cylinders"]["Row"];

const DISPOSAL_METHODS = [
  { value: "returned_to_supplier", label: "Returned to Supplier/Wholesaler" },
  { value: "sent_for_destruction", label: "Sent for Destruction (EPA Licensed)" },
  { value: "reclaimed", label: "Sent for Reclamation" },
] as const;

const disposalSchema = z.object({
  disposal_method: z.enum(["returned_to_supplier", "sent_for_destruction", "reclaimed"]),
  disposal_date: z.string().min(1, "Disposal date is required"),
  disposal_reference: z.string().min(1, "Reference number is required"),
  carrier_name: z.string().optional(),
  notes: z.string().optional(),
});

type DisposalFormValues = z.infer<typeof disposalSchema>;

interface CylinderDisposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  cylinder: Cylinder | null;
}

export function CylinderDisposalDialog({
  open,
  onOpenChange,
  onSuccess,
  cylinder,
}: CylinderDisposalDialogProps) {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DisposalFormValues>({
    resolver: zodResolver(disposalSchema),
    defaultValues: {
      disposal_method: "returned_to_supplier",
      disposal_date: new Date().toISOString().split("T")[0],
      disposal_reference: "",
      carrier_name: "",
      notes: "",
    },
  });

  const onSubmit = async (values: DisposalFormValues) => {
    if (!cylinder || !profile?.company_id) {
      toast.error("Missing required information");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update cylinder with disposal information
      const { error } = await supabase
        .from("refrigerant_cylinders")
        .update({
          status: "disposed",
          disposal_method: values.disposal_method as any,
          disposal_date: values.disposal_date,
          disposal_reference: values.disposal_reference,
          notes: cylinder.notes 
            ? `${cylinder.notes}\n\nDisposal: ${values.notes || "No additional notes"}\nCarrier: ${values.carrier_name || "N/A"}`
            : `Disposal: ${values.notes || "No additional notes"}\nCarrier: ${values.carrier_name || "N/A"}`,
        })
        .eq("id", cylinder.id);

      if (error) throw error;

      toast.success("Cylinder marked as disposed", {
        description: "Remember to upload the consignment note in Documents",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error disposing cylinder:", error);
      toast.error(error.message || "Failed to dispose cylinder");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cylinder) return null;

  const isRecovery = cylinder.is_recovery_cylinder;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dispose Cylinder</DialogTitle>
          <DialogDescription>
            Record the disposal of {cylinder.cylinder_code} ({Number(cylinder.current_weight_kg).toFixed(2)} kg {cylinder.refrigerant_type})
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-500">Hazardous Waste Requirement</AlertTitle>
          <AlertDescription className="text-amber-600 text-sm">
            {isRecovery 
              ? "Recovered refrigerant is classified as hazardous waste. You must obtain a Hazardous Waste Consignment Note from the carrier/wholesaler."
              : "Empty cylinders must be returned to the supplier. Keep the return documentation for at least 3 years."
            }
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="disposal_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disposal Method *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DISPOSAL_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="disposal_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disposal Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disposal_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Consignment note #" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Consignment note or return receipt
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="carrier_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carrier/Collector Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Waste carrier company" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional disposal details..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-3 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>
                  After disposal, upload the consignment note via Documents → Compliance → Consignment Notes
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} variant="destructive">
                {isSubmitting ? "Processing..." : "Confirm Disposal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
