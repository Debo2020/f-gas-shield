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
} from "@/components/ui/form";
import { Building2, Mail, Phone, MapPin } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(100, "Company name must be less than 100 characters"),
  address: z.string().max(500, "Address must be less than 500 characters").optional().or(z.literal("")),
  phone: z.string().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  gas_safe_reg_no: z.string().max(50, "Must be less than 50 characters").optional().or(z.literal("")),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanyDetailsFormProps {
  onSubmit: (values: CompanyFormValues) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<CompanyFormValues>;
  submitLabel?: string;
}

export function CompanyDetailsForm({
  onSubmit,
  isSubmitting = false,
  defaultValues,
  submitLabel = "Continue",
}: CompanyDetailsFormProps) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: defaultValues?.name || "",
      address: defaultValues?.address || "",
      phone: defaultValues?.phone || "",
      email: defaultValues?.email || "",
      gas_safe_reg_no: defaultValues?.gas_safe_reg_no || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Company Name *
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter your company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Business Address
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter your business address"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 020 1234 5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Company Email
                </FormLabel>
                <FormControl>
                  <Input placeholder="company@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="gas_safe_reg_no"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Gas Safe Registration Number
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. 123456" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
