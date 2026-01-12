import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export default function SetupCompany() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // If user already has a company, redirect to dashboard
  if (profile?.company_id) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    const result = companySchema.safeParse(formData);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create company using RPC function
      const { data: companyId, error: createError } = await supabase.rpc(
        "create_company_for_current_user",
        {
          company_name: formData.name,
          company_email: formData.email || null,
          company_phone: formData.phone || null,
          company_address: formData.address || null,
        }
      );

      if (createError) throw createError;

      toast.success("Company created successfully!");
      
      // Refresh profile to get updated company_id
      if (refreshProfile) {
        await refreshProfile();
      }
      
      navigate("/dashboard");
    } catch (err) {
      console.error("Error creating company:", err);
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo & Branding */}
      <div className="flex items-center gap-3 mb-8">
        <img 
          src="/favicon.png" 
          alt="FTrack Logo" 
          className="w-12 h-12 rounded-xl"
        />
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">FTrack</h1>
          <p className="text-sm text-muted-foreground">F-Gas Compliance Management</p>
        </div>
      </div>

      {/* Success Badge */}
      <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-accent/10 text-accent rounded-full">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">Payment successful!</span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Company</CardTitle>
          <CardDescription>
            One last step — tell us about your business to complete setup.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                placeholder="Acme HVAC Ltd"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Company Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="info@company.co.uk"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="020 1234 5678"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                placeholder="123 High Street, London"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating company...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground text-center max-w-sm">
        Your subscription is now active. You can update company details anytime from settings.
      </p>
    </div>
  );
}
