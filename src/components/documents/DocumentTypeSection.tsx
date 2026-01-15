import { useState } from "react";
import { File, FileText, Image, Eye, Trash2, Download, Upload, Loader2, ChevronDown, ChevronRight } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { getDocumentUrl, extractFilePath, downloadDocument, isViewableInline } from "@/lib/storage";
import { DocumentViewer } from "./DocumentViewer";

export type DocumentType = "certificate" | "invoice" | "photo" | "declaration" | "label" | "report" | "other";

interface Document {
  id: string;
  name: string;
  file_url: string;
  document_type: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  bucket_id: string | null;
  equipment_id: string | null;
  site_id: string | null;
  equipment?: { name: string } | null;
  site?: { name: string } | null;
}

interface DocumentTypeSectionProps {
  type: DocumentType;
  label: string;
  documents: Document[];
  onUpload: () => void;
  onDelete: (doc: Document) => void;
  canDelete: boolean;
  signedUrls: Record<string, string>;
  defaultOpen?: boolean;
}

const DOCUMENT_TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  certificate: "default",
  invoice: "secondary",
  photo: "outline",
  declaration: "default",
  label: "secondary",
  report: "default",
  other: "outline",
};

export function DocumentTypeSection({
  type,
  label,
  documents,
  onUpload,
  onDelete,
  canDelete,
  signedUrls,
  defaultOpen = true,
}: DocumentTypeSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<Document | null>(null);

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return File;
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleView = async (doc: Document) => {
    if (isViewableInline(doc.mime_type)) {
      setViewerDocument(doc);
    } else {
      const url = signedUrls[doc.id] || await getDocumentUrl(doc.file_url, doc.bucket_id || "compliance-documents");
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Failed to open document");
      }
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await downloadDocument(doc.file_url, doc.name, doc.bucket_id || "compliance-documents");
    } catch {
      toast.error("Failed to download document");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;

    setDeleting(true);
    try {
      const bucketId = deleteDoc.bucket_id || "compliance-documents";
      const filePath = extractFilePath(deleteDoc.file_url, bucketId);

      // Delete from storage
      await supabase.storage.from(bucketId).remove([filePath]);

      // Delete from database
      const { error } = await supabase.from("documents").delete().eq("id", deleteDoc.id);
      if (error) throw error;

      onDelete(deleteDoc);
      toast.success("Document deleted");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
      setDeleteDoc(null);
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">{label}</span>
            <Badge variant="secondary" className="ml-1">
              {documents.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onUpload();
            }}
            className="h-8"
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-2">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No {label.toLowerCase()} uploaded yet
              </p>
            ) : (
              documents.map((doc) => {
                const FileIcon = getFileIcon(doc.mime_type);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                        {doc.file_size && " • "}
                        {format(new Date(doc.created_at), "dd MMM yyyy")}
                        {(doc.equipment?.name || doc.site?.name) && ` • ${doc.equipment?.name || doc.site?.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleView(doc)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(doc)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteDoc(doc)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Document Viewer */}
      <DocumentViewer
        open={!!viewerDocument}
        onOpenChange={(open) => !open && setViewerDocument(null)}
        document={viewerDocument}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteDoc?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
    </>
  );
}
