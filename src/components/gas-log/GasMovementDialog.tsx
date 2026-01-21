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
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { AlertCircle } from "lucide-react";

const REFRIGERANT_TYPES = Constants.public.Enums.refrigerant_type;

type RefrigerantType = Database["public"]["Enums"]["refrigerant_type"];
type MovementType = Database["public"]["Enums"]["movement_type"];

interface Equipment {
  id: string;
  name: string;
  site_name: string;
  refrigerant_type: RefrigerantType;
}

interface Cylinder {
  id: string;
  cylinder_code: string;
  refrigerant_type: RefrigerantType;
  current_weight_kg: number;
  status: string;
}

const MOVEMENT_REASONS = [
  { value: "commissioning", label: "Commissioning (New Installation)" },
  { value: "leak_repair", label: "Leak Repair" },
  { value: "top_up", label: "Top Up / Service" },
  { value: "recovery", label: "Recovery" },
  { value: "disposal", label: "Disposal" },
  { value: "transfer", label: "Transfer Between Sites" },
] as const;

const movementSchema = z.object({
  movement_type: z.enum(["book_out", "book_in", "recovered"] as const),
  refrigerant_type: z.string(),
  weight_kg: z.coerce.number().positive("Weight must be greater than 0"),
  cylinder_id: z.string().optional(),
  cylinder_reference: z.string().optional(),
  equipment_id: z.string().optional(),
  reason: z.string().optional(),
  job_reference: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  movement_date: z.string(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

interface GasMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultMovementType?: MovementType;
  defaultCylinderId?: string;
  defaultEquipmentId?: string;
}

export function GasMovementDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultMovementType = "book_out",
  defaultCylinderId,
  defaultEquipmentId,
}: GasMovementDialogProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [selectedCylinder, setSelectedCylinder] = useState<Cylinder | null>(null);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      movement_type: defaultMovementType,
      refrigerant_type: "R-410A",
      weight_kg: 0,
      cylinder_id: defaultCylinderId || "",
      cylinder_reference: "",
      equipment_id: defaultEquipmentId || "",
      reason: "",
      job_reference: "",
      source: "",
      notes: "",
      movement_date: new Date().toISOString().split("T")[0],
    },
  });

  const movementType = form.watch("movement_type");
  const cylinderId = form.watch("cylinder_id");
  const equipmentId = form.watch("equipment_id");

  // Fetch equipment and cylinders when dialog opens
  useEffect(() => {
    if (open && profile?.company_id) {
      fetchEquipment();
      fetchCylinders();
    }
  }, [open, profile?.company_id]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        movement_type: defaultMovementType,
        refrigerant_type: "R-410A",
        weight_kg: 0,
        cylinder_id: defaultCylinderId || "",
        cylinder_reference: "",
        equipment_id: defaultEquipmentId || "",
        reason: "",
        job_reference: "",
        source: "",
        notes: "",
        movement_date: new Date().toISOString().split("T")[0],
      });
      setSelectedCylinder(null);
    }
  }, [open, defaultMovementType, defaultCylinderId, defaultEquipmentId, form]);

  // Update refrigerant type when cylinder is selected
  useEffect(() => {
    if (cylinderId) {
      const cyl = cylinders.find(c => c.id === cylinderId);
      if (cyl) {
        setSelectedCylinder(cyl);
        form.setValue("refrigerant_type", cyl.refrigerant_type);
        form.setValue("cylinder_reference", cyl.cylinder_code);
      }
    } else {
      setSelectedCylinder(null);
    }
  }, [cylinderId, cylinders, form]);

  // Update refrigerant type when equipment is selected
  useEffect(() => {
    if (equipmentId && movementType === "book_out") {
      const equip = equipment.find(e => e.id === equipmentId);
      if (equip) {
        form.setValue("refrigerant_type", equip.refrigerant_type);
      }
    }
  }, [equipmentId, equipment, movementType, form]);

  const fetchEquipment = async () => {
    if (!profile?.company_id) return;
    
    const { data, error } = await supabase
      .from("equipment")
      .select(`
        id,
        name,
        refrigerant_type,
        sites:site_id(name)
      `)
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (!error && data) {
      setEquipment(data.map((e: any) => ({
        id: e.id,
        name: e.name,
        site_name: e.sites?.name || "Unknown Site",
        refrigerant_type: e.refrigerant_type,
      })));
    }
  };

  const fetchCylinders = async () => {
    if (!profile?.company_id) return;
    
    const { data, error } = await supabase
      .from("refrigerant_cylinders")
      .select("id, cylinder_code, refrigerant_type, current_weight_kg, status")
      .eq("company_id", profile.company_id)
      .in("status", ["in_stock", "checked_out"]);

    if (!error && data) {
      setCylinders(data);
    }
  };

  const onSubmit = async (values: MovementFormValues) => {
    if (!user || !profile?.company_id) {
      toast.error("You must be logged in with a company to record movements");
      return;
    }

    // Validate weight against cylinder available weight for book_out
    if (values.movement_type === "book_out" && selectedCylinder) {
      if (values.weight_kg > Number(selectedCylinder.current_weight_kg)) {
        toast.error(`Cannot book out more than available weight (${selectedCylinder.current_weight_kg} kg)`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Insert the movement record
      const { error } = await supabase.from("refrigerant_movements").insert({
        company_id: profile.company_id,
        engineer_id: user.id,
        engineer_name: profile.full_name || "Unknown",
        movement_type: values.movement_type as MovementType,
        refrigerant_type: values.refrigerant_type as RefrigerantType,
        weight_kg: values.weight_kg,
        cylinder_id: values.cylinder_id || null,
        cylinder_reference: values.cylinder_reference || null,
        equipment_id: values.equipment_id || null,
        reason: values.reason as any || null,
        job_reference: values.job_reference || null,
        source: values.source || null,
        notes: values.notes || null,
        movement_date: values.movement_date,
      });

      if (error) throw error;

      // Update cylinder weight if cylinder was selected
      if (values.cylinder_id && selectedCylinder) {
        let newWeight = Number(selectedCylinder.current_weight_kg);
        
        if (values.movement_type === "book_out") {
          newWeight -= values.weight_kg;
        } else if (values.movement_type === "book_in" || values.movement_type === "recovered") {
          newWeight += values.weight_kg;
        }

        await supabase
          .from("refrigerant_cylinders")
          .update({ 
            current_weight_kg: Math.max(0, newWeight),
            status: (newWeight <= 0 ? "empty" : selectedCylinder.status) as "in_stock" | "checked_out" | "empty" | "disposed",
          })
          .eq("id", values.cylinder_id);
      }

      toast.success("Movement recorded successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error recording movement:", error);
      toast.error(error.message || "Failed to record movement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (movementType) {
      case "book_out":
        return "Book Out Refrigerant";
      case "book_in":
        return "Book In Refrigerant";
      case "recovered":
        return "Record Recovered Refrigerant";
      default:
        return "Record Gas Movement";
    }
  };

  const getDescription = () => {
    switch (movementType) {
      case "book_out":
        return "Record refrigerant taken from stock for use on equipment (Article 6 compliant)";
      case "book_in":
        return "Record refrigerant returned to stock from a job";
      case "recovered":
        return "Record refrigerant recovered during decant, decommission, or leak repair";
      default:
        return "";
    }
  };

  // Filter cylinders based on movement type
  const availableCylinders = cylinders.filter(c => {
    if (movementType === "book_out") {
      return c.status === "in_stock" && Number(c.current_weight_kg) > 0;
    }
    return c.status === "checked_out" || c.status === "in_stock";
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="book_out">Book Out (From Store to Job)</SelectItem>
                      <SelectItem value="book_in">Book In (Return to Store)</SelectItem>
                      <SelectItem value="recovered">Recovered (Decant/Decommission)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cylinder Selection */}
            <FormField
              control={form.control}
              name="cylinder_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Cylinder</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select from inventory (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Manual Entry</SelectItem>
                      {availableCylinders.map((cyl) => (
                        <SelectItem key={cyl.id} value={cyl.id}>
                          {cyl.cylinder_code} - {cyl.refrigerant_type} ({Number(cyl.current_weight_kg).toFixed(1)} kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCylinder && (
                    <FormDescription className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Available: {Number(selectedCylinder.current_weight_kg).toFixed(2)} kg
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Equipment Selection - for book_out */}
            {movementType === "book_out" && (
              <FormField
                control={form.control}
                name="equipment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Equipment *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipment.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.name} ({eq.site_name}) - {eq.refrigerant_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Required for Article 6 compliance - links gas to specific system
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Reason for Addition - for book_out */}
            {movementType === "book_out" && (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Addition *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOVEMENT_REASONS.filter(r => 
                          ["commissioning", "leak_repair", "top_up"].includes(r.value)
                        ).map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Required for F-Gas compliance records
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="refrigerant_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refrigerant Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!cylinderId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select refrigerant" />
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

              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={selectedCylinder && movementType === "book_out" 
                          ? Number(selectedCylinder.current_weight_kg) 
                          : undefined
                        }
                        placeholder="0.00"
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
                name="movement_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Service ticket #" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Manual cylinder reference if no cylinder selected */}
            {!cylinderId && (
              <FormField
                control={form.control}
                name="cylinder_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cylinder Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Manual cylinder code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Source - for recovered type */}
            {movementType === "recovered" && (
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recovery Source *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="decant">Decant</SelectItem>
                        <SelectItem value="decommission">Decommission</SelectItem>
                        <SelectItem value="leak_repair">Leak Repair</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details for audit trail..."
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
                {isSubmitting ? "Recording..." : "Record Movement"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
