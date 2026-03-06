import { useEffect, useState, useRef } from "react";
import { Building2, Upload, X, ImageIcon, Settings, CreditCard, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CompanyDetailsForm, type CompanyFormValues } from "@/components/company/CompanyDetailsForm";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrganisationAddonsTab } from "./OrganisationAddonsTab";
import { format } from "date-fns";

interface CompanyData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
}

export function OrganisationSettingsTab() {
  const { profile, hasRole } = useAuth();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = hasRole("owner");

  useEffect(() => {
    const fetchCompany = async () => {
      if (!profile?.company_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("companies")
        .select("id, name, address, phone, email, logo_url")
        .eq("id", profile.company_id)
        .single();

      if (error) {
        toast.error("Failed to load company details");
      } else {
        setCompany(data);
      }
      setIsLoading(false);
    };

    fetchCompany();
  }, [profile?.company_id]);

  const handleSubmit = async (values: CompanyFormValues) => {
    if (!company || !isOwner) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: values.name,
          address: values.address || null,
          phone: values.phone || null,
          email: values.email || null,
        })
        .eq("id", company.id);

      if (error) throw error;

      toast.success("Company details updated");
      setCompany({ ...company, ...values });
    } catch (error: any) {
      toast.error(error.message || "Failed to update company");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !company || !isOwner) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${company.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(filePath);
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: logoUrl })
        .eq("id", company.id);

      if (updateError) throw updateError;

      setCompany({ ...company, logo_url: logoUrl });
      toast.success("Company logo updated");
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!company || !isOwner || !company.logo_url) return;

    setIsUploadingLogo(true);
    try {
      const urlParts = company.logo_url.split("/company-logos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split("?")[0];
        await supabase.storage.from("company-logos").remove([filePath]);
      }

      const { error } = await supabase
        .from("companies")
        .update({ logo_url: null })
        .eq("id", company.id);

      if (error) throw error;

      setCompany({ ...company, logo_url: null });
      toast.success("Company logo removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (!profile?.company_id) {
    return (
      <div className="text-center py-12">
        <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No company configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Company Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          {isOwner ? "Manage your company details and branding" : "View company details"}
        </p>
      </div>

      {/* Logo Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Company Logo
          </CardTitle>
          <CardDescription>
            Your logo appears on PDF reports and documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 rounded-lg border">
              <AvatarImage src={company?.logo_url || undefined} className="object-contain" />
              <AvatarFallback className="rounded-lg bg-muted text-2xl">
                {company?.name?.slice(0, 2).toUpperCase() || "CO"}
              </AvatarFallback>
            </Avatar>

            {isOwner && (
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                </Button>
                {company?.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={isUploadingLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 2MB. Square logos work best.
                </p>
              </div>
            )}

            {!isOwner && !company?.logo_url && (
              <p className="text-sm text-muted-foreground">
                No logo uploaded. Only owners can upload a logo.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Company Details
          </CardTitle>
          <CardDescription>
            {isOwner ? "Update your company details" : "View your company details (only owners can edit)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading company details...
            </div>
          ) : company ? (
            isOwner ? (
              <CompanyDetailsForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                defaultValues={{
                  name: company.name,
                  address: company.address || "",
                  phone: company.phone || "",
                  email: company.email || "",
                }}
                submitLabel="Save Changes"
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                  <p className="mt-1">{company.name}</p>
                </div>
                {company.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="mt-1">{company.address}</p>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="mt-1">{company.phone}</p>
                  </div>
                )}
                {company.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="mt-1">{company.email}</p>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">Company not found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
