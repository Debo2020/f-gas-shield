import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building,
  Building2,
  Users,
  FolderOpen,
  Truck,
  Settings,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTeamMembers } from "@/hooks/useTeamMembers";

// Tab content components
import { OrganisationTeamTab } from "@/components/organisation/OrganisationTeamTab";
import { OrganisationDocumentsTab } from "@/components/organisation/OrganisationDocumentsTab";
import { OrganisationSuppliersTab } from "@/components/organisation/OrganisationSuppliersTab";
import { OrganisationSettingsTab } from "@/components/organisation/OrganisationSettingsTab";
import { OrganisationClientsTab } from "@/components/organisation/OrganisationClientsTab";

const TAB_CONFIG = [
  { id: "team", label: "Team", icon: Users, roles: ["owner", "manager"] },
  { id: "clients", label: "Clients", icon: Building2, roles: ["owner", "manager"] },
  { id: "suppliers", label: "Suppliers", icon: Truck, roles: ["owner", "manager", "stores_manager"] },
  { id: "documents", label: "Documents", icon: FolderOpen, roles: ["owner", "manager", "stores_manager", "engineer"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["owner"] },
] as const;

type TabId = typeof TAB_CONFIG[number]["id"];

export default function Organisation() {
  const { profile, hasRole, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamData = useTeamMembers();

  const accessibleTabs = useMemo(() => {
    return TAB_CONFIG.filter((tab) =>
      tab.roles.some((role) => hasRole(role as any))
    );
  }, [hasRole]);

  const urlTab = searchParams.get("tab") as TabId | null;
  const defaultTab = accessibleTabs.find((t) => t.id === urlTab)?.id || accessibleTabs[0]?.id || "team";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  useEffect(() => {
    if (activeTab && activeTab !== searchParams.get("tab")) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

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

          {accessibleTabs.some((t) => t.id === "team") && (
            <TabsContent value="team">
              <OrganisationTeamTab
                members={teamData.members}
                invitations={teamData.invitations}
                isLoading={teamData.isLoading}
                refetch={teamData.refetch}
              />
            </TabsContent>
          )}

          {accessibleTabs.some((t) => t.id === "clients") && (
            <TabsContent value="clients">
              <OrganisationClientsTab />
            </TabsContent>
          )}

          {accessibleTabs.some((t) => t.id === "suppliers") && (
            <TabsContent value="suppliers">
              <OrganisationSuppliersTab />
            </TabsContent>
          )}

          {accessibleTabs.some((t) => t.id === "documents") && (
            <TabsContent value="documents">
              <OrganisationDocumentsTab />
            </TabsContent>
          )}


          {accessibleTabs.some((t) => t.id === "settings") && (
            <TabsContent value="settings">
              <OrganisationSettingsTab
                members={teamData.members}
                invitations={teamData.invitations}
                refetch={teamData.refetch}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
