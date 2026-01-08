import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Shield, 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Plus 
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { profile } = useAuth();

  // Placeholder stats - will be replaced with real data
  const stats = [
    {
      title: "Total Sites",
      value: "0",
      icon: Building2,
      description: "Registered locations",
      href: "/sites",
    },
    {
      title: "Equipment",
      value: "0",
      icon: Shield,
      description: "F-Gas units tracked",
      href: "/equipment",
    },
    {
      title: "Inspections Due",
      value: "0",
      icon: Clock,
      description: "Next 30 days",
      href: "/inspections",
      variant: "warning" as const,
    },
    {
      title: "Overdue",
      value: "0",
      icon: AlertTriangle,
      description: "Require attention",
      href: "/inspections?status=overdue",
      variant: "destructive" as const,
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">
              Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's your F-Gas compliance overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/sites/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Site
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon
                    className={`h-5 w-5 ${
                      stat.variant === "destructive"
                        ? "text-destructive"
                        : stat.variant === "warning"
                        ? "text-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Complete these steps to set up FTrack for your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Create your account</p>
                  <p className="text-xs text-muted-foreground">Account created successfully</p>
                </div>
              </div>
              <Link to="/company/setup" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Set up your company</p>
                    <p className="text-xs text-muted-foreground">Add company details and branding</p>
                  </div>
                </div>
              </Link>
              <Link to="/sites/new" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Add your first site</p>
                    <p className="text-xs text-muted-foreground">Register a customer location</p>
                  </div>
                </div>
              </Link>
              <Link to="/equipment/new" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Register equipment</p>
                    <p className="text-xs text-muted-foreground">Add F-Gas equipment to track</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>
                Overview of your F-Gas compliance position
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium">No equipment registered yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Add your first site and equipment to start tracking F-Gas compliance
                </p>
                <Button asChild className="mt-4" variant="outline">
                  <Link to="/sites/new">Get Started</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
