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
  Shield,
  Building2,
  Gauge,
  ClipboardCheck,
  Snowflake,
  FileText,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Key,
  Download,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LicenseWarningBanner } from "./LicenseWarningBanner";
import { OfflineBanner, OfflineIndicator } from "./OfflineBanner";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Gauge },
  { name: "Sites", href: "/sites", icon: Building2 },
  { name: "Equipment", href: "/equipment", icon: Shield },
  { name: "Inspections", href: "/inspections", icon: ClipboardCheck },
  { name: "F-Gas", href: "/gas-log", icon: Snowflake },
  { name: "Documents", href: "/documents", icon: FolderOpen },
  { name: "Reports", href: "/reports", icon: FileText },
];

const managementNav = [
  { name: "Team", href: "/team", icon: Users, roles: ["owner", "manager"] as const },
  { name: "Licenses", href: "/settings/licenses", icon: Key, roles: ["owner", "manager"] as const },
  { name: "Settings", href: "/settings/company", icon: Settings, roles: ["owner"] as const },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            
            {/* Management dropdown for owners/managers */}
            {(hasRole("owner") || hasRole("manager")) && (
              <div className="hidden md:flex items-center gap-1">
                {managementNav.map((item) => {
                  if (!item.roles.some((role) => hasRole(role))) return null;
                  return (
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
                  );
                })}
              </div>
            )}

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
            {(hasRole("owner") || hasRole("manager")) && (
              <>
                <div className="my-2 border-t" />
                {managementNav.map((item) => {
                  if (!item.roles.some((role) => hasRole(role))) return null;
                  return (
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
                  );
                })}
              </>
            )}
          </nav>
        )}
      </header>

      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* License Warning Banner */}
      <LicenseWarningBanner />

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
