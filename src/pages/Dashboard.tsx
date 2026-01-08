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
  Plus,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, isBefore, isAfter, startOfToday } from "date-fns";

export default function Dashboard() {
  const { profile } = useAuth();
  const today = startOfToday();
  const in30Days = addDays(today, 30);

  // Fetch sites count
  const { data: sitesCount = 0, isLoading: sitesLoading } = useQuery({
    queryKey: ["sites-count", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return 0;
      const { count } = await supabase
        .from("sites")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id);
      return count || 0;
    },
    enabled: !!profile?.company_id,
  });

  // Fetch equipment with inspection dates
  const { data: equipmentData, isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipment-stats", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return { count: 0, totalCo2: 0, dueSoon: 0, overdue: 0 };
      const { data } = await supabase
        .from("equipment")
        .select("id, co2_equivalent_tonnes, next_inspection_due, is_active")
        .eq("company_id", profile.company_id)
        .eq("is_active", true);
      
      if (!data) return { count: 0, totalCo2: 0, dueSoon: 0, overdue: 0 };

      const totalCo2 = data.reduce((sum, eq) => sum + (eq.co2_equivalent_tonnes || 0), 0);
      const overdue = data.filter(eq => eq.next_inspection_due && isBefore(new Date(eq.next_inspection_due), today)).length;
      const dueSoon = data.filter(eq => {
        if (!eq.next_inspection_due) return false;
        const dueDate = new Date(eq.next_inspection_due);
        return isAfter(dueDate, today) && isBefore(dueDate, in30Days);
      }).length;

      return { count: data.length, totalCo2, dueSoon, overdue };
    },
    enabled: !!profile?.company_id,
  });

  const isLoading = sitesLoading || equipmentLoading;

  const stats = [
    {
      title: "Total Sites",
      value: isLoading ? "..." : sitesCount.toString(),
      icon: Building2,
      description: "Registered locations",
      href: "/sites",
    },
    {
      title: "Equipment",
      value: isLoading ? "..." : (equipmentData?.count || 0).toString(),
      icon: Shield,
      description: `${equipmentData?.totalCo2?.toFixed(1) || 0} tCO₂e total`,
      href: "/equipment",
    },
    {
      title: "Due Soon",
      value: isLoading ? "..." : (equipmentData?.dueSoon || 0).toString(),
      icon: Clock,
      description: "Next 30 days",
      href: "/inspections",
      variant: (equipmentData?.dueSoon || 0) > 0 ? "warning" as const : undefined,
    },
    {
      title: "Overdue",
      value: isLoading ? "..." : (equipmentData?.overdue || 0).toString(),
      icon: AlertTriangle,
      description: "Require attention",
      href: "/inspections?status=overdue",
      variant: (equipmentData?.overdue || 0) > 0 ? "destructive" as const : undefined,
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
