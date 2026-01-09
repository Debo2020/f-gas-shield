import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Printer, Download } from "lucide-react";

// GWP values for display
const GWP_VALUES: Record<string, number> = {
  "R-32": 675,
  "R-134a": 1430,
  "R-404A": 3922,
  "R-407C": 1774,
  "R-410A": 2088,
  "R-422D": 2729,
  "R-448A": 1387,
  "R-449A": 1397,
  "R-452A": 2140,
  "R-454B": 466,
  "R-507A": 3985,
  "R-744": 1,
  "Other": 0,
};

interface Equipment {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  refrigerant_type: string;
  refrigerant_charge_kg: number;
  co2_equivalent_tonnes: number | null;
  installation_date: string | null;
  location_description: string | null;
}

interface Company {
  name: string;
  phone: string | null;
  email: string | null;
}

interface LabelGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
  company: Company;
  siteName: string;
}

type LabelSize = "small" | "medium" | "large";

const LABEL_SIZES: Record<LabelSize, { width: string; height: string; name: string }> = {
  small: { width: "62mm", height: "29mm", name: "Small (62×29mm)" },
  medium: { width: "100mm", height: "50mm", name: "Medium (100×50mm)" },
  large: { width: "100mm", height: "70mm", name: "Large (100×70mm)" },
};

