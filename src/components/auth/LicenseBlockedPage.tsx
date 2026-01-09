import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export function LicenseBlockedPage() {
  const { signOut, licenseStatus } = useAuth();

  const getMessage = () => {
    if (licenseStatus === "disabled") {
      return "Your license has been disabled by your company administrator.";
    }
    if (licenseStatus === "pending") {
      return "Your license invitation is pending. Please check your email to accept the invitation.";
    }
    return "You don't have an active license to access this application.";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">License Required</h1>
          <p className="text-muted-foreground mb-6">
            {getMessage()}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Please contact your company administrator to restore access.
          </p>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
