import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

const REFRIGERANT_TYPES = Constants.public.Enums.refrigerant_type;
type RefrigerantType = Database["public"]["Enums"]["refrigerant_type"];

const cylinderSchema = z.object({
  cylinder_code: z.string().min(1, "Cylinder code is required"),
  refrigerant_type: z.string(),
  initial_weight_kg: z.coerce.number().positive("Weight must be greater than 0"),
  current_weight_kg: z.coerce.number().min(0, "Weight cannot be negative"),
  tare_weight_kg: z.coerce.number().min(0).optional(),
  supplier: z.string().optional(),
  batch_number: z.string().optional(),
  purchase_date: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

type CylinderFormValues = z.infer<typeof cylinderSchema>;

interface CylinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  cylinder?: any;
}

export function CylinderDialog({
  open,
  onOpenChange,
  onSuccess,
  cylinder,
}: CylinderDialogProps) {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!cylinder;

  const form = useForm<CylinderFormValues>({
    resolver: zodResolver(cylinderSchema),
    defaultValues: {
      cylinder_code: "",
      refrigerant_type: "R-410A",
      initial_weight_kg: 0,
      current_weight_kg: 0,
      tare_weight_kg: 0,
      supplier: "",
      batch_number: "",
      purchase_date: "",
      expiry_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (cylinder) {
        form.reset({
          cylinder_code: cylinder.cylinder_code || "",
          refrigerant_type: cylinder.refrigerant_type || "R-410A",
          initial_weight_kg: cylinder.initial_weight_kg || 0,
          current_weight_kg: cylinder.current_weight_kg || 0,
          tare_weight_kg: cylinder.tare_weight_kg || 0,
          supplier: cylinder.supplier || "",
          batch_number: cylinder.batch_number || "",
          purchase_date: cylinder.purchase_date || "",
          expiry_date: cylinder.expiry_date || "",
          notes: cylinder.notes || "",
        });
      } else {
        form.reset({
          cylinder_code: `CYL-${Date.now().toString(36).toUpperCase()}`,
          refrigerant_type: "R-410A",
          initial_weight_kg: 0,
          current_weight_kg: 0,
          tare_weight_kg: 0,
          supplier: "",
          batch_number: "",
          purchase_date: "",
          expiry_date: "",
          notes: "",
        });
      }
    }
  }, [open, cylinder, form]);

  const onSubmit = async (values: CylinderFormValues) => {
    if (!profile?.company_id) {
      toast.error("You must be logged in with a company");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        company_id: profile.company_id,
        cylinder_code: values.cylinder_code,
        refrigerant_type: values.refrigerant_type as RefrigerantType,
        initial_weight_kg: values.initial_weight_kg,
        current_weight_kg: values.current_weight_kg || values.initial_weight_kg,
        tare_weight_kg: values.tare_weight_kg || 0,
        supplier: values.supplier || null,
        batch_number: values.batch_number || null,
        purchase_date: values.purchase_date || null,
        expiry_date: values.expiry_date || null,
        notes: values.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("refrigerant_cylinders")
          .update(data)
          .eq("id", cylinder.id);
        if (error) throw error;
        toast.success("Cylinder updated successfully");
      } else {
        const { error } = await supabase
          .from("refrigerant_cylinders")
          .insert(data);
        if (error) throw error;
        toast.success("Cylinder added to inventory");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving cylinder:", error);
      toast.error(error.message || "Failed to save cylinder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Cylinder" : "Add New Cylinder"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cylinder_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cylinder Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CYL-XXX"
                        {...field}
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refrigerant_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refrigerant Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REFRIGERANT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="initial_weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Weight (kg) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tare_weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tare Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batch_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Batch #" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Cylinder"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
