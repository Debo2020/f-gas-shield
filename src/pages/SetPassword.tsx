import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Shield, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import AppDownloadSection from "@/components/invitation/AppDownloadSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppRole = "owner" | "manager" | "engineer" | "admin" | "auditor" | "read_only" | "stores_manager";

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

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError("Invalid invitation link - missing token");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch invitation details using the token - no session needed
        // We use the anon key which can read team_invitations by token
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
          console.error("Team invitation lookup failed:", queryError);
          
          // Cross-flow detection: check if this token belongs to a license invitation instead
          const { data: licenseInvite } = await supabase
            .from("user_licenses")
            .select("id")
            .eq("token", token)
            .maybeSingle();

          if (licenseInvite) {
            // Token belongs to user_licenses, redirect to the correct page
            window.location.replace(`/accept-license?token=${token}`);
            return;
          }

          setError("Invitation not found or is invalid. Please ask your administrator to send a new invitation.");
          setIsLoading(false);
          return;
        }

        if (data.accepted_at) {
          setError("This invitation has already been accepted");
          setIsLoading(false);
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError("This invitation has expired. Please ask your administrator to send a new invitation.");
          setIsLoading(false);
          return;
        }

        const companyData = data.companies as unknown as { id: string; name: string } | null;

        setInvitation({
          id: data.id,
          email: data.email,
          role: data.role as AppRole,
          expires_at: data.expires_at,
          company: {
            id: companyData?.id || "",
            name: companyData?.name || "Your Organization",
          },
        });
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setError("Failed to load invitation details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const validatePassword = (): boolean => {
    if (password.length < 12) {
      setPasswordError("Password must be at least 12 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError("Must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError("Must contain at least one number");
      return false;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(password)) {
      setPasswordError("Must contain at least one special character (!@#$%^&* etc.)");
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword() || !invitation || !token) return;

    setIsSubmitting(true);
    try {
      // Call the accept-invitation edge function
      const { data, error: fnError } = await supabase.functions.invoke("accept-invitation", {
        body: { token, password },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to accept invitation");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to accept invitation");
      }

      const email = data.email;

      // Sign in with the new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Password was set successfully but sign-in failed - direct to auth page
        toast.success("Account set up! Please sign in with your new password.");
        navigate("/auth");
        return;
      }

      toast.success(`Welcome to ${invitation.company.name}!`);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error completing setup:", err);
      toast.error(err.message || "Failed to complete account setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
      case "admin":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 12) return { label: "Too short", color: "bg-destructive" };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(password);
    const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
    if (score < 4) return { label: "Fair", color: "bg-yellow-500" };
    return { label: "Strong", color: "bg-success" };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col">
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
                <CardTitle>Unable to Complete Setup</CardTitle>
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
                <CardTitle>Complete Your Account</CardTitle>
                <CardDescription>
                  Set your password to join <strong>{invitation.company.name}</strong> on FTrack
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
                      {invitation.role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm">{invitation.email}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordStrength && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${passwordStrength.color} transition-all`}
                            style={{ width: password.length < 8 ? "33%" : password.length < 12 ? "66%" : "100%" }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Min 12 characters with uppercase, lowercase, number, and special character (!@#$%^&amp;* etc.).
                  </p>

                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || !password || !confirmPassword}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      "Set Password & Join"
                    )}
                  </Button>
                </form>

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
