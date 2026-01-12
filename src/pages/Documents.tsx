import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileText, Search, Filter, Upload, File, Image, Loader2, Building2, Thermometer, Grid3X3, List, AlertTriangle, ImagePlus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { BulkPhotoUploader } from "@/components/documents/BulkPhotoUploader";
import { ExpiryAlertBanner } from "@/components/alerts/ExpiryAlertBanner";
import { useExpiryAlerts } from "@/hooks/useExpiryAlerts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
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

const DOCUMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "certificate", label: "Certificates" },
  { value: "invoice", label: "Invoices" },
  { value: "photo", label: "Photos" },
  { value: "declaration", label: "Declarations" },
  { value: "label", label: "Labels" },
  { value: "report", label: "Reports" },
  { value: "other", label: "Other" },
];

const DOCUMENT_TYPE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  certificate: { label: "Certificate", variant: "default" },
  invoice: { label: "Invoice", variant: "secondary" },
  photo: { label: "Photo", variant: "outline" },
  declaration: { label: "Declaration", variant: "default" },
  label: { label: "Label", variant: "secondary" },
  report: { label: "Report", variant: "default" },
  other: { label: "Other", variant: "outline" },
};

export default function Documents() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const companyId = profile?.company_id;
  const [searchParams, setSearchParams] = useSearchParams();
  const { alerts, criticalAlerts, warningAlerts } = useExpiryAlerts();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [bulkPhotoDialogOpen, setBulkPhotoDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeTab, setActiveTab] = useState("all");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

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
          .order("name"),
        supabase
          .from("equipment")
          .select("id, name, site_id")
          .eq("company_id", companyId)
          .order("name"),
      ]);

      if (docsRes.error) throw docsRes.error;
      setDocuments(docsRes.data || []);
      setSites(sitesRes.data || []);
      setEquipment(equipmentRes.data || []);
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

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group documents by site
  const documentsBySite = useMemo(() => {
    const grouped: Record<string, Document[]> = {};
    sites.forEach((site) => {
      grouped[site.id] = documents.filter((doc) => doc.site_id === site.id);
    });
    grouped["unassigned"] = documents.filter((doc) => !doc.site_id && !doc.equipment_id);
    return grouped;
  }, [documents, sites]);

  // Group documents by equipment
  const documentsByEquipment = useMemo(() => {
    const grouped: Record<string, Document[]> = {};
    equipment.forEach((eq) => {
      grouped[eq.id] = documents.filter((doc) => doc.equipment_id === eq.id);
    });
    return grouped;
  }, [documents, equipment]);

  // Filter only photos for media gallery
  const mediaDocuments = useMemo(() => {
    return documents.filter((doc) => doc.document_type === "photo" || doc.mime_type?.startsWith("image/"));
  }, [documents]);

  // Generate signed URLs for media documents
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (mediaDocuments.length === 0) return;
      
      const urls: Record<string, string> = {};
      await Promise.all(
        mediaDocuments.map(async (doc) => {
          const signedUrl = await getDocumentUrl(doc.file_url);
          if (signedUrl) {
            urls[doc.id] = signedUrl;
          }
        })
      );
      setSignedUrls(urls);
    };

    generateSignedUrls();
  }, [mediaDocuments]);

  // Filter compliance documents
  const complianceDocuments = useMemo(() => {
    return documents.filter((doc) => 
      ["certificate", "declaration", "report"].includes(doc.document_type)
    );
  }, [documents]);

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return File;
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadComplete = () => {
    fetchData();
    setUploadDialogOpen(false);
    setBulkPhotoDialogOpen(false);
  };

  // Calculate stats
  const stats = {
    total: documents.length,
    certificates: documents.filter((d) => d.document_type === "certificate").length,
    photos: documents.filter((d) => d.document_type === "photo").length,
    reports: documents.filter((d) => d.document_type === "report").length,
    expiring: alerts.length,
  };

  const renderDocumentRow = (doc: Document) => {
    const FileIcon = getFileIcon(doc.mime_type);
    const typeConfig = DOCUMENT_TYPE_LABELS[doc.document_type] || DOCUMENT_TYPE_LABELS.other;

    return (
      <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/50">
        <td className="p-4">
          <div className="flex items-center gap-3">
            <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate max-w-[200px]">{doc.name}</span>
          </div>
        </td>
        <td className="p-4 hidden md:table-cell">
          <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
        </td>
        <td className="p-4 hidden lg:table-cell text-muted-foreground">
          {doc.equipment?.name || doc.site?.name || "—"}
        </td>
        <td className="p-4 hidden sm:table-cell text-muted-foreground">
          {formatFileSize(doc.file_size)}
        </td>
        <td className="p-4 text-muted-foreground">
          {format(new Date(doc.created_at), "dd MMM yyyy")}
        </td>
        <td className="p-4 text-right">
          <Button variant="ghost" size="sm" asChild>
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
              View
            </a>
          </Button>
        </td>
      </tr>
    );
  };

  const renderDocumentCard = (doc: Document) => {
    const FileIcon = getFileIcon(doc.mime_type);
    const typeConfig = DOCUMENT_TYPE_LABELS[doc.document_type] || DOCUMENT_TYPE_LABELS.other;
    const isImage = doc.mime_type?.startsWith("image/");

    return (
      <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow">
        {isImage ? (
          <div className="aspect-video bg-muted overflow-hidden">
            <img
              src={doc.file_url}
              alt={doc.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <FileIcon className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <CardContent className="p-4">
          <p className="font-medium truncate mb-1">{doc.name}</p>
          <div className="flex items-center justify-between">
            <Badge variant={typeConfig.variant} className="text-xs">
              {typeConfig.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(doc.created_at), "dd MMM")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

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

        {/* Expiry Alerts */}
        {alerts.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Expiring Documents & Certificates
              </CardTitle>
              <CardDescription>
                {criticalAlerts.length > 0 && (
                  <Badge variant="destructive" className="mr-2">{criticalAlerts.length} critical</Badge>
                )}
                {warningAlerts.length > 0 && (
                  <Badge variant="secondary">{warningAlerts.length} due soon</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpiryAlertBanner alerts={alerts} variant="full" maxVisible={5} />
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
            <p className="text-sm text-muted-foreground">Reports</p>
            <p className="text-2xl font-bold">{stats.reports}</p>
          </div>
          <div className={`bg-card rounded-lg border p-4 ${stats.expiring > 0 ? "border-amber-500/50" : ""}`}>
            <p className="text-sm text-muted-foreground">Expiring Soon</p>
            <p className={`text-2xl font-bold ${stats.expiring > 0 ? "text-amber-500" : ""}`}>
              {stats.expiring}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList>
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="by-site">By Site</TabsTrigger>
              <TabsTrigger value="by-equipment">By Equipment</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="media">Media Gallery</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* All Documents Tab */}
          <TabsContent value="all">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-1">No documents found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || typeFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Upload your first document to get started"}
                </p>
                {!searchQuery && typeFilter === "all" && (
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDocuments.map(renderDocumentCard)}
              </div>
            ) : (
              <div className="bg-card rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Document</th>
                        <th className="text-left p-4 font-medium hidden md:table-cell">Type</th>
                        <th className="text-left p-4 font-medium hidden lg:table-cell">Related To</th>
                        <th className="text-left p-4 font-medium hidden sm:table-cell">Size</th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map(renderDocumentRow)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* By Site Tab */}
          <TabsContent value="by-site">
            <Card>
              <CardHeader>
                <CardTitle>Documents by Site</CardTitle>
                <CardDescription>View documents organized by site location</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {sites.map((site) => {
                    const siteDocs = documentsBySite[site.id] || [];
                    return (
                      <AccordionItem key={site.id} value={site.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{site.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              {siteDocs.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {siteDocs.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4">
                              No documents attached to this site
                            </p>
                          ) : (
                            <div className="space-y-2 pt-2">
                              {siteDocs.map((doc) => {
                                const FileIcon = getFileIcon(doc.mime_type);
                                const typeConfig = DOCUMENT_TYPE_LABELS[doc.document_type] || DOCUMENT_TYPE_LABELS.other;
                                return (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                                  >
                                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                                    <span className="flex-1 truncate text-sm">{doc.name}</span>
                                    <Badge variant={typeConfig.variant} className="text-xs">
                                      {typeConfig.label}
                                    </Badge>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                        View
                                      </a>
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => navigate(`/sites/${site.id}`)}
                          >
                            Go to Site
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Equipment Tab */}
          <TabsContent value="by-equipment">
            <Card>
              <CardHeader>
                <CardTitle>Documents by Equipment</CardTitle>
                <CardDescription>View documents organized by equipment</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {equipment.map((eq) => {
                    const eqDocs = documentsByEquipment[eq.id] || [];
                    return (
                      <AccordionItem key={eq.id} value={eq.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Thermometer className="h-4 w-4 text-muted-foreground" />
                            <span>{eq.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              {eqDocs.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {eqDocs.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4">
                              No documents attached to this equipment
                            </p>
                          ) : (
                            <div className="space-y-2 pt-2">
                              {eqDocs.map((doc) => {
                                const FileIcon = getFileIcon(doc.mime_type);
                                const typeConfig = DOCUMENT_TYPE_LABELS[doc.document_type] || DOCUMENT_TYPE_LABELS.other;
                                return (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                                  >
                                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                                    <span className="flex-1 truncate text-sm">{doc.name}</span>
                                    <Badge variant={typeConfig.variant} className="text-xs">
                                      {typeConfig.label}
                                    </Badge>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                        View
                                      </a>
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => navigate(`/equipment/${eq.id}`)}
                          >
                            Go to Equipment
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Documents</CardTitle>
                <CardDescription>Certificates, declarations, and reports</CardDescription>
              </CardHeader>
              <CardContent>
                {complianceDocuments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No compliance documents found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {complianceDocuments.map((doc) => {
                      const FileIcon = getFileIcon(doc.mime_type);
                      const typeConfig = DOCUMENT_TYPE_LABELS[doc.document_type] || DOCUMENT_TYPE_LABELS.other;
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/50"
                        >
                          <FileIcon className="h-6 w-6 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.equipment?.name || doc.site?.name || "General"} • {format(new Date(doc.created_at), "dd MMM yyyy")}
                            </p>
                          </div>
                          <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Gallery Tab */}
          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle>Media Gallery</CardTitle>
                <CardDescription>Photos and images from all sites and equipment</CardDescription>
              </CardHeader>
              <CardContent>
                {mediaDocuments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No photos found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {mediaDocuments.map((doc) => {
                      const imageUrl = signedUrls[doc.id];
                      
                      return (
                        <button
                          key={doc.id}
                          onClick={async () => {
                            const url = imageUrl || await getDocumentUrl(doc.file_url);
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          className="group relative aspect-square rounded-lg overflow-hidden bg-muted text-left"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={doc.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                            <div className="w-full p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-white text-xs truncate">{doc.name}</p>
                              <p className="text-white/70 text-xs">
                                {doc.equipment?.name || doc.site?.name || ""}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
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
