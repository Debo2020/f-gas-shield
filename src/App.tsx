import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CompanySetup from "./pages/company/CompanySetup";
import CompanySettings from "./pages/settings/CompanySettings";
import Profile from "./pages/settings/Profile";
import Team from "./pages/Team";
import Sites from "./pages/Sites";
import SiteDetail from "./pages/SiteDetail";
import Equipment from "./pages/Equipment";
import EquipmentDetail from "./pages/EquipmentDetail";
import Inspections from "./pages/Inspections";
import GasLog from "./pages/GasLog";
import Reports from "./pages/Reports";
import Organisation from "./pages/Organisation";
import Documents from "./pages/Documents";
import AcceptInvite from "./pages/AcceptInvite";
import AcceptLicense from "./pages/AcceptLicense";
import SetPassword from "./pages/SetPassword";
import ResetPassword from "./pages/ResetPassword";
import Install from "./pages/Install";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Help from "./pages/Help";
import Onboarding from "./pages/Onboarding";
import Licenses from "./pages/settings/Licenses";
import Suppliers from "./pages/settings/Suppliers";
import CheckoutRedirect from "./pages/CheckoutRedirect";
import SetupCompany from "./pages/SetupCompany";
import EnterpriseContact from "./pages/EnterpriseContact";
import GasCertificates from "./pages/GasCertificates";
import GetStarted from "./pages/GetStarted";
import SystemStatus from "./pages/SystemStatus";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark">
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <CookieConsentBanner />
          <AnalyticsProvider />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/get-started" element={<GetStarted />} />
            <Route path="/onboarding" element={<Navigate to="/get-started" replace />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="/accept-license" element={<AcceptLicense />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/install" element={<Install />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/help" element={<Help />} />
            <Route path="/system-status" element={<SystemStatus />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/enterprise-contact" element={<EnterpriseContact />} />
            <Route path="/checkout-redirect" element={<CheckoutRedirect />} />
            <Route
              path="/setup-company"
              element={
                <ProtectedRoute>
                  <SetupCompany />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/setup"
              element={
                <ProtectedRoute>
                  <CompanySetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/company"
              element={
                <ProtectedRoute>
                  <CompanySettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organisation"
              element={
                <ProtectedRoute>
                  <Organisation />
                </ProtectedRoute>
              }
            />
            {/* Legacy redirects to Organisation hub */}
            <Route path="/team" element={<Navigate to="/organisation?tab=team" replace />} />
            <Route path="/reports" element={<Navigate to="/organisation?tab=reports" replace />} />
            <Route path="/documents" element={<Navigate to="/organisation?tab=documents" replace />} />
            <Route path="/settings/licenses" element={<Navigate to="/organisation?tab=licenses" replace />} />
            <Route path="/settings/suppliers" element={<Navigate to="/organisation?tab=suppliers" replace />} />
            <Route path="/settings/company" element={<Navigate to="/organisation?tab=settings" replace />} />
            <Route
              path="/sites"
              element={
                <ProtectedRoute requireLicense>
                  <Sites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sites/:id"
              element={
                <ProtectedRoute requireLicense>
                  <SiteDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipment"
              element={
                <ProtectedRoute requireLicense>
                  <Equipment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipment/:id"
              element={
                <ProtectedRoute requireLicense>
                  <EquipmentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections"
              element={
                <ProtectedRoute requireLicense>
                  <Inspections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gas-log"
              element={
                <ProtectedRoute requireLicense>
                  <GasLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute requireLicense>
                  <Documents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/licenses"
              element={
                <ProtectedRoute>
                  <Licenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/suppliers"
              element={
                <ProtectedRoute>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gas-certificates"
              element={
                <ProtectedRoute requireLicense>
                  <GasCertificates />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
