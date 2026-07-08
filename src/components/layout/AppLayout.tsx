import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Building,
  Gauge,
  Snowflake,
  Flame,
  Users,
  LogOut,
  Menu,
  X,
  Download,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useGasAddon } from "@/hooks/useGasAddon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LicenseWarningBanner } from "./LicenseWarningBanner";
import { TrialBanner } from "./TrialBanner";
import { OfflineBanner, OfflineIndicator } from "./OfflineBanner";
import { InstallPrompt } from "./InstallPrompt";
import { EngineerWebFallbackBanner } from "./EngineerWebFallbackBanner";
import { ServiceTicketDialog } from "@/components/support/ServiceTicketDialog";
import { useLicenseEnforcement } from "@/hooks/useLicenseEnforcement";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

// Full navigation for most roles
const fullNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Gauge },
  { name: "Sites", href: "/sites", icon: Building2 },
  { name: "F-Gas", href: "/gas-log", icon: Snowflake },
  { name: "Organisation", href: "/organisation", icon: Building },
];

// Limited navigation for stores_manager role
const storesManagerNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Gauge },
  { name: "F-Gas", href: "/gas-log", icon: Snowflake },
  { name: "Organisation", href: "/organisation", icon: Building },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut, hasRole } = useAuth();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { hasGasAddon } = useGasAddon();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useLicenseEnforcement();

  // Stores managers get limited navigation
  const isStoresManagerOnly = hasRole("stores_manager") && !hasRole("owner") && !hasRole("manager") && !hasRole("engineer");
  const baseNav = isStoresManagerOnly ? storesManagerNavigation : fullNavigation;
  const navigation = hasGasAddon
    ? [...baseNav.slice(0, 3), { name: "Gas Certs", href: "/gas-certificates", icon: Flame }, ...baseNav.slice(3)]
    : baseNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => location.pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="flex h-16 items-center px-4 md:px-6">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 mr-6">
            <img 
              src="/favicon.png" 
              alt="FTrack Logo" 
              className="w-9 h-9 rounded-lg"
            />
            <span className="font-heading font-bold text-lg hidden sm:inline">FTrack</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Offline indicator */}
            <OfflineIndicator />
            
            {/* Theme toggle */}
            <ThemeToggle />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {profile?.full_name ? getInitials(profile.full_name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
                  <Users className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/install")}>
                  <Download className="mr-2 h-4 w-4" />
                  Install App
                </DropdownMenuItem>
                <ServiceTicketDialog>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    Raise Support Ticket
                  </DropdownMenuItem>
                </ServiceTicketDialog>
                {isPlatformAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/admin/partners")}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin · Partners
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t px-4 py-3 space-y-1 bg-card">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Mandatory PWA install prompt (desktop, office roles) */}
      <InstallPrompt />

      {/* Engineer web fallback → nudge to native app */}
      <EngineerWebFallbackBanner />


      {/* Trial Banner */}
      <TrialBanner />

      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* License Warning Banner */}
      <LicenseWarningBanner />

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
