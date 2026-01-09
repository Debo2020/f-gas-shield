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
type MovementType = Database["public"]["Enums"]["movement_type"];

const movementSchema = z.object({
  movement_type: z.enum(["book_out", "book_in", "recovered"] as const),
  refrigerant_type: z.string(),
  weight_kg: z.coerce.number().positive("Weight must be greater than 0"),
  cylinder_reference: z.string().optional(),
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
}

export function GasMovementDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultMovementType = "book_out",
}: GasMovementDialogProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      movement_type: defaultMovementType,
      refrigerant_type: "R-410A",
      weight_kg: 0,
      cylinder_reference: "",
      source: "",
      notes: "",
      movement_date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        movement_type: defaultMovementType,
        refrigerant_type: "R-410A",
        weight_kg: 0,
        cylinder_reference: "",
        source: "",
        notes: "",
        movement_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [open, defaultMovementType, form]);

  const movementType = form.watch("movement_type");

  const onSubmit = async (values: MovementFormValues) => {
    if (!user || !profile?.company_id) {
      toast.error("You must be logged in with a company to record movements");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("refrigerant_movements").insert({
        company_id: profile.company_id,
        engineer_id: user.id,
        engineer_name: profile.full_name || "Unknown",
        movement_type: values.movement_type as MovementType,
        refrigerant_type: values.refrigerant_type as RefrigerantType,
        weight_kg: values.weight_kg,
        cylinder_reference: values.cylinder_reference || null,
        source: values.source || null,
        notes: values.notes || null,
        movement_date: values.movement_date,
      });

      if (error) throw error;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
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
                      <SelectItem value="book_out">Book Out (From Store)</SelectItem>
                      <SelectItem value="book_in">Book In (Return to Store)</SelectItem>
                      <SelectItem value="recovered">Recovered (Decant/Decommission)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="refrigerant_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refrigerant Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
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
                name="cylinder_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cylinder Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {movementType === "recovered" && (
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
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
                {isSubmitting ? "Recording..." : "Record Movement"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
