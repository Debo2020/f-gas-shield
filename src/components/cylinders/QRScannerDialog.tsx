import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Keyboard, Search, Loader2, AlertCircle, Radio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CylinderIdentifierType =
  | "any"
  | "cylinder_code"
  | "supplier_barcode"
  | "manufacturer_serial"
  | "rfid_tag";

export interface ScanContext {
  value: string;
  type: Exclude<CylinderIdentifierType, "any">;
}

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCylinderFound: (cylinder: any, context?: ScanContext) => void;
}

const IDENTIFIER_OPTIONS: { value: CylinderIdentifierType; label: string }[] = [
  { value: "any", label: "Any identifier" },
  { value: "cylinder_code", label: "Internal code" },
  { value: "supplier_barcode", label: "Supplier barcode/QR" },
  { value: "manufacturer_serial", label: "Manufacturer serial" },
  { value: "rfid_tag", label: "RFID tag" },
];

const SCANNER_ID = "cylinder-qr-scanner-container";

export function QRScannerDialog({
  open,
  onOpenChange,
  onCylinderFound,
}: QRScannerDialogProps) {
  const { profile } = useAuth();
  const [manualCode, setManualCode] = useState("");
  const [identifierType, setIdentifierType] = useState<CylinderIdentifierType>("any");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "camera" | "rfid">("manual");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rfidStatus, setRfidStatus] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);

  const nfcSupported = typeof window !== "undefined" && "NDEFReader" in window;

  const searchCylinder = useCallback(
    async (raw: string, forcedType?: CylinderIdentifierType): Promise<void> => {
      if (!profile?.company_id || !raw.trim()) return;
      const type = forcedType ?? identifierType;

      setIsSearching(true);
      try {
        // Try to parse JSON QR payload (legacy format: { type:"cylinder", id, code })
        let value = raw.trim();
        let resolvedType: CylinderIdentifierType = type;
        try {
          const parsed = JSON.parse(value);
          if (parsed?.code) {
            value = String(parsed.code);
            resolvedType = "cylinder_code";
          }
        } catch {
          // not JSON
        }

        let query = supabase
          .from("refrigerant_cylinders")
          .select("*")
          .eq("company_id", profile.company_id);

        if (resolvedType === "any") {
          // Match across all identifier columns
          query = query.or(
            `cylinder_code.eq.${value},supplier_barcode.eq.${value},manufacturer_serial.eq.${value},rfid_tag.eq.${value}`,
          );
        } else {
          query = query.eq(resolvedType, value);
        }

        const { data, error } = await query.limit(1).maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error("Cylinder not found", {
            description: `No cylinder matched ${value}`,
          });
          return;
        }

        // Determine which column actually matched, for the audit context
        const matchedType: ScanContext["type"] =
          resolvedType !== "any"
            ? (resolvedType as ScanContext["type"])
            : data.cylinder_code === value
              ? "cylinder_code"
              : data.supplier_barcode === value
                ? "supplier_barcode"
                : data.manufacturer_serial === value
                  ? "manufacturer_serial"
                  : "rfid_tag";

        await stopCamera();
        await stopNfc();
        onOpenChange(false);
        onCylinderFound(data, { value, type: matchedType });
      } catch (err: any) {
        console.error("Cylinder lookup error:", err);
        toast.error(err.message || "Failed to look up cylinder");
      } finally {
        setIsSearching(false);
      }
    },
    [profile?.company_id, identifierType, onCylinderFound, onOpenChange],
  );

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });
      }
      const scanner = scannerRef.current;
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) return;
      setIsScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decoded) => {
          searchCylinder(decoded);
        },
        () => {},
      );
    } catch (err: any) {
      console.error("Camera error:", err);
      setIsScanning(false);
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera access denied. Use manual entry instead."
          : "Unable to start camera. Use manual entry instead.",
      );
    }
  }, [searchCylinder]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
    }
    setIsScanning(false);
  }, []);

  const startNfc = useCallback(async () => {
    if (!nfcSupported) return;
    setRfidStatus("Hold an RFID tag near your device…");
    try {
      // @ts-expect-error NDEFReader is not in TS lib
      const reader = new window.NDEFReader();
      nfcAbortRef.current = new AbortController();
      await reader.scan({ signal: nfcAbortRef.current.signal });
      reader.onreading = (event: any) => {
        const serial = event.serialNumber || "";
        if (serial) {
          setRfidStatus(`Detected tag ${serial}`);
          searchCylinder(serial, "rfid_tag");
        }
      };
    } catch (err: any) {
      console.error("NFC error:", err);
      setRfidStatus(err?.message || "RFID scan failed");
    }
  }, [nfcSupported, searchCylinder]);

  const stopNfc = useCallback(async () => {
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setRfidStatus(null);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      stopNfc();
      return;
    }
    if (activeTab === "camera") {
      const t = setTimeout(() => startCamera(), 250);
      return () => clearTimeout(t);
    }
    if (activeTab === "rfid" && nfcSupported) {
      startNfc();
    }
    stopCamera();
    if (activeTab !== "rfid") stopNfc();
  }, [open, activeTab, startCamera, stopCamera, startNfc, stopNfc, nfcSupported]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopNfc();
    };
  }, [stopCamera, stopNfc]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          stopCamera();
          stopNfc();
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Cylinder
          </DialogTitle>
          <DialogDescription>
            Look up a cylinder by internal code, supplier barcode/QR, manufacturer serial, or RFID tag.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2">
              <Keyboard className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="camera" className="gap-2">
              <Camera className="h-4 w-4" />
              Scan
            </TabsTrigger>
            <TabsTrigger value="rfid" className="gap-2">
              <Radio className="h-4 w-4" />
              RFID
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search by</Label>
              <Select
                value={identifierType}
                onValueChange={(v) => setIdentifierType(v as CylinderIdentifierType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IDENTIFIER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cylinder-code">Value</Label>
              <Input
                id="cylinder-code"
                placeholder="Enter code, barcode, serial, or RFID UID"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchCylinder(manualCode);
                }}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => searchCylinder(manualCode)}
              disabled={isSearching || !manualCode.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching…
                </>
              ) : (
                "Find Cylinder"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="camera" className="space-y-3 py-4">
            <div
              id={SCANNER_ID}
              className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
            />
            {cameraError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-xs text-center text-muted-foreground">
                Supports QR codes plus 1D barcodes (Code128 / EAN) printed by BOC, Linde, A-Gas etc.
                {isScanning && " Scanning…"}
              </p>
            )}
          </TabsContent>

          <TabsContent value="rfid" className="space-y-3 py-4">
            {nfcSupported ? (
              <>
                <div className="rounded-lg border bg-muted/50 p-6 text-center">
                  <Radio className="h-10 w-10 mx-auto mb-3 text-primary animate-pulse" />
                  <p className="text-sm font-medium">
                    {rfidStatus || "Tap the cylinder's RFID tag to your device"}
                  </p>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Web NFC only works on Android Chrome. Use manual entry on other devices.
                </p>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This device doesn't support direct RFID scanning in the browser. Use the manual tab
                  and paste the RFID UID, or connect a USB/Bluetooth RFID reader that emulates a keyboard.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
