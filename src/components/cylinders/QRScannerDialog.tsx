import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Keyboard, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCylinderFound: (cylinder: any) => void;
}

export function QRScannerDialog({
  open,
  onOpenChange,
  onCylinderFound,
}: QRScannerDialogProps) {
  const { profile } = useAuth();
  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Unable to access camera. Please use manual entry.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const searchCylinder = async (code: string) => {
    if (!profile?.company_id || !code.trim()) return;

    setIsSearching(true);
    try {
      // Try to parse as QR JSON first
      let cylinderCode = code;
      try {
        const parsed = JSON.parse(code);
        if (parsed.code) {
          cylinderCode = parsed.code;
        }
      } catch {
        // Not JSON, use as-is
      }

      const { data, error } = await supabase
        .from("refrigerant_cylinders")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("cylinder_code", cylinderCode)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("Cylinder not found");
        } else {
          throw error;
        }
        return;
      }

      stopCamera();
      onOpenChange(false);
      onCylinderFound(data);
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error(error.message || "Failed to find cylinder");
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = () => {
    searchCylinder(manualCode);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) stopCamera();
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Cylinder
          </DialogTitle>
          <DialogDescription>
            Scan QR code or enter cylinder code manually
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" onValueChange={(v) => {
          if (v === "camera") {
            startCamera();
          } else {
            stopCamera();
          }
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <Keyboard className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="camera" className="gap-2">
              <Camera className="h-4 w-4" />
              Camera
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cylinder-code">Cylinder Code</Label>
              <Input
                id="cylinder-code"
                placeholder="Enter cylinder code (e.g., CYL-ABC123)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualSearch();
                }}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleManualSearch}
              disabled={isSearching || !manualCode.trim()}
            >
              {isSearching ? "Searching..." : "Find Cylinder"}
            </Button>
          </TabsContent>

          <TabsContent value="camera" className="space-y-4 py-4">
            {cameraError ? (
              <div className="text-center p-6 border rounded-lg bg-muted">
                <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{cameraError}</p>
              </div>
            ) : (
              <div className="relative aspect-square rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
                </div>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Position the QR code within the frame. For best results, ensure
              good lighting.
            </p>
            <p className="text-xs text-center text-muted-foreground">
              <strong>Note:</strong> Full QR scanning requires additional setup.
              For now, use manual entry.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
