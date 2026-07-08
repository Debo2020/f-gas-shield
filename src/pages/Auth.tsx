import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, ArrowLeft, CheckCircle2, Mail, WifiOff, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { ResendVerificationButton } from "@/components/auth/ResendVerificationButton";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(1, "Password is required");

export default function Auth() {
  const navigate = useNavigate();
  const { user, profile, isLoading, signIn, signInOffline } = useAuth();
  const { isOffline } = useNetworkStatus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      // New users without a company go to setup
      if (profile && !profile.company_id) {
        navigate("/setup-company");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, isLoading, profile, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return;
    }

    // Handle offline login
    if (isOffline) {
      if (!password) {
        setError("Password is required for offline login.");
        return;
      }
      setIsSubmitting(true);
      const { error } = await signInOffline(email, password);
      setIsSubmitting(false);
      if (error) {
        setError(error.message);
      } else {
        navigate("/dashboard");
      }
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed") || msg.includes("confirm")) {
        setNeedsVerification(true);
        setError("Please verify your email address before signing in.");
      } else if (error.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(error.message);
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setResetEmailSent(true);
    }
  };

  const handleBackToSignIn = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="flex items-center gap-3 mb-8">
          <img src="/favicon.png" alt="FTrack Logo" className="w-12 h-12 rounded-xl" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">FTrack</h1>
            <p className="text-sm text-muted-foreground">F-Gas Compliance Management</p>
          </div>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {resetEmailSent ? (
              <>
                <div className="mx-auto mb-4 p-3 rounded-full bg-accent/10 w-fit">
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                </div>
                <CardTitle>Check Your Email</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Forgot Password?</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </>
            )}
          </CardHeader>

          <CardContent>
            {resetEmailSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <Button variant="outline" className="w-full" onClick={handleBackToSignIn}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@company.co.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={handleBackToSignIn}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 text-xs text-muted-foreground">UK F-Gas Regulation Compliance Platform</p>
      </div>
    );
  }

  // Sign In View
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-8">
        <img src="/favicon.png" alt="FTrack Logo" className="w-12 h-12 rounded-xl" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">FTrack</h1>
          <p className="text-sm text-muted-foreground">F-Gas Compliance Management</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign In</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back — sign in to your account
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {needsVerification && !isOffline && (
            <div className="mb-4">
              <ResendVerificationButton
                email={email}
                emailRedirectTo={`${window.location.origin}/setup-company`}
                className="w-full"
              />
            </div>
          )}

          {isOffline && (
            <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
              <WifiOff className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                You're offline. Enter your email and password to access cached data (read-only mode).
              </AlertDescription>
            </Alert>
          )}

          {!isOffline && (
            <>
              <div className="mb-4">
                <OAuthButtons
                  disabled={isSubmitting}
                  onError={(msg) => setError(msg || null)}
                />
              </div>
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or with email</span>
                </div>
              </div>
            </>
          )}


          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="you@company.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password">Password</Label>
                {!isOffline && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isOffline ? "Accessing offline..." : "Signing in..."}
                </>
              ) : isOffline ? (
                <>
                  <WifiOff className="mr-2 h-4 w-4" />
                  Access Offline
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/get-started")}
              className="text-primary hover:underline font-medium"
            >
              Get Started
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">UK F-Gas Regulation Compliance Platform</p>
    </div>
  );
}
