import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Phone,
  Mail,
  User,
  Thermometer,
  Loader2,
  Plus,
  FolderOpen,
  Camera,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentList } from "@/components/documents/DocumentList";
import { SiteInspectionsTable } from "@/components/sites/SiteInspectionsTable";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { CameraCapture } from "@/components/documents/CameraCapture";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  created_at: string;
}

interface Equipment {
  id: string;
  name: string;
  refrigerant_type: string;
  refrigerant_charge_kg: number;
  co2_equivalent_tonnes: number | null;
  next_inspection_due: string | null;
  is_active: boolean;
}

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, hasRole, hasActiveLicense } = useAuth();

  const [site, setSite] = useState<Site | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [docRefresh, setDocRefresh] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const isEngineer = hasRole("engineer");
  const canEdit = isOwner || isManager;
  const canPerformActions = canEdit && (isOwner || hasActiveLicense);
  const canSyncBMS = isOwner || isManager || isEngineer;

  const fetchData = async () => {
    if (!profile?.company_id || !id) return;

    try {
      const [siteRes, equipmentRes, docCountRes] = await Promise.all([
        supabase
          .from("sites")
          .select("*")
          .eq("id", id)
          .eq("company_id", profile.company_id)
          .maybeSingle(),
        supabase
          .from("equipment")
          .select("id, name, refrigerant_type, refrigerant_charge_kg, co2_equivalent_tonnes, next_inspection_due, is_active")
          .eq("site_id", id)
          .eq("company_id", profile.company_id)
          .order("name"),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("site_id", id)
          .eq("company_id", profile.company_id),
      ]);

      if (siteRes.error) throw siteRes.error;
      if (!siteRes.data) {
        toast.error("Site not found");
        navigate("/sites");
        return;
      }

      setSite(siteRes.data);
      setEquipment(equipmentRes.data || []);
      setDocumentCount(docCountRes.count || 0);
    } catch (error: any) {
      toast.error("Failed to load site details");
      navigate("/sites");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id, id]);

  const fullAddress = site
    ? [site.address, site.city, site.postcode].filter(Boolean).join(", ")
    : "";

  const totalCo2e = equipment.reduce((sum, e) => sum + (e.co2_equivalent_tonnes || 0), 0);
  const activeEquipment = equipment.filter((e) => e.is_active);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!site) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/sites")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sites
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-heading font-bold">{site.name}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{fullAddress}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCameraOpen(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              {canSyncBMS && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info("BMS integration coming soon", { 
                    description: `This feature will allow syncing data for ${site.name} to your Building Management System.` 
                  })}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync to BMS
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Thermometer className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter value={activeEquipment.length} />
                  </p>
                  <p className="text-xs text-muted-foreground">Systems</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Building2 className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter value={totalCo2e} decimals={1} /> t
                  </p>
                  <p className="text-xs text-muted-foreground">Total CO₂e</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter value={documentCount} />
                  </p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {canEdit && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <User className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium truncate max-w-[120px]">
                    {site.contact_name || "No contact"}
                  </p>
                  <p className="text-xs text-muted-foreground">Site Contact</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equipment">Systems ({equipment.length})</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documentCount})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Site Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" />
                    Site Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{fullAddress}</p>
                  </div>
                  {site.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{site.notes}</p>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{format(new Date(site.created_at), "dd MMMM yyyy")}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information - only visible to owners and managers */}
              {canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {site.contact_name && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{site.contact_name}</span>
                    </div>
                  )}
                  {site.contact_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${site.contact_phone}`} className="text-primary hover:underline">
                        {site.contact_phone}
                      </a>
                    </div>
                  )}
                  {site.contact_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${site.contact_email}`} className="text-primary hover:underline">
                        {site.contact_email}
                      </a>
                    </div>
                  )}
                  {!site.contact_name && !site.contact_phone && !site.contact_email && (
                    <p className="text-muted-foreground text-sm">No contact information available</p>
                  )}
                </CardContent>
              </Card>
              )}
            </div>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment">
            <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle>F-Gas Systems at this Site</CardTitle>
                   <CardDescription>
                     All refrigeration systems registered at {site.name}
                  </CardDescription>
                </div>
                {canPerformActions && (
                  <Button size="sm" onClick={() => navigate(`/equipment?action=new&siteId=${site.id}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {equipment.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                     <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                     <p className="mb-4">No F-Gas systems registered at this site</p>
                     {canPerformActions && (
                       <Button onClick={() => navigate(`/equipment?action=new&siteId=${site.id}`)}>
                         <Plus className="h-4 w-4 mr-2" />
                         Add System
                       </Button>
                     )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {equipment.map((eq) => (
                      <div
                        key={eq.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/equipment/${eq.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Thermometer className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{eq.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {eq.refrigerant_type}
                              </Badge>
                              <span>{eq.refrigerant_charge_kg.toFixed(2)} kg</span>
                              <span>•</span>
                              <span>{eq.co2_equivalent_tonnes?.toFixed(2)} t CO₂e</span>
                            </div>
                          </div>
                        </div>
                        {!eq.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections">
            <SiteInspectionsTable siteId={site.id} siteName={site.name} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Site Documents</CardTitle>
                <CardDescription>
                  Photos, contracts, and compliance documents for this site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile?.company_id && (
                  <>
                    <DocumentUploader
                      companyId={profile.company_id}
                      siteId={site.id}
                      documentType="photo"
                      onUploadComplete={() => {
                        setDocRefresh((p) => p + 1);
                        fetchData();
                      }}
                    />
                    <DocumentList
                      companyId={profile.company_id}
                      siteId={site.id}
                      refreshTrigger={docRefresh}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Camera Capture Dialog */}
      {profile?.company_id && (
        <CameraCapture
          open={isCameraOpen}
          onOpenChange={setIsCameraOpen}
          companyId={profile.company_id}
          siteId={site.id}
          onCaptureComplete={() => {
            setDocRefresh((p) => p + 1);
            fetchData();
          }}
        />
      )}
    </AppLayout>
  );
}
