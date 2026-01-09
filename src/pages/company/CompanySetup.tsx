import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Building2, Users, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailsForm, type CompanyFormValues } from "@/components/company/CompanyDetailsForm";
import { InviteTeamForm, type TeamInvite } from "@/components/company/InviteTeamForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "company" | "team" | "complete";

const steps = [
  { id: "company", label: "Company Details", icon: Building2 },
  { id: "team", label: "Invite Team", icon: Users },
  { id: "complete", label: "Complete", icon: CheckCircle2 },
];

export default function CompanySetup() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>("company");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);

  const handleCompanySubmit = async (values: CompanyFormValues) => {
    if (!user) {
      toast.error("You must be logged in to create a company");
      return;
    }

    setIsSubmitting(true);
    try {
      // First generate a slug for the company
      const { data: slugData, error: slugError } = await supabase.rpc(
        "generate_unique_slug",
        { company_name: values.name }
      );

      if (slugError) throw slugError;

      // Create company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: values.name,
          slug: slugData,
          address: values.address || null,
          phone: values.phone || null,
          email: values.email || null,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Update profile with company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: company.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Assign owner role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "owner" });

      if (roleError) throw roleError;

      setCompanyId(company.id);
      await refreshProfile();
      
      toast.success("Company created successfully!");
      setCurrentStep("team");
    } catch (error: any) {
      console.error("Error creating company:", error);
      
      // Provide more specific error messages for common issues
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        toast.error("Unable to create company. Please try refreshing the page and signing in again.");
      } else if (error.code === '23505') {
        toast.error("A company with this name already exists. Please choose a different name.");
      } else {
        toast.error(error.message || "Failed to create company. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInvite = (invite: TeamInvite) => {
    setInvites([...invites, invite]);
  };

  const handleRemoveInvite = (email: string) => {
    setInvites(invites.filter((inv) => inv.email !== email));
  };

  const handleSendInvites = async () => {
    if (!companyId || !user) return;

    setIsSubmitting(true);
    try {
      if (invites.length > 0) {
        const invitationsToCreate = invites.map((invite) => ({
          company_id: companyId,
          email: invite.email,
          role: invite.role,
          invited_by: user.id,
        }));

        const { error } = await supabase
          .from("team_invitations")
          .insert(invitationsToCreate);

        if (error) throw error;

        toast.success(`${invites.length} invitation${invites.length > 1 ? "s" : ""} sent!`);
      }

      setCurrentStep("complete");
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error("Error sending invites:", error);
      toast.error(error.message || "Failed to send invitations");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipInvites = async () => {
    setCurrentStep("complete");
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">FTrack</h1>
            <p className="text-xs text-muted-foreground">F-Gas Compliance</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isComplete =
              (currentStep === "team" && step.id === "company") ||
              (currentStep === "complete" && step.id !== "complete");

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isComplete && "bg-success text-success-foreground",
                      !isActive && !isComplete && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-2 font-medium",
                      isActive && "text-primary",
                      isComplete && "text-success",
                      !isActive && !isComplete && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-16 h-0.5 mx-2 -mt-6",
                      isComplete ? "bg-success" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card>
          {currentStep === "company" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Set Up Your Company
                </CardTitle>
                <CardDescription>
                  Enter your company details to get started with FTrack. You'll be set as the
                  company owner.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompanyDetailsForm onSubmit={handleCompanySubmit} isSubmitting={isSubmitting} />
              </CardContent>
            </>
          )}

          {currentStep === "team" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Invite Your Team
                </CardTitle>
                <CardDescription>
                  Add team members who will help manage your F-Gas compliance. You can always
                  invite more people later.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InviteTeamForm
                  invites={invites}
                  onAddInvite={handleAddInvite}
                  onRemoveInvite={handleRemoveInvite}
                  onSubmit={handleSendInvites}
                  onSkip={handleSkipInvites}
                  isSubmitting={isSubmitting}
                />
              </CardContent>
            </>
          )}

          {currentStep === "complete" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <CardTitle>You're All Set!</CardTitle>
                <CardDescription>
                  Your company has been created and you're ready to start tracking F-Gas
                  compliance. Redirecting to your dashboard...
                </CardDescription>
              </CardHeader>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
