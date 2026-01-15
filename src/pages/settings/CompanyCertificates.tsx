import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  Building2,
} from "lucide-react";

const CERTIFICATE_TYPES = [
  { value: "refcom", label: "REFCOM Elite" },
  { value: "quidos", label: "Quidos" },
  { value: "fgas_company", label: "F-Gas Company Registration" },
  { value: "other", label: "Other" },
] as const;

const certificateSchema = z.object({
  certificate_type: z.enum(["refcom", "quidos", "fgas_company", "other"]),
  certificate_number: z.string().min(1, "Certificate number is required"),
  issued_date: z.string().min(1, "Issue date is required"),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

type CertificateFormValues = z.infer<typeof certificateSchema>;

interface Certificate {
  id: string;
  certificate_type: string;
  certificate_number: string;
  issued_date: string;
  expiry_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export default function CompanyCertificates() {
  const { profile, hasRole } = useAuth();
  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canManage = isOwner || isManager;

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      certificate_type: "refcom",
      certificate_number: "",
      issued_date: "",
      expiry_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (profile?.company_id) {
      fetchCertificates();
    }
  }, [profile?.company_id]);

  const fetchCertificates = async () => {
    if (!profile?.company_id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_certificates")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (cert?: Certificate) => {
    if (cert) {
      setEditingCert(cert);
      form.reset({
        certificate_type: cert.certificate_type as any,
        certificate_number: cert.certificate_number,
        issued_date: cert.issued_date,
        expiry_date: cert.expiry_date || "",
        notes: cert.notes || "",
      });
    } else {
      setEditingCert(null);
      form.reset({
        certificate_type: "refcom",
        certificate_number: "",
        issued_date: "",
        expiry_date: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (values: CertificateFormValues) => {
    if (!profile?.company_id) return;

    setIsSubmitting(true);
    try {
      const data = {
        company_id: profile.company_id,
        certificate_type: values.certificate_type,
        certificate_number: values.certificate_number,
        issued_date: values.issued_date,
        expiry_date: values.expiry_date || null,
        notes: values.notes || null,
        is_active: true,
      };

      if (editingCert) {
        const { error } = await supabase
          .from("company_certificates")
          .update(data)
          .eq("id", editingCert.id);
        if (error) throw error;
        toast.success("Certificate updated");
      } else {
        const { error } = await supabase
          .from("company_certificates")
          .insert(data);
        if (error) throw error;
        toast.success("Certificate added");
      }

      setDialogOpen(false);
      fetchCertificates();
    } catch (error: any) {
      toast.error(error.message || "Failed to save certificate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cert: Certificate) => {
    if (!confirm(`Delete ${cert.certificate_number}?`)) return;

    try {
      const { error } = await supabase
        .from("company_certificates")
        .delete()
        .eq("id", cert.id);

      if (error) throw error;
      toast.success("Certificate deleted");
      fetchCertificates();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete certificate");
    }
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "no-expiry", label: "No Expiry", variant: "secondary" as const };

    const daysUntil = differenceInDays(new Date(expiryDate), new Date());

    if (daysUntil < 0) {
      return { status: "expired", label: "Expired", variant: "destructive" as const };
    }
    if (daysUntil <= 30) {
      return { status: "expiring-soon", label: `${daysUntil}d left`, variant: "destructive" as const };
    }
    if (daysUntil <= 90) {
      return { status: "expiring", label: `${daysUntil}d left`, variant: "outline" as const };
    }
    return { status: "valid", label: "Valid", variant: "secondary" as const };
  };

  const getTypeLabel = (type: string) => {
    return CERTIFICATE_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Company Certificates</h1>
            <p className="text-muted-foreground">
              Manage F-Gas company certifications required for refrigerant purchases
            </p>
          </div>
          {canManage && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Certificate
            </Button>
          )}
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Building2 className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Why Company Certificates Matter</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Under UK F-Gas Regulations, wholesalers must verify your company holds a valid 
                  certification (REFCOM, Quidos, etc.) before selling refrigerants. Keeping these 
                  certificates current ensures uninterrupted supply and regulatory compliance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Registered Certificates
            </CardTitle>
            <CardDescription>
              These certificates are used to verify purchases from refrigerant suppliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No certificates registered</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Add your company's F-Gas certification to maintain purchase records
                </p>
                {canManage && (
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Certificate
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Certificate Number</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => {
                    const expiry = getExpiryStatus(cert.expiry_date);
                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">
                          {getTypeLabel(cert.certificate_type)}
                        </TableCell>
                        <TableCell className="font-mono">{cert.certificate_number}</TableCell>
                        <TableCell>{format(new Date(cert.issued_date), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          {cert.expiry_date 
                            ? format(new Date(cert.expiry_date), "dd MMM yyyy")
                            : "—"
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={expiry.variant} className="gap-1">
                            {expiry.status === "expired" && <AlertTriangle className="h-3 w-3" />}
                            {expiry.status === "expiring-soon" && <Clock className="h-3 w-3" />}
                            {expiry.status === "valid" && <CheckCircle2 className="h-3 w-3" />}
                            {expiry.label}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(cert)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {isOwner && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(cert)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCert ? "Edit Certificate" : "Add Company Certificate"}
            </DialogTitle>
            <DialogDescription>
              Register your company's F-Gas certification for purchase verification
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="certificate_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CERTIFICATE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="certificate_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., REFCOM/12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issued_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date *</FormLabel>
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
                      <FormDescription className="text-xs">
                        Leave blank if no expiry
                      </FormDescription>
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
                        placeholder="Additional details..."
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
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingCert ? "Update" : "Add Certificate"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
