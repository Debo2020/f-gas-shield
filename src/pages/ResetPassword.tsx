import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Listen for auth state changes to detect the recovery session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setHasSession(true);
          setIsLoading(false);
        } else if (event === "SIGNED_IN" && session) {
          // Also handle if user already has a session
          setHasSession(true);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const getPasswordStrength = () => {
    if (password.length === 0) return { label: "", color: "" };
    if (password.length < 12) return { label: "Too short", color: "text-destructive" };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
    if (score < 4) return { label: "Fair", color: "text-yellow-500" };
    return { label: "Strong", color: "text-green-500" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePassword()) return;

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      toast.error("Failed to reset password");
    } else {
      setIsSuccess(true);
      toast.success("Password updated successfully!");
    }
  };

  const passwordStrength = getPasswordStrength();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <img src="/ftrack-logo.png" alt="FTrack" className="h-8 w-auto" />
            <span className="text-xl font-semibold text-foreground">FTrack</span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // No valid session
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <img src="/ftrack-logo.png" alt="FTrack" className="h-8 w-auto" />
            <span className="text-xl font-semibold text-foreground">FTrack</span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Invalid or Expired Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <img src="/ftrack-logo.png" alt="FTrack" className="h-8 w-8" />
            <span className="text-xl font-semibold text-foreground">FTrack</span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 dark:bg-green-900/20 w-fit">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Password Updated!</CardTitle>
              <CardDescription>
                Your password has been successfully reset. You can now sign in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <img src="/ftrack-logo.png" alt="FTrack" className="h-8 w-8" />
          <span className="text-xl font-semibold text-foreground">FTrack</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Enter a new password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
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
                  <p className={`text-xs ${passwordStrength.color}`}>
                    Password strength: {passwordStrength.label}
                  </p>
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
                    placeholder="Confirm new password"
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

              {(error || passwordError) && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error || passwordError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
