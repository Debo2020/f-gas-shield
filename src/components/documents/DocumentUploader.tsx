import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, File, Image, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentUploaderProps {
  companyId: string;
  equipmentId?: string;
  inspectionId?: string;
  siteId?: string;
  profileId?: string;
  documentType?: "certificate" | "invoice" | "photo" | "declaration" | "label" | "report" | "other";
  onUploadComplete?: (document: UploadedDocument) => void;
  maxFiles?: number;
  className?: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  file_url: string;
  document_type: string;
  file_size: number;
  mime_type: string;
}

const ALLOWED_TYPES = {
  "image/jpeg": { icon: Image, label: "JPEG" },
  "image/png": { icon: Image, label: "PNG" },
  "image/webp": { icon: Image, label: "WebP" },
  "application/pdf": { icon: FileText, label: "PDF" },
  "application/msword": { icon: File, label: "DOC" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: File, label: "DOCX" },
};

export function DocumentUploader({
  companyId,
  equipmentId,
  inspectionId,
  siteId,
  profileId,
  documentType = "other",
  onUploadComplete,
  maxFiles = 5,
  className,
}: DocumentUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxFiles - pendingFiles.length);
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, [maxFiles, pendingFiles.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: maxFiles - pendingFiles.length,
    disabled: uploading,
  });

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!user || pendingFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const totalFiles = pendingFiles.length;
    let completedFiles = 0;

    try {
      for (const file of pendingFiles) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${companyId}/${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("compliance-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("compliance-documents")
          .getPublicUrl(filePath);

        // Create document record
        const { data: docData, error: docError } = await supabase
          .from("documents")
          .insert({
            company_id: companyId,
            equipment_id: equipmentId || null,
            inspection_id: inspectionId || null,
            site_id: siteId || null,
            profile_id: profileId || null,
            document_type: documentType,
            name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (docError) throw docError;

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);

        if (onUploadComplete && docData) {
          onUploadComplete(docData as UploadedDocument);
        }
      }

      toast.success(`${totalFiles} file(s) uploaded successfully`);
      setPendingFiles([]);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = (mimeType: string) => {
    const config = ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES];
    return config?.icon || File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-primary">Drop files here...</p>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Images (JPG, PNG, WebP), Word documents • Max 10MB
            </p>
          </div>
        )}
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Files to upload ({pendingFiles.length})</p>
          {pendingFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
              >
                <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {uploading && (
            <Progress value={uploadProgress} className="h-2" />
          )}

          <Button
            onClick={uploadFiles}
            disabled={uploading || pendingFiles.length === 0}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {pendingFiles.length} file(s)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
