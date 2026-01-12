import { useState, useEffect } from "react";
import { File, FileText, Image, Download, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDocumentUrl, extractFilePath, downloadDocument } from "@/lib/storage";

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
}

interface DocumentListProps {
  companyId: string;
  equipmentId?: string;
  inspectionId?: string;
  siteId?: string;
  profileId?: string;
  canDelete?: boolean;
  className?: string;
  refreshTrigger?: number;
}

const DOCUMENT_TYPE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  certificate: { label: "Certificate", variant: "default" },
  invoice: { label: "Invoice", variant: "secondary" },
  photo: { label: "Photo", variant: "outline" },
  declaration: { label: "Declaration", variant: "default" },
  label: { label: "Label", variant: "secondary" },
  report: { label: "Report", variant: "default" },
  other: { label: "Other", variant: "outline" },
};

export function DocumentList({
  companyId,
  equipmentId,
  inspectionId,
  siteId,
  profileId,
  canDelete = false,
  className,
  refreshTrigger,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("documents")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (equipmentId) {
        query = query.eq("equipment_id", equipmentId);
      }
      if (inspectionId) {
        query = query.eq("inspection_id", inspectionId);
      }
      if (siteId) {
        query = query.eq("site_id", siteId);
      }
      if (profileId) {
        query = query.eq("profile_id", profileId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
      
      // Generate signed URLs for all documents
      if (data && data.length > 0) {
        const urls: Record<string, string> = {};
        await Promise.all(
          data.map(async (doc) => {
            const signedUrl = await getDocumentUrl(doc.file_url);
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
    if (companyId) {
      fetchDocuments();
    }
  }, [companyId, equipmentId, inspectionId, siteId, profileId, refreshTrigger]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const doc = documents.find((d) => d.id === deleteId);
      if (!doc) return;

      // Extract file path for deletion
      const filePath = extractFilePath(doc.file_url);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("compliance-documents")
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage deletion warning:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", deleteId);

      if (dbError) throw dbError;

      setDocuments((prev) => prev.filter((d) => d.id !== deleteId));
      setSignedUrls((prev) => {
        const updated = { ...prev };
        delete updated[deleteId];
        return updated;
      });
      toast.success("Document deleted");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleViewDocument = async (doc: Document) => {
    const url = signedUrls[doc.id];
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const signedUrl = await getDocumentUrl(doc.file_url);
      if (signedUrl) {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Failed to open document");
      }
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      await downloadDocument(doc.file_url, doc.name);
    } catch {
      toast.error("Failed to download document");
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return File;
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <File className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No documents attached</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {documents.map((doc) => {
        const FileIcon = getFileIcon(doc.mime_type);
        const typeConfig = DOCUMENT_TYPE_LABELS[doc.document_type] || DOCUMENT_TYPE_LABELS.other;

        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/5 transition-colors"
          >
            <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(doc.file_size)}</span>
                <span>•</span>
                <span>{format(new Date(doc.created_at), "dd MMM yyyy")}</span>
              </div>
            </div>
            <Badge variant={typeConfig.variant} className="flex-shrink-0">
              {typeConfig.label}
            </Badge>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleViewDocument(doc)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownloadDocument(doc)}
              >
                <Download className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
