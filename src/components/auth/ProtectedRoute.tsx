import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { LicenseBlockedPage } from "./LicenseBlockedPage";

interface ProtectedRouteProps {
  children: ReactNode;
  requireLicense?: boolean;
}

export function ProtectedRoute({ children, requireLicense = false }: ProtectedRouteProps) {
  const { user, isLoading, hasRole, hasActiveLicense } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // License check: owners are exempt, others need active license if required
  if (requireLicense && !hasRole("owner") && !hasActiveLicense) {
    return <LicenseBlockedPage />;
  }

  return <>{children}</>;
}
