import { useState, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDocumentUrl, downloadDocument, isViewableInline } from "@/lib/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    name: string;
    file_url: string;
    mime_type: string | null;
    bucket_id?: string | null;
  } | null;
}

export function DocumentViewer({ open, onOpenChange, document }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open && document) {
      setLoading(true);
      setZoom(100);
      setRotation(0);
      setSignedUrl(null);
      
      const fetchUrl = async () => {
        console.log("[DocumentViewer] Fetching URL for:", {
          id: document.id,
          name: document.name,
          fileUrl: document.file_url,
          bucketId: document.bucket_id,
        });
        
        const url = await getDocumentUrl(
          document.file_url, 
          document.bucket_id || "compliance-documents"
        );
        
        console.log("[DocumentViewer] Generated signed URL:", url ? "Success" : "Failed");
        
        setSignedUrl(url);
        setLoading(false);
      };
      
      fetchUrl();
    }
  }, [open, document]);

  const handleDownload = async () => {
    if (!document) return;
    try {
      await downloadDocument(
        document.file_url, 
        document.name,
        document.bucket_id || "compliance-documents"
      );
    } catch {
      toast.error("Failed to download document");
    }
  };

  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  if (!document) return null;

  const mimeType = document.mime_type;
  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const canViewInline = isViewableInline(mimeType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg truncate pr-4">{document.name}</DialogTitle>
            <div className="flex items-center gap-1">
              {isImage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="h-8 w-8"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    className="h-8 w-8"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRotate}
                    className="h-8 w-8"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenExternal}
                className="h-8 w-8"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading document...</p>
            </div>
          ) : !signedUrl ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <p className="text-sm">Failed to load document</p>
              <Button variant="outline" size="sm" onClick={handleOpenExternal}>
                Try opening externally
              </Button>
            </div>
          ) : isImage ? (
            <div 
              className="overflow-auto max-w-full max-h-full"
              style={{ 
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease-out",
              }}
            >
              <img
                src={signedUrl}
                alt={document.name}
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  toast.error("Failed to load image");
                  setSignedUrl(null);
                }}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${signedUrl}#toolbar=1&navpanes=0`}
              title={document.name}
              className="w-full h-full min-h-[500px] rounded border"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-muted-foreground">
                This file type cannot be previewed inline.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenExternal}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
