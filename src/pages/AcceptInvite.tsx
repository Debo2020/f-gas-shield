import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import AppDownloadSection from "@/components/invitation/AppDownloadSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type AppRole = "owner" | "manager" | "engineer";

interface InvitationDetails {
  id: string;
  email: string;
  role: AppRole;
  expires_at: string;
  company: {
    id: string;
    name: string;
  };
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError("Invalid invitation link");
        setIsLoading(false);
        return;
      }

      try {
        // Use RPC or direct query - for public access we need a different approach
        // Since RLS blocks unauthenticated access, we'll check after auth
        const { data, error: queryError } = await supabase
          .from("team_invitations")
          .select(`
            id,
            email,
            role,
            expires_at,
            accepted_at,
            companies:company_id (
              id,
              name
            )
          `)
          .eq("token", token)
          .maybeSingle();

        if (queryError || !data) {
          setError("Invitation not found or has expired");
          setIsLoading(false);
          return;
        }

        if (data.accepted_at) {
          setError("This invitation has already been accepted");
          setIsLoading(false);
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError("This invitation has expired");
          setIsLoading(false);
          return;
        }

        const companyData = data.companies as unknown as { id: string; name: string };

        setInvitation({
          id: data.id,
          email: data.email,
          role: data.role as AppRole,
          expires_at: data.expires_at,
          company: {
            id: companyData.id,
            name: companyData.name,
          },
        });
      } catch (err) {
        setError("Failed to load invitation details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) return;

    // Check if user email matches invitation
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      toast.error(`This invitation was sent to ${invitation.email}. Please sign in with that email address.`);
      return;
    }

    // Check if user already has a company
    if (profile?.company_id) {
      toast.error("You are already a member of a company");
      return;
    }

    setIsAccepting(true);
    try {
      // Update profile with company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: invitation.company.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: invitation.role });

      if (roleError) throw roleError;

      // Mark invitation as accepted
      const { error: inviteError } = await supabase
        .from("team_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      if (inviteError) throw inviteError;

      await refreshProfile();
      toast.success(`Welcome to ${invitation.company.name}!`);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast.error(err.message || "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "manager":
        return "secondary";
      case "engineer":
        return "outline";
      default:
        return "outline";
    }
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
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          {isLoading ? (
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading invitation...</p>
            </CardContent>
          ) : error ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle>Invalid Invitation</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/auth">Go to Sign In</Link>
                </Button>
              </CardContent>
            </>
          ) : invitation ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <CardTitle>You're Invited!</CardTitle>
                <CardDescription>
                  You've been invited to join <strong>{invitation.company.name}</strong> on
                  FTrack
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Company</span>
                    <span className="font-medium">{invitation.company.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your Role</span>
                    <Badge variant={getRoleBadgeVariant(invitation.role)}>
                      {invitation.role}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Invited Email</span>
                    <span className="text-sm">{invitation.email}</span>
                  </div>
                </div>

                {user ? (
                  user.email?.toLowerCase() === invitation.email.toLowerCase() ? (
                    <Button
                      className="w-full"
                      onClick={handleAcceptInvitation}
                      disabled={isAccepting}
                    >
                      {isAccepting ? "Accepting..." : "Accept Invitation"}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-destructive text-center">
                        You're signed in as {user.email}, but this invitation was sent to{" "}
                        {invitation.email}
                      </p>
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/auth">Sign in with a different account</Link>
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-center text-muted-foreground">
                      Please sign in or create an account to accept this invitation
                    </p>
                    <Button asChild className="w-full">
                      <Link to={`/auth?redirect=/invite/${token}`}>
                        Sign In to Accept
                      </Link>
                    </Button>
                  </div>
                )}

                {token && (
                  <AppDownloadSection token={token} tokenType="invite" />
                )}
              </CardContent>
            </>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
