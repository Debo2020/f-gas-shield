import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email();
const COOLDOWN_SECONDS = 60;

interface ResendVerificationButtonProps {
  email: string;
  emailRedirectTo?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
}

export function ResendVerificationButton({
  email,
  emailRedirectTo,
  variant = "outline",
  size = "default",
  className,
  label = "Resend verification email",
}: ResendVerificationButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    const parsed = emailSchema.safeParse(email?.trim());
    if (!parsed.success) {
      toast.error("Enter a valid email address first.");
      return;
    }

    setIsSending(true);
    const redirect =
      emailRedirectTo ?? `${window.location.origin}/auth`;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data,
      options: { emailRedirectTo: redirect },
    });
    setIsSending(false);

    if (error) {
      // Supabase returns a rate-limit message — surface it but still start cooldown.
      toast.error(error.message || "Couldn't resend verification email.");
      setCooldown(COOLDOWN_SECONDS);
      return;
    }

    toast.success(`Verification email resent to ${parsed.data}.`);
    setCooldown(COOLDOWN_SECONDS);
  };

  const disabled = isSending || cooldown > 0;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleResend}
      disabled={disabled}
    >
      {isSending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Mail className="mr-2 h-4 w-4" />
      )}
      {cooldown > 0 ? `Resend in ${cooldown}s` : label}
    </Button>
  );
}
