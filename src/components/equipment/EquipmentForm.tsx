import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, Thermometer, Building, Tag, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const REFRIGERANT_TYPES = [
  "R-32",
  "R-134a",
  "R-404A",
  "R-407C",
  "R-410A",
  "R-422D",
  "R-448A",
  "R-449A",
  "R-452A",
  "R-454B",
  "R-507A",
  "R-744",
  "Other",
] as const;

const equipmentSchema = z.object({
  site_id: z.string().min(1, "Please select a site"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  manufacturer: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  serial_number: z.string().max(100).optional().or(z.literal("")),
  asset_tag: z.string().max(50).optional().or(z.literal("")),
  refrigerant_type: z.enum(REFRIGERANT_TYPES),
  refrigerant_charge_kg: z.coerce.number().min(0.001, "Charge must be greater than 0"),
  installation_date: z.date().optional(),
  inspection_frequency_months: z.coerce.number().int().min(1).max(24).optional(),
  location_description: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type EquipmentFormValues = z.infer<typeof equipmentSchema>;

interface Site {
  id: string;
  name: string;
}

interface EquipmentFormProps {
  onSubmit: (values: EquipmentFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<EquipmentFormValues>;
  submitLabel?: string;
  companyId: string;
}

export function EquipmentForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultValues,
  submitLabel = "Add Equipment",
  companyId,
}: EquipmentFormProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(true);

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      site_id: defaultValues?.site_id || "",
      name: defaultValues?.name || "",
      manufacturer: defaultValues?.manufacturer || "",
      model: defaultValues?.model || "",
      serial_number: defaultValues?.serial_number || "",
      asset_tag: defaultValues?.asset_tag || "",
      refrigerant_type: defaultValues?.refrigerant_type || "R-410A",
      refrigerant_charge_kg: defaultValues?.refrigerant_charge_kg || 0,
      installation_date: defaultValues?.installation_date,
      inspection_frequency_months: defaultValues?.inspection_frequency_months || 12,
      location_description: defaultValues?.location_description || "",
      notes: defaultValues?.notes || "",
    },
  });

  useEffect(() => {
    const fetchSites = async () => {
      const { data } = await supabase
        .from("sites")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      
      setSites(data || []);
      setIsLoadingSites(false);
    };

    fetchSites();
  }, [companyId]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Site Selection */}
        <FormField
          control={form.control}
          name="site_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                Site *
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingSites ? "Loading sites..." : "Select a site"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Equipment Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Chiller Unit 1, Cold Room A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Manufacturer & Model */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="manufacturer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manufacturer</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Daikin, Carrier" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="Model number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Serial Number & Asset Tag */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input placeholder="Equipment serial number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="asset_tag"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Asset Tag
                </FormLabel>
                <FormControl>
                  <Input placeholder="Your internal ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* F-Gas Details */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            Refrigerant Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="refrigerant_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refrigerant Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              name="refrigerant_charge_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Charge Amount (kg) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" min="0" placeholder="0.000" {...field} />
                  </FormControl>
                  <FormDescription>
                    CO₂ equivalent will be calculated automatically
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Installation & Inspection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="installation_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Installation Date</FormLabel>
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
            name="inspection_frequency_months"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inspection Frequency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="3">Every 3 months</SelectItem>
                    <SelectItem value="6">Every 6 months</SelectItem>
                    <SelectItem value="12">Every 12 months</SelectItem>
                    <SelectItem value="24">Every 24 months</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Based on CO₂ equivalent and F-Gas requirements
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location Description */}
        <FormField
          control={form.control}
          name="location_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Plant room, Roof level, Basement" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Notes
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional information about this equipment"
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
