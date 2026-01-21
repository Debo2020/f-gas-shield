import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  Upload,
  Loader2,
  Shield,
  ImagePlus,
  FolderOpen,
} from "lucide-react";
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

export function OrganisationDocumentsTab() {
  const { profile, hasRole } = useAuth();
  const companyId = profile?.company_id;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [bulkPhotoDialogOpen, setBulkPhotoDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("compliance");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const canDelete = hasRole("owner") || hasRole("manager");

  // Only show company-level documents (no site_id association)
  const companyDocuments = useMemo(() => {
    return documents.filter((doc) => doc.site_id === null && doc.equipment_id === null);
  }, [documents]);

  const fetchData = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const [docsRes, sitesRes, equipmentRes] = await Promise.all([
        supabase
          .from("documents")
          .select(`*, equipment:equipment_id (name), site:site_id (name)`)
          .eq("company_id", companyId)
          .is("site_id", null)
          .is("equipment_id", null)
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

      // Generate signed URLs for images
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

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return companyDocuments;
    const query = searchQuery.toLowerCase();
    return companyDocuments.filter(
      (doc) =>
        doc.name.toLowerCase().includes(query) ||
        doc.document_type.toLowerCase().includes(query)
    );
  }, [companyDocuments, searchQuery]);

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

  const stats = useMemo(
    () => ({
      total: companyDocuments.length,
      certificates: companyDocuments.filter((d) => d.document_type === "certificate").length,
      declarations: companyDocuments.filter((d) => d.document_type === "declaration").length,
      reports: companyDocuments.filter((d) => d.document_type === "report").length,
    }),
    [companyDocuments]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Organisation Documents
          </h2>
          <p className="text-sm text-muted-foreground">
            Company-wide compliance documents and certificates
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Documents</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Certificates</p>
          <p className="text-2xl font-bold">{stats.certificates}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Declarations</p>
          <p className="text-2xl font-bold">{stats.declarations}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Reports</p>
          <p className="text-2xl font-bold">{stats.reports}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Documents */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Documents
            </CardTitle>
            <CardDescription>
              Company-wide certificates, declarations, and regulatory compliance reports
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
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a company-wide compliance document
            </DialogDescription>
          </DialogHeader>
          {companyId && (
            <DocumentUploader
              companyId={companyId}
              documentType="certificate"
              onUploadComplete={handleUploadComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Photo Dialog */}
      <Dialog open={bulkPhotoDialogOpen} onOpenChange={setBulkPhotoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Photo Upload</DialogTitle>
            <DialogDescription>
              Upload multiple photos at once
            </DialogDescription>
          </DialogHeader>
          {companyId && (
            <BulkPhotoUploader
              companyId={companyId}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
