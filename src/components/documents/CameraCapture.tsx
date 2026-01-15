import { useState, useRef, useCallback } from "react";
import { Camera, X, Check, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getBucketForDocument, generateFilePath } from "@/lib/storage";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  equipmentId?: string;
  siteId?: string;
  inspectionId?: string;
  onCaptureComplete?: (document: CapturedDocument) => void;
}

export interface CapturedDocument {
  id: string;
  name: string;
  file_url: string;
  document_type: string;
  file_size: number;
  mime_type: string;
}

export function CameraCapture({
  open,
  onOpenChange,
  companyId,
  equipmentId,
  siteId,
  inspectionId,
  onCaptureComplete,
}: CameraCaptureProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error: any) {
      console.error("Camera access error:", error);
      // If camera not available, fallback to file input
      if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
        toast.error("Camera not available. Please select a file instead.");
        fileInputRef.current?.click();
      } else {
        toast.error("Failed to access camera");
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
    setTimeout(startCamera, 100);
  }, [stopCamera, startCamera]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const uploadPhoto = async () => {
    if (!capturedImage || !user) return;

    setIsUploading(true);

    // Determine the target bucket based on context
    const targetBucket = getBucketForDocument({
      documentType: "photo",
      siteId,
      equipmentId,
    });

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `photo_${timestamp}.jpg`;
      
      // Generate structured file path
      const filePath = generateFilePath(companyId, fileName);

      // Upload to the appropriate storage bucket
      const { error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(filePath, blob, {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // Store the file path and bucket_id for proper retrieval
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          company_id: companyId,
          equipment_id: equipmentId || null,
          site_id: siteId || null,
          inspection_id: inspectionId || null,
          document_type: "photo",
          name: fileName,
          file_url: filePath,
          file_size: blob.size,
          mime_type: "image/jpeg",
          uploaded_by: user.id,
          bucket_id: targetBucket,
        })
        .select()
        .single();

      if (docError) throw docError;

      toast.success("Photo saved successfully");
      
      if (onCaptureComplete && docData) {
        onCaptureComplete(docData as CapturedDocument);
      }
      
      handleClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Failed to save photo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    onOpenChange(false);
  }, [stopCamera, onOpenChange]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      startCamera();
    } else {
      handleClose();
    }
  }, [startCamera, handleClose]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Take Photo
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-black">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </>
          ) : (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Hidden file input for fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="p-4 space-y-3">
          {!capturedImage ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={switchCamera}
                disabled={!isStreaming}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                onClick={capturePhoto}
                disabled={!isStreaming}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={retakePhoto}
                disabled={isUploading}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={uploadPhoto}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Save Photo
              </Button>
            </div>
          )}

          {/* Fallback button if camera doesn't work */}
          {!capturedImage && !isStreaming && (
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-sm"
            >
              Select from gallery instead
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
