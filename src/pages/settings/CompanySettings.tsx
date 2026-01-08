import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { CompanyDetailsForm, type CompanyFormValues } from "@/components/company/CompanyDetailsForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanyData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export default function CompanySettings() {
  const navigate = useNavigate();
  const { profile, hasRole } = useAuth();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = hasRole("owner");

  useEffect(() => {
    const fetchCompany = async () => {
      if (!profile?.company_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("companies")
        .select("id, name, address, phone, email")
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

  if (!profile?.company_id) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You don't have a company yet.
              </p>
              <Button onClick={() => navigate("/company/setup")}>
                Set Up Your Company
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Company Settings
            </CardTitle>
            <CardDescription>
              {isOwner
                ? "Update your company details"
                : "View your company details (only owners can edit)"}
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
                    <label className="text-sm font-medium text-muted-foreground">
                      Company Name
                    </label>
                    <p className="mt-1">{company.name}</p>
                  </div>
                  {company.address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Address
                      </label>
                      <p className="mt-1">{company.address}</p>
                    </div>
                  )}
                  {company.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Phone
                      </label>
                      <p className="mt-1">{company.phone}</p>
                    </div>
                  )}
                  {company.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <p className="mt-1">{company.email}</p>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Company not found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
