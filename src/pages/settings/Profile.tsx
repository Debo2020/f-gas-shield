import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Award,
  Calendar,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentList } from "@/components/documents/DocumentList";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  f_gas_certificate_number: z.string().optional(),
  f_gas_certificate_expiry: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [docRefresh, setDocRefresh] = useState(0);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      f_gas_certificate_number: "",
      f_gas_certificate_expiry: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        f_gas_certificate_number: profile.f_gas_certificate_number || "",
        f_gas_certificate_expiry: profile.f_gas_certificate_expiry || "",
      });
      setIsLoading(false);
    }
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          phone: values.phone || null,
          f_gas_certificate_number: values.f_gas_certificate_number || null,
          f_gas_certificate_expiry: values.f_gas_certificate_expiry || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      refreshProfile?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getCertificateStatus = () => {
    if (!profile?.f_gas_certificate_expiry) {
      return { status: "none", label: "Not set", variant: "outline" as const };
    }

    const daysUntil = differenceInDays(new Date(profile.f_gas_certificate_expiry), new Date());

    if (daysUntil < 0) {
      return { status: "expired", label: "Expired", variant: "destructive" as const };
    } else if (daysUntil <= 30) {
      return { status: "expiring", label: "Expiring soon", variant: "secondary" as const };
    } else {
      return { status: "valid", label: "Valid", variant: "default" as const };
    }
  };

  const certStatus = getCertificateStatus();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">My Profile</h1>
              <p className="text-muted-foreground">
                Manage your personal information and qualifications
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" disabled />
                          </FormControl>
                          <FormDescription>
                            Email cannot be changed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="+44 7..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* F-Gas Certification */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    F-Gas Certification
                  </CardTitle>
                  <CardDescription>
                    Your professional qualifications for handling fluorinated gases
                  </CardDescription>
                </div>
                <Badge variant={certStatus.variant} className="flex items-center gap-1">
                  {certStatus.status === "expired" && <AlertTriangle className="h-3 w-3" />}
                  {certStatus.status === "valid" && <CheckCircle2 className="h-3 w-3" />}
                  {certStatus.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="f_gas_certificate_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Certificate Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., FG-12345-2024" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="f_gas_certificate_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Certificate Details
                    </Button>
                  </div>
                </form>
              </Form>

              {profile?.f_gas_certificate_expiry && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Certificate expires on{" "}
                      <strong>
                        {format(new Date(profile.f_gas_certificate_expiry), "dd MMMM yyyy")}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Qualification Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                My Qualification Documents
              </CardTitle>
              <CardDescription>
                Upload your certificates, training records, and other qualification documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile?.company_id && profile?.id && (
                <>
                  <DocumentUploader
                    companyId={profile.company_id}
                    profileId={profile.id}
                    documentType="certificate"
                    onUploadComplete={() => setDocRefresh((prev) => prev + 1)}
                  />
                  <Separator />
                  <DocumentList
                    companyId={profile.company_id}
                    profileId={profile.id}
                    canDelete
                    refreshTrigger={docRefresh}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
