import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Camera, Upload, Keyboard, X, Loader2, AlertCircle } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  refrigerant_type: string;
  refrigerant_charge_kg: number;
  co2_equivalent_tonnes: number | null;
  next_inspection_due: string | null;
  asset_tag: string | null;
  serial_number: string | null;
  sites: {
    name: string;
  };
}

interface EquipmentQRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEquipmentFound: (equipment: Equipment) => void;
}

export function EquipmentQRScanner({
  open,
  onOpenChange,
  onEquipmentFound,
}: EquipmentQRScannerProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("camera");
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-scanner-container";

  // Parse QR code content to extract equipment ID
  const parseQRContent = (content: string): string | null => {
    // Try URL format: https://domain.com/equipment/uuid or /equipment/uuid
    const urlMatch = content.match(/\/equipment\/([a-f0-9-]{36})/i);
    if (urlMatch) return urlMatch[1];

    // Try direct UUID format
    const uuidMatch = content.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
    if (uuidMatch) return content;

    // Not a recognized format - might be asset tag or serial number
    return null;
  };

  // Look up equipment by ID, asset tag, or serial number
  const lookupEquipment = async (input: string): Promise<Equipment | null> => {
    if (!profile?.company_id) return null;

    const trimmedInput = input.trim();
    
    // First try to parse as QR content (URL or UUID)
    const equipmentId = parseQRContent(trimmedInput);
    
    let query = supabase
      .from("equipment")
      .select(`
        id, name, manufacturer, model, refrigerant_type,
        refrigerant_charge_kg, co2_equivalent_tonnes, next_inspection_due,
        asset_tag, serial_number,
        sites!inner(name)
      `)
      .eq("company_id", profile.company_id);

    if (equipmentId) {
      // Look up by ID
      query = query.eq("id", equipmentId);
    } else {
      // Look up by asset tag or serial number
      query = query.or(`asset_tag.ilike.${trimmedInput},serial_number.ilike.${trimmedInput}`);
    }

    const { data, error } = await query.limit(1).single();

    if (error || !data) return null;
    return data as Equipment;
  };

  // Handle successful QR scan or manual input
  const handleScanResult = useCallback(async (content: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const equipment = await lookupEquipment(content);
      
      if (equipment) {
        // Stop scanner before closing
        if (scannerRef.current) {
          try {
            const state = scannerRef.current.getState();
            if (state === Html5QrcodeScannerState.SCANNING) {
              await scannerRef.current.stop();
            }
          } catch (e) {
            // Ignore stop errors
          }
        }
        
        onEquipmentFound(equipment);
        onOpenChange(false);
        toast.success(`Found: ${equipment.name}`);
      } else {
        setError("Equipment not found. Please ensure it belongs to your company.");
      }
    } catch (err) {
      setError("Failed to look up equipment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, profile?.company_id, onEquipmentFound, onOpenChange]);

  // Initialize camera scanner
  const startScanner = useCallback(async () => {
    if (!open || activeTab !== "camera" || isScanning) return;

    setError(null);
    setCameraPermissionDenied(false);

    try {
      // Create scanner instance if not exists
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      const scanner = scannerRef.current;
      
      // Check if already scanning
      const state = scanner.getState();
      if (state === Html5QrcodeScannerState.SCANNING) {
        return;
      }

      setIsScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        () => {
          // Ignore scan failures (no QR found in frame)
        }
      );
    } catch (err: any) {
      console.error("Scanner error:", err);
      setIsScanning(false);
      
      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        setCameraPermissionDenied(true);
        setError("Camera access denied. Please grant permission or use manual entry.");
      } else {
        setError("Could not start camera. Try the file upload or manual entry.");
      }
    }
  }, [open, activeTab, isScanning, handleScanResult]);

  // Stop scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        // Ignore errors during stop
      }
    }
    setIsScanning(false);
  }, []);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      const result = await scannerRef.current.scanFile(file, true);
      await handleScanResult(result);
    } catch (err) {
      setError("No QR code found in the image. Please try another image.");
    } finally {
      setIsLoading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  // Handle manual submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await handleScanResult(manualInput);
  };

  // Start/stop scanner based on dialog state and active tab
  useEffect(() => {
    if (open && activeTab === "camera") {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, activeTab, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING) {
            scannerRef.current.stop();
          }
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setManualInput("");
      setCameraPermissionDenied(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <Camera className="h-5 w-5 text-primary" />
             Scan System QR Code
           </DialogTitle>
           <DialogDescription>
             Scan a system label QR code to view or update its information.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="camera" className="flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Camera</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1.5">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1.5">
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="mt-4">
            <div className="relative">
              {/* Scanner container */}
              <div
                id={scannerContainerId}
                className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
              />
              
              {/* Loading overlay */}
              {!isScanning && !cameraPermissionDenied && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Starting camera...</p>
                  </div>
                </div>
              )}

              {/* Scanning indicator */}
              {isScanning && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-3 py-1.5 rounded-full">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    Scanning...
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload an image containing a QR code
                </p>
                <Label htmlFor="qr-file-upload" className="cursor-pointer">
                  <Button asChild variant="outline" disabled={isLoading}>
                    <span>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Choose File"
                      )}
                    </span>
                  </Button>
                </Label>
                <Input
                  id="qr-file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-input">Equipment ID or Asset Tag</Label>
                <Input
                  id="manual-input"
                  placeholder="Enter ID, asset tag, or serial number"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  You can enter the equipment UUID, asset tag, or serial number
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !manualInput.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  "Look Up Equipment"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading indicator during lookup */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Looking up equipment...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
