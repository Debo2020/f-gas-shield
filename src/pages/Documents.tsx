import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileText, Search, Upload, File, Image, Loader2, Building2, Thermometer, Shield, Camera, AlertTriangle, ImagePlus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { BulkPhotoUploader } from "@/components/documents/BulkPhotoUploader";
import { DocumentCategorySection } from "@/components/documents/DocumentCategorySection";
import { ExpiryAlertBanner } from "@/components/alerts/ExpiryAlertBanner";
import { useExpiryAlerts } from "@/hooks/useExpiryAlerts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getDocumentUrl } from "@/lib/storage";

interface Document {
  id: string;
  name: string;
  file_url: string;
  document_type: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  equipment_id: string | null;
  inspection_id: string | null;
  site_id: string | null;
  profile_id: string | null;
  bucket_id: string | null;
  equipment?: { name: string } | null;
  site?: { name: string } | null;
}

interface Site {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
  site_id: string;
}

export default function Documents() {
  const { profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const companyId = profile?.company_id;
  const [searchParams, setSearchParams] = useSearchParams();
  const { documentAlerts } = useExpiryAlerts();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [bulkPhotoDialogOpen, setBulkPhotoDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("site");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Check if user can delete documents (owner or manager role)
  const canDelete = hasRole("owner") || hasRole("manager");

  const fetchData = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const [docsRes, sitesRes, equipmentRes] = await Promise.all([
        supabase
          .from("documents")
          .select(`
            *,
            equipment:equipment_id (name),
            site:site_id (name)
          `)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
        supabase
          .from("sites")
          .select("id, name")
          .eq("company_id", companyId)
          .eq("is_deleted", false)
          .order("name"),
        supabase
          .from("equipment")
          .select("id, name, site_id")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .order("name"),
      ]);

      if (docsRes.error) throw docsRes.error;
      setDocuments(docsRes.data || []);
      setSites(sitesRes.data || []);
      setEquipment(equipmentRes.data || []);

      // Generate signed URLs for image documents
      if (docsRes.data && docsRes.data.length > 0) {
        const imagesDocs = docsRes.data.filter(
          (doc) => doc.mime_type?.startsWith("image/") || doc.document_type === "photo"
        );
        const urls: Record<string, string> = {};
        await Promise.all(
          imagesDocs.map(async (doc) => {
            const signedUrl = await getDocumentUrl(doc.file_url, doc.bucket_id || "compliance-documents");
            if (signedUrl) {
              urls[doc.id] = signedUrl;
            }
          })
        );
        setSignedUrls(urls);
      }
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  // Handle ?action=new from URL
  useEffect(() => {
    if (searchParams.get("action") === "new" && companyId && !loading) {
      setUploadDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, companyId, loading]);

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(query) ||
        doc.document_type.toLowerCase().includes(query) ||
        doc.equipment?.name?.toLowerCase().includes(query) ||
        doc.site?.name?.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const handleUploadComplete = () => {
    fetchData();
    setUploadDialogOpen(false);
    setBulkPhotoDialogOpen(false);
  };

  const handleDocumentDeleted = (doc: Document) => {
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    setSignedUrls((prev) => {
      const updated = { ...prev };
      delete updated[doc.id];
      return updated;
    });
  };

  // Calculate stats
  const stats = useMemo(() => ({
    total: documents.length,
    certificates: documents.filter((d) => d.document_type === "certificate").length,
    photos: documents.filter((d) => d.document_type === "photo" || d.mime_type?.startsWith("image/")).length,
    compliance: documents.filter((d) => ["certificate", "declaration", "report"].includes(d.document_type)).length,
    expiring: documentAlerts.length,
  }), [documents, documentAlerts]);

  // Category-specific counts
  const categoryCounts = useMemo(() => ({
    site: documents.filter(
      (d) => (d.site_id !== null && d.equipment_id === null) || 
             (d.site_id === null && d.equipment_id === null && ["declaration", "invoice", "report", "other"].includes(d.document_type))
    ).length,
    compliance: documents.filter((d) => ["certificate", "declaration", "report"].includes(d.document_type)).length,
    equipment: documents.filter((d) => d.equipment_id !== null || d.document_type === "label").length,
    media: documents.filter((d) => d.document_type === "photo" || d.document_type === "label" || d.mime_type?.startsWith("image/")).length,
  }), [documents]);

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Document Management</h1>
            <p className="text-muted-foreground">
              Store and manage compliance documents, certificates, and photos
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setUploadDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Single Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkPhotoDialogOpen(true)}>
                <ImagePlus className="h-4 w-4 mr-2" />
                Bulk Photos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Expiry Alerts — only show actual document expiries on the Documents page */}
        {documentAlerts.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Expiring Documents
              </CardTitle>
              <CardDescription>
                Documents approaching or past their expiry date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpiryAlertBanner alerts={documentAlerts} variant="full" maxVisible={5} />
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Documents</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Certificates</p>
            <p className="text-2xl font-bold">{stats.certificates}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Photos</p>
            <p className="text-2xl font-bold">{stats.photos}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Compliance</p>
            <p className="text-2xl font-bold">{stats.compliance}</p>
          </div>
          <div className={`bg-card rounded-lg border p-4 ${stats.expiring > 0 ? "border-amber-500/50" : ""}`}>
            <p className="text-sm text-muted-foreground">Expiring Soon</p>
            <p className={`text-2xl font-bold ${stats.expiring > 0 ? "text-amber-500" : ""}`}>
              {stats.expiring}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="site" className="gap-2">
              <Building2 className="h-4 w-4 hidden sm:block" />
              Site
              <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
                {categoryCounts.site}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2">
              <Shield className="h-4 w-4 hidden sm:block" />
              Compliance
              <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
                {categoryCounts.compliance}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="gap-2">
              <Thermometer className="h-4 w-4 hidden sm:block" />
              Equipment
              <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
                {categoryCounts.equipment}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2">
              <Camera className="h-4 w-4 hidden sm:block" />
              Media
              <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
                {categoryCounts.media}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Site Documents */}
              <TabsContent value="site">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Site Documents
                    </CardTitle>
                    <CardDescription>
                      Documents related to your site locations including declarations, invoices, and reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {companyId && (
                      <DocumentCategorySection
                        category="site"
                        documents={filteredDocuments}
                        sites={sites}
                        equipment={equipment}
                        companyId={companyId}
                        canDelete={canDelete}
                        signedUrls={signedUrls}
                        onDocumentDeleted={handleDocumentDeleted}
                        onUploadComplete={handleUploadComplete}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compliance Documents */}
              <TabsContent value="compliance">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Compliance Documents
                    </CardTitle>
                    <CardDescription>
                      Certificates, declarations, and regulatory compliance reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {companyId && (
                      <DocumentCategorySection
                        category="compliance"
                        documents={filteredDocuments}
                        sites={sites}
                        equipment={equipment}
                        companyId={companyId}
                        canDelete={canDelete}
                        signedUrls={signedUrls}
                        onDocumentDeleted={handleDocumentDeleted}
                        onUploadComplete={handleUploadComplete}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Equipment Documents */}
              <TabsContent value="equipment">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5" />
                      Equipment Documents
                    </CardTitle>
                    <CardDescription>
                      Labels, photos, and documentation for your equipment assets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {companyId && (
                      <DocumentCategorySection
                        category="equipment"
                        documents={filteredDocuments}
                        sites={sites}
                        equipment={equipment}
                        companyId={companyId}
                        canDelete={canDelete}
                        signedUrls={signedUrls}
                        onDocumentDeleted={handleDocumentDeleted}
                        onUploadComplete={handleUploadComplete}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Media Gallery */}
              <TabsContent value="media">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Media Gallery
                    </CardTitle>
                    <CardDescription>
                      Photos, images, and visual documentation from all sources
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {companyId && (
                      <DocumentCategorySection
                        category="media"
                        documents={filteredDocuments}
                        sites={sites}
                        equipment={equipment}
                        companyId={companyId}
                        canDelete={canDelete}
                        signedUrls={signedUrls}
                        onDocumentDeleted={handleDocumentDeleted}
                        onUploadComplete={handleUploadComplete}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload compliance documents, certificates, photos, or invoices
            </DialogDescription>
          </DialogHeader>
          {companyId && (
            <DocumentUploader
              companyId={companyId}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Photo Upload Dialog */}
      <Dialog open={bulkPhotoDialogOpen} onOpenChange={setBulkPhotoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              Bulk Photo Upload
            </DialogTitle>
            <DialogDescription>
              Upload multiple photos at once with drag-and-drop
            </DialogDescription>
          </DialogHeader>
          {companyId && (
            <BulkPhotoUploader
              companyId={companyId}
              onUploadComplete={handleUploadComplete}
              maxFiles={20}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
