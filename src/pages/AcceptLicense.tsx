import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, Loader2, AlertTriangle, Building2, Shield } from "lucide-react";
import AppDownloadSection from "@/components/invitation/AppDownloadSection";

interface LicenseDetails {
  id: string;
  email: string;
  license_type: string;
  status: string;
  token: string;
  company_id: string;
  company_name: string;
}

export default function AcceptLicense() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [license, setLicense] = useState<LicenseDetails | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLicense = async () => {
      if (!token) {
        setError("No invitation token provided");
        setLoading(false);
        return;
      }

      try {
        // Fetch license details by token (anon RLS policy allows this)
        const { data: licenseData, error: licenseError } = await supabase
          .from("user_licenses")
          .select(`
            id,
            email,
            license_type,
            status,
            token,
            company_id,
            companies:company_id (
              name
            )
          `)
          .eq("token", token)
          .single();

        if (licenseError || !licenseData) {
          console.error("License lookup failed:", licenseError);
          
          // Cross-flow detection: check if this token belongs to a team invitation instead
          const { data: teamInvite } = await supabase
            .from("team_invitations")
            .select("id")
            .eq("token", token)
            .maybeSingle();

          if (teamInvite) {
            // Token belongs to team_invitations, redirect to the correct page
            window.location.replace(`/set-password?token=${token}`);
            return;
          }

          setError("Invalid or expired invitation. Please request a new invitation from your administrator.");
          setLoading(false);
          return;
        }

        if (licenseData.status !== "pending") {
          setError("This invitation has already been accepted.");
          setLoading(false);
          return;
        }

        setLicense({
          id: licenseData.id,
          email: licenseData.email || "",
          license_type: licenseData.license_type,
          status: licenseData.status,
          token: licenseData.token,
          company_id: licenseData.company_id,
          company_name: (licenseData.companies as { name: string } | null)?.name || "Unknown Company",
        });
        setLoading(false);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("An error occurred while loading your invitation.");
        setLoading(false);
      }
    };

    fetchLicense();
  }, [token]);

  const validatePassword = (): boolean => {
    if (password.length < 12) {
      setPasswordError("Password must be at least 12 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain an uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError("Password must contain a lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError("Password must contain a number");
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setPasswordError("Password must contain a special character");
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const getPasswordStrength = (): { strength: string; color: string; width: string } => {
    if (password.length === 0) return { strength: "", color: "", width: "0%" };
    if (password.length < 8) return { strength: "Weak", color: "bg-destructive", width: "25%" };
    if (password.length < 12) return { strength: "Fair", color: "bg-amber-500", width: "50%" };
    if (password.length < 16) return { strength: "Good", color: "bg-emerald-500", width: "75%" };
    return { strength: "Strong", color: "bg-emerald-600", width: "100%" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;
    if (!validatePassword()) return;

    setSubmitting(true);
    try {
      // Call the accept-invitation edge function with license_token
      const { data, error: fnError } = await supabase.functions.invoke("accept-invitation", {
        body: { license_token: token, password },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to set up your account");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const email = data?.email || license.email;

      // Sign in with the new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Password was set successfully, but auto-sign-in failed — redirect to login
        toast.success("Account set up! Please sign in with your new password.");
        navigate("/auth");
        return;
      }

      toast.success("Welcome to FTrack! Your account is now set up.");
      navigate("/dashboard");
    } catch (err) {
      console.error("Setup error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to complete setup");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case "manager": return "default";
      case "engineer": return "secondary";
      default: return "outline";
    }
  };

  const passwordStrength = getPasswordStrength();

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <header className="bg-card border-b py-4">
          <div className="container mx-auto px-4 flex items-center gap-3">
            <img src="/ftrack-logo.png" alt="FTrack" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-foreground">FTrack</h1>
              <p className="text-xs text-muted-foreground">F-Gas Compliance</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <header className="bg-card border-b py-4">
          <div className="container mx-auto px-4 flex items-center gap-3">
            <img src="/ftrack-logo.png" alt="FTrack" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-foreground">FTrack</h1>
              <p className="text-xs text-muted-foreground">F-Gas Compliance</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Invitation Error</h2>
                  <p className="text-muted-foreground mt-1">{error}</p>
                </div>
                <Button onClick={() => navigate("/auth")} variant="outline" className="mt-2">
                  Go to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-card border-b py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <img src="/ftrack-logo.png" alt="FTrack" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-bold text-foreground">FTrack</h1>
            <p className="text-xs text-muted-foreground">F-Gas Compliance</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-2xl">Complete Your Account</CardTitle>
            <CardDescription>
              Set your password to join {license?.company_name}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Invitation Details */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Company</span>
                </div>
                <span className="font-medium text-foreground">{license?.company_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Your Role</span>
                </div>
                <Badge variant={getRoleBadgeVariant(license?.license_type || "")}>
                  {license?.license_type === "manager" ? "Manager" : "Engineer"}
                </Badge>
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
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength: {passwordStrength.strength}
                    </p>
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
                    required
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
                Must be at least 12 characters with uppercase, lowercase, number, and special character.
              </p>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up your account...
                  </>
                ) : (
                  "Set Password & Join"
                )}
              </Button>
            </form>

            {token && (
              <AppDownloadSection token={token} tokenType="license" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
