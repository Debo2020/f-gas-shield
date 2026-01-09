import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CompanySetup from "./pages/company/CompanySetup";
import CompanySettings from "./pages/settings/CompanySettings";
import Team from "./pages/Team";
import Sites from "./pages/Sites";
import Equipment from "./pages/Equipment";
import Inspections from "./pages/Inspections";
import GasLog from "./pages/GasLog";
import Reports from "./pages/Reports";
import AcceptInvite from "./pages/AcceptInvite";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Licenses from "./pages/settings/Licenses";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="/pricing" element={<Pricing />} />
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
              path="/team"
              element={
                <ProtectedRoute>
                  <Team />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sites"
              element={
                <ProtectedRoute requireLicense>
                  <Sites />
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
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/settings/licenses"
              element={
                <ProtectedRoute>
                  <Licenses />
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
);

export default App;
