import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { z } from "zod";
import { ResendVerificationButton } from "@/components/auth/ResendVerificationButton";

const emailSchema = z.string().trim().email("Please enter a valid email address");
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(100);
const companySchema = z.string().trim().min(2, "Company name must be at least 2 characters").max(200);

export default function GetStarted() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Account details
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = (): boolean => {
    setError(null);
    const nameResult = nameSchema.safeParse(fullName);
    if (!nameResult.success) { setError(nameResult.error.errors[0].message); return false; }
    const companyResult = companySchema.safeParse(companyName);
    if (!companyResult.success) { setError(companyResult.error.errors[0].message); return false; }
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) { setError(emailResult.error.errors[0].message); return false; }
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) { setError(passwordResult.error.errors[0].message); return false; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
            phone: phone.trim() || null,
          },
          emailRedirectTo: `${window.location.origin}/setup-company`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // If email confirmation is required (no session returned)
      if (!authData.session) {
        setEmailSent(true);
        return;
      }

      // If auto-confirmed (unlikely in prod), go straight to setup
      navigate("/setup-company");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Email sent confirmation screen
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <img src="/favicon.png" alt="FTrack Logo" className="w-8 h-8 rounded-lg" />
              <span className="font-semibold text-lg text-foreground">FTrack</span>
            </button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16 max-w-md">
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Check Your Email</h1>
            <p className="text-muted-foreground">
              We've sent a verification link to <strong className="text-foreground">{email}</strong>.
              Click the link to verify your account.
            </p>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>After verifying, sign in to complete your setup and choose a plan.</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Your company details have been saved and will be ready when you sign in.</span>
                </div>
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => navigate("/auth")} className="w-full">
              Go to Sign In
            </Button>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Didn't receive the email? Check your spam folder, then try resending.
              </p>
              <ResendVerificationButton
                email={email}
                emailRedirectTo={`${window.location.origin}/setup-company`}
                className="w-full"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src="/favicon.png" alt="FTrack Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-lg text-foreground">FTrack</span>
          </button>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
          <p className="text-muted-foreground">
            Enter your details to get started with FTrack
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <OAuthButtons
              disabled={isLoading}
              mode="signup"
              onError={(msg) => setError(msg || null)}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Ltd"
                  autoComplete="organization"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.co.uk"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                    disabled={isLoading}
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
                <p className="text-xs text-muted-foreground">
                  Min 12 characters with uppercase, lowercase, number &amp; special character
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 123 456 7890"
                  autoComplete="tel"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground sm:hidden">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/auth")}
            className="text-primary hover:underline font-medium"
          >
            Sign In
          </button>
        </p>
      </main>
    </div>
  );
}
