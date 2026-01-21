import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building,
  Users,
  Key,
  FileText,
  FolderOpen,
  Truck,
  Settings,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";

// Tab content components (lazy loaded sections from existing pages)
import { OrganisationTeamTab } from "@/components/organisation/OrganisationTeamTab";
import { OrganisationLicensesTab } from "@/components/organisation/OrganisationLicensesTab";
import { OrganisationReportsTab } from "@/components/organisation/OrganisationReportsTab";
import { OrganisationDocumentsTab } from "@/components/organisation/OrganisationDocumentsTab";
import { OrganisationSuppliersTab } from "@/components/organisation/OrganisationSuppliersTab";
import { OrganisationSettingsTab } from "@/components/organisation/OrganisationSettingsTab";

const TAB_CONFIG = [
  { id: "team", label: "Team", icon: Users, roles: ["owner", "manager"] },
  { id: "licenses", label: "Licenses", icon: Key, roles: ["owner", "manager"] },
  { id: "reports", label: "Reports", icon: FileText, roles: ["owner", "manager", "engineer"] },
  { id: "documents", label: "Documents", icon: FolderOpen, roles: ["owner", "manager", "stores_manager", "engineer"] },
  { id: "suppliers", label: "Suppliers", icon: Truck, roles: ["owner", "manager", "stores_manager"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["owner"] },
] as const;

type TabId = typeof TAB_CONFIG[number]["id"];

export default function Organisation() {
  const { profile, hasRole, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine which tabs the user can access
  const accessibleTabs = useMemo(() => {
    return TAB_CONFIG.filter((tab) =>
      tab.roles.some((role) => hasRole(role as any))
    );
  }, [hasRole]);

  // Get default tab from URL or first accessible tab
  const urlTab = searchParams.get("tab") as TabId | null;
  const defaultTab = accessibleTabs.find((t) => t.id === urlTab)?.id || accessibleTabs[0]?.id || "team";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Sync URL with active tab
  useEffect(() => {
    if (activeTab && activeTab !== searchParams.get("tab")) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && accessibleTabs.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, accessibleTabs]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (accessibleTabs.length === 0) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to access organisation settings.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            Organisation
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your company settings, team, and resources
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {accessibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Team Tab */}
          {accessibleTabs.some((t) => t.id === "team") && (
            <TabsContent value="team">
              <OrganisationTeamTab />
            </TabsContent>
          )}

          {/* Licenses Tab */}
          {accessibleTabs.some((t) => t.id === "licenses") && (
            <TabsContent value="licenses">
              <OrganisationLicensesTab />
            </TabsContent>
          )}

          {/* Reports Tab */}
          {accessibleTabs.some((t) => t.id === "reports") && (
            <TabsContent value="reports">
              <OrganisationReportsTab />
            </TabsContent>
          )}

          {/* Documents Tab */}
          {accessibleTabs.some((t) => t.id === "documents") && (
            <TabsContent value="documents">
              <OrganisationDocumentsTab />
            </TabsContent>
          )}

          {/* Suppliers Tab */}
          {accessibleTabs.some((t) => t.id === "suppliers") && (
            <TabsContent value="suppliers">
              <OrganisationSuppliersTab />
            </TabsContent>
          )}

          {/* Settings Tab */}
          {accessibleTabs.some((t) => t.id === "settings") && (
            <TabsContent value="settings">
              <OrganisationSettingsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
