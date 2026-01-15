import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, ImagePlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getBucketForDocument, generateFilePath } from "@/lib/storage";

interface BulkPhotoUploaderProps {
  companyId: string;
  equipmentId?: string;
  inspectionId?: string;
  siteId?: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
  className?: string;
}

interface PendingPhoto {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "complete" | "error";
}

export function BulkPhotoUploader({
  companyId,
  equipmentId,
  inspectionId,
  siteId,
  onUploadComplete,
  maxFiles = 20,
  className,
}: BulkPhotoUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles
      .slice(0, maxFiles - pendingPhotos.length)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
      }));
    setPendingPhotos((prev) => [...prev, ...newPhotos]);
  }, [maxFiles, pendingPhotos.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"],
    },
    maxSize: 15 * 1024 * 1024, // 15MB per image
    maxFiles: maxFiles - pendingPhotos.length,
    disabled: uploading,
  });

  const removePhoto = (index: number) => {
    setPendingPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const clearAll = () => {
    pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    setPendingPhotos([]);
  };

  const uploadPhotos = async () => {
    if (!user || pendingPhotos.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const totalPhotos = pendingPhotos.length;
    let completedPhotos = 0;
    let successCount = 0;
    let errorCount = 0;

    // Determine the target bucket based on context
    const targetBucket = getBucketForDocument({
      documentType: "photo",
      siteId,
      equipmentId,
    });

    try {
      for (let i = 0; i < pendingPhotos.length; i++) {
        const photo = pendingPhotos[i];
        
        // Update status to uploading
        setPendingPhotos((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "uploading" };
          return updated;
        });

        try {
          // Generate structured file path
          const filePath = generateFilePath(companyId, photo.file.name);

          // Upload to the appropriate storage bucket
          const { error: uploadError } = await supabase.storage
            .from(targetBucket)
            .upload(filePath, photo.file, {
              contentType: photo.file.type,
            });

          if (uploadError) throw uploadError;

          // Create document record with bucket_id
          const { error: docError } = await supabase
            .from("documents")
            .insert({
              company_id: companyId,
              equipment_id: equipmentId || null,
              inspection_id: inspectionId || null,
              site_id: siteId || null,
              document_type: "photo",
              name: photo.file.name,
              file_url: filePath,
              file_size: photo.file.size,
              mime_type: photo.file.type,
              uploaded_by: user.id,
              bucket_id: targetBucket,
            });

          if (docError) throw docError;

          // Update status to complete
          setPendingPhotos((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: "complete" };
            return updated;
          });

          successCount++;
        } catch (error) {
          console.error(`Error uploading ${photo.file.name}:`, error);
          
          // Update status to error
          setPendingPhotos((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: "error" };
            return updated;
          });

          errorCount++;
        }

        completedPhotos++;
        setUploadProgress((completedPhotos / totalPhotos) * 100);
      }

      if (successCount > 0) {
        toast.success(`${successCount} photo(s) uploaded successfully`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} photo(s) failed to upload`);
      }

      // Clear successful uploads after a delay
      setTimeout(() => {
        setPendingPhotos((prev) => prev.filter((p) => p.status !== "complete"));
        if (onUploadComplete) {
          onUploadComplete();
        }
      }, 1500);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const pendingCount = pendingPhotos.filter((p) => p.status === "pending").length;
  const uploadingCount = pendingPhotos.filter((p) => p.status === "uploading").length;
  const completeCount = pendingPhotos.filter((p) => p.status === "complete").length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg font-medium text-primary">Drop photos here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium">
              Drag & drop photos here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to select files
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              JPEG, PNG, WebP • Max 15MB per photo • Up to {maxFiles} photos
            </p>
          </div>
        )}
      </div>

      {/* Photo Grid Preview */}
      {pendingPhotos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {pendingPhotos.length} photo{pendingPhotos.length !== 1 ? "s" : ""} selected
              {completeCount > 0 && (
                <span className="text-green-600 ml-2">
                  ({completeCount} uploaded)
                </span>
              )}
            </p>
            {!uploading && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {pendingPhotos.map((photo, index) => (
              <div
                key={`${photo.file.name}-${index}`}
                className="relative aspect-square group"
              >
                <img
                  src={photo.preview}
                  alt={photo.file.name}
                  className={cn(
                    "w-full h-full object-cover rounded-lg border",
                    photo.status === "complete" && "ring-2 ring-green-500",
                    photo.status === "error" && "ring-2 ring-destructive opacity-50",
                    photo.status === "uploading" && "opacity-70"
                  )}
                />
                
                {/* Status Overlay */}
                {photo.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                {photo.status === "complete" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                )}

                {/* Remove Button */}
                {photo.status === "pending" && !uploading && (
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* File Name Tooltip */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white truncate">
                    {photo.file.name}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Uploading {uploadingCount} of {pendingPhotos.length}...
              </p>
            </div>
          )}

          {/* Upload Button */}
          {pendingCount > 0 && (
            <Button
              onClick={uploadPhotos}
              disabled={uploading || pendingCount === 0}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingCount} Photo{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
