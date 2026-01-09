import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Search, Filter, Upload, File, Image, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

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
  equipment?: { name: string } | null;
  site?: { name: string } | null;
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
  const companyId = profile?.company_id;
  const [searchParams, setSearchParams] = useSearchParams();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchDocuments = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          equipment:equipment_id (name),
          site:site_id (name)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
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
    fetchDocuments();
    setUploadDialogOpen(false);
  };

  // Calculate stats
  const stats = {
    total: documents.length,
    certificates: documents.filter((d) => d.document_type === "certificate").length,
    photos: documents.filter((d) => d.document_type === "photo").length,
    reports: documents.filter((d) => d.document_type === "report").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Document Management</h1>
            <p className="text-muted-foreground">
              Store and manage compliance documents, certificates, and photos
            </p>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
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
            <p className="text-sm text-muted-foreground">Photos</p>
            <p className="text-2xl font-bold">{stats.photos}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Reports</p>
            <p className="text-2xl font-bold">{stats.reports}</p>
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

        {/* Document List */}
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
                  {filteredDocuments.map((doc) => {
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
    </AppLayout>
  );
}