export function LabelGenerator({
  open,
  onOpenChange,
  equipment,
  company,
  siteName,
}: LabelGeneratorProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [isGenerating, setIsGenerating] = useState(false);

  const gwp = GWP_VALUES[equipment.refrigerant_type] || 0;
  const equipmentUrl = `${window.location.origin}/equipment/${equipment.id}`;
  const size = LABEL_SIZES[labelSize];

  const handlePrint = () => {
    const printContent = labelRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>F-Gas Label - ${equipment.name}</title>
          <style>
            @page {
              size: ${size.width} ${size.height};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            .label {
              width: ${size.width};
              height: ${size.height};
              padding: ${labelSize === "small" ? "2mm" : "4mm"};
              box-sizing: border-box;
              border: 1px solid #000;
              display: flex;
              flex-direction: column;
              font-size: ${labelSize === "small" ? "6pt" : labelSize === "medium" ? "8pt" : "9pt"};
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: ${labelSize === "small" ? "1mm" : "2mm"};
            }
            .company-name {
              font-weight: bold;
              font-size: ${labelSize === "small" ? "7pt" : labelSize === "medium" ? "10pt" : "11pt"};
            }
            .equipment-name {
              font-weight: bold;
              font-size: ${labelSize === "small" ? "8pt" : labelSize === "medium" ? "11pt" : "12pt"};
              margin-bottom: ${labelSize === "small" ? "1mm" : "2mm"};
            }
            .warning-box {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              padding: ${labelSize === "small" ? "1mm" : "2mm"};
              margin-bottom: ${labelSize === "small" ? "1mm" : "2mm"};
              text-align: center;
              font-weight: bold;
              font-size: ${labelSize === "small" ? "5pt" : "7pt"};
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: ${labelSize === "small" ? "0.5mm" : "1mm"};
              flex: 1;
            }
            .detail-row {
              display: flex;
              gap: 2mm;
            }
            .detail-label {
              color: #666;
              min-width: ${labelSize === "small" ? "12mm" : "18mm"};
            }
            .detail-value {
              font-weight: 600;
            }
            .refrigerant-section {
              background-color: #e0f2fe;
              padding: ${labelSize === "small" ? "1mm" : "2mm"};
              margin: ${labelSize === "small" ? "1mm" : "2mm"} 0;
              display: flex;
              justify-content: space-between;
            }
            .refrigerant-type {
              font-size: ${labelSize === "small" ? "10pt" : labelSize === "medium" ? "14pt" : "16pt"};
              font-weight: bold;
            }
            .qr-section {
              position: absolute;
              right: ${labelSize === "small" ? "2mm" : "4mm"};
              top: 50%;
              transform: translateY(-50%);
            }
            .footer {
              font-size: ${labelSize === "small" ? "5pt" : "6pt"};
              color: #666;
              text-align: center;
              margin-top: auto;
              border-top: 0.5px solid #ccc;
              padding-top: 1mm;
            }
            .label-container {
              position: relative;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const isSmall = labelSize === "small";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate F-Gas Equipment Label</DialogTitle>
          <DialogDescription>
            Create a compliant equipment label with QR code for quick access to records
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Label Size Selector */}
          <div className="flex items-center gap-4">
            <Label>Label Size:</Label>
            <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LABEL_SIZES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label Preview */}
          <div className="bg-muted p-6 rounded-lg overflow-auto">
            <div
              ref={labelRef}
              className="label-container bg-white mx-auto border-2 border-foreground relative"
              style={{
                width: size.width,
                minHeight: size.height,
                padding: isSmall ? "2mm" : "4mm",
                fontFamily: "Arial, sans-serif",
                fontSize: isSmall ? "6pt" : labelSize === "medium" ? "8pt" : "9pt",
              }}
            >
              {/* QR Code - Positioned Right */}
              <div
                className="qr-section"
                style={{
                  position: "absolute",
                  right: isSmall ? "2mm" : "4mm",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <QRCodeSVG
                  value={equipmentUrl}
                  size={isSmall ? 40 : labelSize === "medium" ? 60 : 80}
                  level="M"
                />
              </div>

              {/* Header */}
              <div style={{ marginBottom: isSmall ? "1mm" : "2mm" }}>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: isSmall ? "7pt" : labelSize === "medium" ? "10pt" : "11pt",
                  }}
                >
                  {company.name}
                </div>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: isSmall ? "8pt" : labelSize === "medium" ? "11pt" : "12pt",
                  }}
                >
                  {equipment.name}
                </div>
              </div>

              {/* F-Gas Warning Box */}
              <div
                style={{
                  backgroundColor: "#fef3c7",
                  border: "1px solid #f59e0b",
                  padding: isSmall ? "1mm" : "2mm",
                  marginBottom: isSmall ? "1mm" : "2mm",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: isSmall ? "5pt" : "7pt",
                  marginRight: isSmall ? "42mm" : labelSize === "medium" ? "65mm" : "85mm",
                }}
              >
                CONTAINS FLUORINATED GREENHOUSE GASES
              </div>

              {/* Refrigerant Section */}
              <div
                style={{
                  backgroundColor: "#e0f2fe",
                  padding: isSmall ? "1mm" : "2mm",
                  marginBottom: isSmall ? "1mm" : "2mm",
                  display: "flex",
                  gap: isSmall ? "4mm" : "8mm",
                  marginRight: isSmall ? "42mm" : labelSize === "medium" ? "65mm" : "85mm",
                }}
              >
                <div>
                  <span style={{ color: "#666", fontSize: isSmall ? "5pt" : "6pt" }}>Type</span>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: isSmall ? "10pt" : labelSize === "medium" ? "14pt" : "16pt",
                    }}
                  >
                    {equipment.refrigerant_type}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#666", fontSize: isSmall ? "5pt" : "6pt" }}>Charge</span>
                  <div style={{ fontWeight: "bold", fontSize: isSmall ? "8pt" : "10pt" }}>
                    {equipment.refrigerant_charge_kg.toFixed(2)} kg
                  </div>
                </div>
                <div>
                  <span style={{ color: "#666", fontSize: isSmall ? "5pt" : "6pt" }}>GWP</span>
                  <div style={{ fontWeight: "bold", fontSize: isSmall ? "8pt" : "10pt" }}>
                    {gwp.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* CO2e Value */}
              <div
                style={{
                  marginBottom: isSmall ? "1mm" : "2mm",
                  marginRight: isSmall ? "42mm" : labelSize === "medium" ? "65mm" : "85mm",
                }}
              >
                <span style={{ color: "#666" }}>CO₂ Equivalent: </span>
                <strong>{equipment.co2_equivalent_tonnes?.toFixed(2) || "N/A"} tonnes</strong>
              </div>

              {/* Details */}
              {!isSmall && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1mm",
                    fontSize: "7pt",
                    marginRight: labelSize === "medium" ? "65mm" : "85mm",
                  }}
                >
                  {equipment.serial_number && (
                    <div>
                      <span style={{ color: "#666" }}>S/N: </span>
                      <span style={{ fontWeight: 600 }}>{equipment.serial_number}</span>
                    </div>
                  )}
                  {equipment.asset_tag && (
                    <div>
                      <span style={{ color: "#666" }}>Asset: </span>
                      <span style={{ fontWeight: 600 }}>{equipment.asset_tag}</span>
                    </div>
                  )}
                  <div>
                    <span style={{ color: "#666" }}>Site: </span>
                    <span style={{ fontWeight: 600 }}>{siteName}</span>
                  </div>
                  {equipment.installation_date && (
                    <div>
                      <span style={{ color: "#666" }}>Installed: </span>
                      <span style={{ fontWeight: 600 }}>
                        {format(new Date(equipment.installation_date), "MMM yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  fontSize: isSmall ? "4pt" : "5pt",
                  color: "#666",
                  textAlign: "center",
                  marginTop: "auto",
                  borderTop: "0.5px solid #ccc",
                  paddingTop: "1mm",
                  position: "absolute",
                  bottom: isSmall ? "2mm" : "4mm",
                  left: isSmall ? "2mm" : "4mm",
                  right: isSmall ? "2mm" : "4mm",
                }}
              >
                {company.phone && <span>{company.phone} | </span>}
                {company.email && <span>{company.email} | </span>}
                Scan QR for records | Generated {format(new Date(), "dd/MM/yyyy")}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
