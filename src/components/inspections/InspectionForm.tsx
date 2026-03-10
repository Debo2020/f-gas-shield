import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ClipboardCheck, User, Thermometer, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const INSPECTION_RESULTS = [
  { value: "pass", label: "Pass" },
  { value: "pass_with_observations", label: "Pass with Observations" },
  { value: "fail", label: "Fail" },
  { value: "deferred", label: "Deferred" },
] as const;

const inspectionSchema = z.object({
  equipment_id: z.string().min(1, "Please select equipment"),
  inspection_date: z.date({ required_error: "Inspection date is required" }),
  inspector_name: z.string().min(2, "Inspector name is required").max(100),
  inspector_certificate_number: z.string().max(50).optional().or(z.literal("")),
  result: z.enum(["pass", "pass_with_observations", "fail", "deferred"]),
  leak_check_performed: z.boolean(),
  leak_detected: z.boolean(),
  leak_location: z.string().max(200).optional().or(z.literal("")),
  leak_repaired: z.boolean().optional(),
  refrigerant_added_kg: z.coerce.number().min(0).optional(),
  refrigerant_recovered_kg: z.coerce.number().min(0).optional(),
  findings: z.string().max(2000).optional().or(z.literal("")),
  recommendations: z.string().max(2000).optional().or(z.literal("")),
});

export type InspectionFormValues = z.infer<typeof inspectionSchema>;

interface Equipment {
  id: string;
  name: string;
  sites: { name: string };
}

interface InspectionFormProps {
  onSubmit: (values: InspectionFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<InspectionFormValues>;
  submitLabel?: string;
  companyId: string;
  currentUserName?: string;
  currentUserCertificate?: string | null;
  lockedEquipmentId?: string;
  siteId?: string;
}

export function InspectionForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultValues,
  submitLabel = "Record Inspection",
  companyId,
  currentUserName = "",
  currentUserCertificate = null,
  lockedEquipmentId,
  siteId,
}: InspectionFormProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      equipment_id: defaultValues?.equipment_id || "",
      inspection_date: defaultValues?.inspection_date || new Date(),
      inspector_name: defaultValues?.inspector_name || currentUserName,
      inspector_certificate_number: defaultValues?.inspector_certificate_number || currentUserCertificate || "",
      result: defaultValues?.result || "pass",
      leak_check_performed: defaultValues?.leak_check_performed ?? true,
      leak_detected: defaultValues?.leak_detected ?? false,
      leak_location: defaultValues?.leak_location || "",
      leak_repaired: defaultValues?.leak_repaired,
      refrigerant_added_kg: defaultValues?.refrigerant_added_kg,
      refrigerant_recovered_kg: defaultValues?.refrigerant_recovered_kg,
      findings: defaultValues?.findings || "",
      recommendations: defaultValues?.recommendations || "",
    },
  });

  const leakDetected = form.watch("leak_detected");
  const leakCheckPerformed = form.watch("leak_check_performed");

  useEffect(() => {
    const fetchEquipment = async () => {
      const { data } = await supabase
        .from("equipment")
        .select("id, name, sites!inner(name)")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");

      setEquipment(data || []);
      setIsLoadingEquipment(false);
    };

    fetchEquipment();
  }, [companyId]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Equipment Selection */}
        <FormField
          control={form.control}
          name="equipment_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                Equipment *
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingEquipment ? "Loading..." : "Select equipment"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {equipment.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name} ({eq.sites.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date and Result */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="inspection_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Inspection Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : "Select date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  Result *
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INSPECTION_RESULTS.map((result) => (
                      <SelectItem key={result.value} value={result.value}>
                        {result.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Inspector Details */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Inspector Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="inspector_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspector Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inspector_certificate_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>F-Gas Certificate Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Certificate number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Leak Check */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Leak Check
          </h4>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="leak_check_performed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Leak check performed</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {leakCheckPerformed && (
              <>
                <FormField
                  control={form.control}
                  name="leak_detected"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Leak detected</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {leakDetected && (
                  <div className="ml-6 space-y-4">
                    <FormField
                      control={form.control}
                      name="leak_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leak Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Describe leak location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="leak_repaired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Leak repaired</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Refrigerant */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="refrigerant_added_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refrigerant Added (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="refrigerant_recovered_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refrigerant Recovered (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Findings & Recommendations */}
        <FormField
          control={form.control}
          name="findings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Findings</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe any issues found during inspection"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recommendations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recommendations</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Recommended actions or follow-up work"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
