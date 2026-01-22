import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { SiteCard } from "@/components/sites/SiteCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LiveClock } from "@/components/ui/live-clock";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface Site {
  id: string;
  name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
}

export default function Sites() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const hasCompany = !!profile?.company_id;

  const fetchSites = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, address, city, postcode, contact_name, contact_phone, contact_email, notes, client_id, clients(id, name)")
        .eq("company_id", profile.company_id)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("name");

      if (error) throw error;
      
      // Map the data to include client info
      const mappedSites = (data || []).map(site => ({
        ...site,
        client: site.clients ? { id: site.clients.id, name: site.clients.name } : null,
      }));
      
      setSites(mappedSites);
    } catch (error: any) {
      toast.error("Failed to load sites");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [profile?.company_id]);

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.postcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 header-gradient p-6 -mx-4 -mt-8 rounded-b-2xl">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 animate-float">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <span className="gradient-text">Sites</span>
            </h1>
            <p className="text-muted-foreground mt-1 ml-14">
              <AnimatedCounter value={sites.length} /> registered locations
            </p>
            <StatusIndicator status="synced" label="Data synced" className="mt-2 ml-14" />
          </div>

          <div className="flex flex-col items-end gap-3">
            <LiveClock showDate className="animate-slide-up" />
          </div>
        </div>

        {/* Company Setup Warning */}
        {!hasCompany && (
          <Alert variant="destructive" className="mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Company Setup Required</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span>You need to create or join a company before you can view sites.</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate("/company/setup")}
                className="w-fit"
              >
                Set Up Company
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Banner */}
        <Alert className="mb-6 animate-fade-in border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Sites are managed through Clients</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            To add or edit sites, go to{" "}
            <Button 
              variant="link" 
              className="h-auto p-0 text-blue-700 dark:text-blue-300 underline"
              onClick={() => navigate("/organisation?tab=clients")}
            >
              Organisation → Clients
            </Button>{" "}
            and manage sites from there.
          </AlertDescription>
        </Alert>

        {/* Search */}
        <div className="mb-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sites by name, address, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Sites Grid */}
        <div className="animate-scale-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading sites...
            </div>
          ) : filteredSites.length === 0 ? (
            <Card className="card-interactive">
              <CardContent className="py-12 text-center">
                {sites.length === 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-float">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No sites yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Sites are created and managed through the Clients module
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/organisation?tab=clients")}
                    >
                      Go to Clients
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No sites found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search query
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSites.map((site, index) => (
                <div 
                  key={site.id} 
                  className="animate-slide-up opacity-0"
                  style={{ animationDelay: `${(index + 3) * 50}ms`, animationFillMode: 'forwards' }}
                >
                  <SiteCard site={site} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
