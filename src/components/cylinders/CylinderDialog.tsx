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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { AlertTriangle, Recycle } from "lucide-react";

const REFRIGERANT_TYPES = Constants.public.Enums.refrigerant_type;
type RefrigerantType = Database["public"]["Enums"]["refrigerant_type"];

const IDENTIFIER_SOURCES = ["internal", "boc", "linde", "a_gas", "other"] as const;
type IdentifierSource = typeof IDENTIFIER_SOURCES[number];

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
  is_recovery_cylinder: z.boolean().default(false),
  manufacturer_serial: z.string().max(120).optional(),
  supplier_barcode: z.string().max(120).optional(),
  rfid_tag: z.string().max(120).optional(),
  identifier_source: z.enum(IDENTIFIER_SOURCES).default("internal"),
});

type CylinderFormValues = z.infer<typeof cylinderSchema>;

interface CylinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  cylinder?: any;
  defaultIsRecovery?: boolean;
}

export function CylinderDialog({
  open,
  onOpenChange,
  onSuccess,
  cylinder,
  defaultIsRecovery = false,
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
      is_recovery_cylinder: defaultIsRecovery,
      manufacturer_serial: "",
      supplier_barcode: "",
      rfid_tag: "",
      identifier_source: "internal",
    },
  });

  const isRecoveryCylinder = form.watch("is_recovery_cylinder");

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
          is_recovery_cylinder: cylinder.is_recovery_cylinder || false,
          manufacturer_serial: cylinder.manufacturer_serial || "",
          supplier_barcode: cylinder.supplier_barcode || "",
          rfid_tag: cylinder.rfid_tag || "",
          identifier_source: (cylinder.identifier_source as IdentifierSource) || "internal",
        });
      } else {
        const prefix = defaultIsRecovery ? "REC" : "CYL";
        form.reset({
          cylinder_code: `${prefix}-${Date.now().toString(36).toUpperCase()}`,
          refrigerant_type: "R-410A",
          initial_weight_kg: defaultIsRecovery ? 0 : 0,
          current_weight_kg: 0,
          tare_weight_kg: 0,
          supplier: "",
          batch_number: "",
          purchase_date: "",
          expiry_date: "",
          notes: "",
          is_recovery_cylinder: defaultIsRecovery,
          manufacturer_serial: "",
          supplier_barcode: "",
          rfid_tag: "",
          identifier_source: "internal",
        });
      }
    }
  }, [open, cylinder, defaultIsRecovery, form]);

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
        is_recovery_cylinder: values.is_recovery_cylinder,
        manufacturer_serial: values.manufacturer_serial?.trim() || null,
        supplier_barcode: values.supplier_barcode?.trim() || null,
        rfid_tag: values.rfid_tag?.trim() || null,
        identifier_source: values.identifier_source,
        // Recovery cylinders start empty
        status: values.is_recovery_cylinder ? "empty" as const : "in_stock" as const,
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
        toast.success(values.is_recovery_cylinder 
          ? "Recovery cylinder added to inventory" 
          : "Cylinder added to inventory"
        );
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
            {isEditing ? "Edit Cylinder" : isRecoveryCylinder ? "Add Recovery Cylinder" : "Add New Cylinder"}
          </DialogTitle>
          {isRecoveryCylinder && !isEditing && (
            <DialogDescription className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Recovery cylinders are for collecting contaminated refrigerant
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Recovery Cylinder Toggle */}
            {!isEditing && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <Recycle className={`h-5 w-5 ${isRecoveryCylinder ? "text-amber-500" : "text-muted-foreground"}`} />
                  <div>
                    <Label htmlFor="recovery-toggle" className="font-medium">
                      Recovery Cylinder
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      For collecting recovered/dirty gas
                    </p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="is_recovery_cylinder"
                  render={({ field }) => (
                    <Switch
                      id="recovery-toggle"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        // Update cylinder code prefix
                        const prefix = checked ? "REC" : "CYL";
                        form.setValue("cylinder_code", `${prefix}-${Date.now().toString(36).toUpperCase()}`);
                        // Recovery cylinders start with 0 weight
                        if (checked) {
                          form.setValue("initial_weight_kg", 0);
                          form.setValue("current_weight_kg", 0);
                        }
                      }}
                    />
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cylinder_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cylinder Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isRecoveryCylinder ? "REC-XXX" : "CYL-XXX"}
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
                    <FormLabel>
                      {isRecoveryCylinder ? "Capacity (kg)" : "Initial Weight (kg)"} *
                    </FormLabel>
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
                    <FormDescription className="text-xs">
                      {isRecoveryCylinder ? "Contents weight" : "Remaining"}
                    </FormDescription>
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
                    <FormDescription className="text-xs">Empty cylinder</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isRecoveryCylinder && (
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
                      <FormDescription className="text-xs">
                        For purchase record tracking
                      </FormDescription>
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
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRecoveryCylinder ? "Added Date" : "Purchase Date"}</FormLabel>
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
                      placeholder={isRecoveryCylinder 
                        ? "Recovery cylinder details..." 
                        : "Optional notes..."
                      }
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
