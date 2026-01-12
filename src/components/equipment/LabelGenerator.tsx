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
import { Printer } from "lucide-react";
import { escapeHtml } from "@/lib/html-escape";

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

// FTrack logo as base64 for reliable print rendering
const FTRACK_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEoElEQVR4nO2ZW4hVVRjHf+M4jjqOl/EyXmZUM7XMSxlZD0EPRUQQFBHRQxBBD0FERD0EEUREUARBRBA9BBFBRPQQRBQRQRFBRFFEFFEUURRRFEUURRRFFMXv8K3D2XvOPmeffc6ZOdP8YbFh77W+9X2X/1prLZhhhhmmoHpIK2EL0AfsA04DV4GRMVq3gb+BvcB24CZwK9Xn78AFYNvfwHngHHCmjHYJeAi4Apxx2oGa2yNVxgVgEDgGHE20i8AJYA9wuIR2EDgC7E+0Q8AR4BhwEjhVkZnJhobPAR2ZRg+0FDUaeQToBfoLAn+4qM+9wHRgOfAosDHR1gFLgRXA8kRbCawGbqnITK8ChMXDwFJgAbACWNNQnwT2JJ3sB9YC84ElwLqG+nZgD7AD2AusTLStwCKgH9gMLG+o7wX2ADuBvYm2E9gKLAYGG+qTafsS+4vIYAkD0+fGfJN8rqD9NaAPeBV4I+w/AVwH3gPeBK4Bp2LdKeA0cDJ2Py/RRq9cAM4CT4/Ru4BrgZ+Ae4CvkvZ94DXgXuB7YE6wPAI8AuwGhqJ9FBhKtIvhcyGwC5gTLKtjfxfwLHA3cDBo5/cDc4HtscYQ8FysPYiN3UbgEDAn2FcBQ4l2GRgEhoGdsf6S2OMScBGYHYwXAEuBg8F4GJgP7IhtQ8AS4Fisr4+1J4FDibYBGARmB/t8YBDYHywvAEeCZT5wItYvJf0u2IeAJcAhYAewHDgZLHOBA7FmKNHWA0PB+AKwN1imAMeBybH/OOFzOfZfBA4H+wJgL7AjWCYHy7xgOQacCMYLg2UnMDPYR4Gbg2U6cCvwLXAncCNwNvbPoYzFBLBdAP4M9uWx/5lYfw1wNVhmJ39HgKmx/zagG/gW+BhYBpyP+K0CZsXau4ALwJjrQ6JdAkZHs5eA64CZsX4w0S4Ag7F+IFiGYs0g8HOsWwj8ESwzAMvM1Fh7PtbPBX4DhkZG+5+NdR8l7bnA+UQbAP4GTgL7gCuJdj9wINgng2VK/J8I/B0sA8BIkE0BLiXaAPBzrBuKPQ4DQ9eAq4m2NzEJIgOJdjFY/kzsu4L9MLAbGIvZ+0+sfwm4DIy+TYxE24VEmxQxGQl9NDAa63YHqyVjTPWxaH84sV8q7P8b+BNYFyw7g/3fpP/OMnkP8Hfyfq+JdftK9OEyqYmUxWJPol0tW9bLMlCkjAZIscPw0MiI1TrKxDhRJibpRGYSmSyjLwsqE/2FNTLSYLf3Y2W/nwKWJv97jO5fCKYONbLQbdKKYmIXMD9JI2XKhD8l/U8Ee0Nxsj4yEmH3d59Y/0CirQxtrpFaWbBMK+pT0a4bfRE5m9h/aY2MyMH8S2CfAZwOlimBuwZ4EFiTqA8S8vU78HXS/+C/0nMySY19W2b4HE60f4KF2PcE8GJir/2bwL7E5N5Y+yqwEfgbWAV8C/wT7P+GS4EeYG+wdAEHY91dwL1B+yXhPziwv+IjEfPLNbLwMvBX4O7Rdlv0bQIeCNrbgTth3G3GQKzb1NDvb+Da0O/e0PYlxd+KNjvJsj/o/4BYK7Gv+vq/C1mDtT4AAAAASUVORK5CYII=";

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
  logo_url?: string | null;
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
  large: { width: "150mm", height: "100mm", name: "Large (150×100mm)" },
};

const FTRACK_URL = "https://ftrack.uk";

export function LabelGenerator({
  open,
  onOpenChange,
  equipment,
  company,
  siteName,
}: LabelGeneratorProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState<LabelSize>("large");

  const gwp = GWP_VALUES[equipment.refrigerant_type] || 0;
  const equipmentUrl = `${window.location.origin}/equipment/${equipment.id}`;
  const size = LABEL_SIZES[labelSize];
  const co2e = equipment.co2_equivalent_tonnes?.toFixed(2) || "N/A";

  // Generate company initials for placeholder
  const companyInitials = company.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handlePrint = () => {
    const printContent = labelRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const safeEquipmentName = escapeHtml(equipment.name);
    const safeCompanyName = escapeHtml(company.name);
    const safeAssetTag = equipment.asset_tag ? escapeHtml(equipment.asset_tag) : "";

    const isLarge = labelSize === "large";
    const isSmall = labelSize === "small";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>F-Gas Label - ${safeEquipmentName}</title>
          <style>
            @page {
              size: ${size.width} ${size.height};
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            .label {
              width: ${size.width};
              height: ${size.height};
              padding: ${isSmall ? "2mm" : "4mm"};
              border: 1.5px solid #000;
              position: relative;
              overflow: hidden;
            }
            ${isLarge ? `
            .label-content {
              display: flex;
              height: calc(100% - 16mm);
              gap: 5mm;
            }
            .left-column {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              width: 45mm;
              flex-shrink: 0;
            }
            .company-logo {
              width: 40mm;
              height: 25mm;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1px solid #ddd;
              background: #f9f9f9;
              border-radius: 4px;
              overflow: hidden;
            }
            .company-logo img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .company-initials {
              font-size: 20pt;
              font-weight: bold;
              color: #1e3a5f;
            }
            .equipment-qr {
              padding: 2mm;
              background: white;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .right-column {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 3mm;
            }
            .company-equipment {
              flex: 1;
            }
            .company-name {
              font-weight: bold;
              font-size: 12pt;
              color: #1e3a5f;
              margin-bottom: 1mm;
            }
            .equipment-name {
              font-weight: bold;
              font-size: 14pt;
              color: #000;
            }
            .asset-tag-badge {
              background: #1e3a5f;
              color: white;
              padding: 2mm 4mm;
              border-radius: 3px;
              font-weight: bold;
              font-size: 10pt;
              font-family: monospace;
              white-space: nowrap;
            }
            .warning-box {
              background-color: #fef3c7;
              border: 1.5px solid #f59e0b;
              padding: 2mm 3mm;
              margin: 3mm 0;
              text-align: center;
              font-weight: bold;
              font-size: 7pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .refrigerant-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 3mm;
              margin-top: 3mm;
            }
            .ref-item {
              text-align: center;
              padding: 2mm;
              background: #e0f2fe;
              border-radius: 3px;
            }
            .ref-label {
              font-size: 6pt;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 1mm;
            }
            .ref-value {
              font-weight: bold;
              font-size: 12pt;
            }
            .ref-value.type {
              font-size: 16pt;
              color: #1e3a5f;
            }
            .gwp-row {
              margin-top: 2mm;
              font-size: 8pt;
              color: #666;
            }
            .gwp-row strong {
              color: #000;
            }
            .footer {
              position: absolute;
              bottom: 3mm;
              left: 4mm;
              right: 4mm;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-top: 2mm;
              border-top: 0.5px solid #ccc;
            }
            .footer-left {
              display: flex;
              align-items: center;
              gap: 2mm;
            }
            .ftrack-logo {
              width: 6mm;
              height: 6mm;
            }
            .ftrack-text {
              font-size: 6pt;
              color: #666;
            }
            .footer-right {
              display: flex;
              align-items: center;
              gap: 3mm;
            }
            .ftrack-qr {
              padding: 1mm;
              background: white;
              border: 0.5px solid #ddd;
              border-radius: 2px;
            }
            .generated-date {
              font-size: 5pt;
              color: #999;
            }
            ` : `
            /* Medium and Small styles */
            .label-content {
              position: relative;
              height: 100%;
            }
            .company-name {
              font-weight: bold;
              font-size: ${isSmall ? "7pt" : "10pt"};
            }
            .equipment-name {
              font-weight: bold;
              font-size: ${isSmall ? "8pt" : "11pt"};
              margin-bottom: ${isSmall ? "1mm" : "2mm"};
            }
            .warning-box {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              padding: ${isSmall ? "1mm" : "2mm"};
              margin-bottom: ${isSmall ? "1mm" : "2mm"};
              text-align: center;
              font-weight: bold;
              font-size: ${isSmall ? "5pt" : "7pt"};
              margin-right: ${isSmall ? "42mm" : "65mm"};
            }
            .refrigerant-section {
              background-color: #e0f2fe;
              padding: ${isSmall ? "1mm" : "2mm"};
              margin-bottom: ${isSmall ? "1mm" : "2mm"};
              display: flex;
              gap: ${isSmall ? "4mm" : "8mm"};
              margin-right: ${isSmall ? "42mm" : "65mm"};
            }
            .ref-type {
              font-size: ${isSmall ? "10pt" : "14pt"};
              font-weight: bold;
            }
            .ref-detail {
              font-weight: bold;
              font-size: ${isSmall ? "8pt" : "10pt"};
            }
            .ref-label {
              color: #666;
              font-size: ${isSmall ? "5pt" : "6pt"};
            }
            .co2e-row {
              margin-bottom: ${isSmall ? "1mm" : "2mm"};
              margin-right: ${isSmall ? "42mm" : "65mm"};
            }
            .qr-section {
              position: absolute;
              right: ${isSmall ? "2mm" : "4mm"};
              top: 50%;
              transform: translateY(-50%);
            }
            .footer {
              font-size: ${isSmall ? "4pt" : "5pt"};
              color: #666;
              text-align: center;
              position: absolute;
              bottom: ${isSmall ? "2mm" : "3mm"};
              left: ${isSmall ? "2mm" : "4mm"};
              right: ${isSmall ? "2mm" : "4mm"};
              border-top: 0.5px solid #ccc;
              padding-top: 1mm;
            }
            `}
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

  const isLarge = labelSize === "large";
  const isSmall = labelSize === "small";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
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
              className="label bg-white mx-auto border-2 border-foreground"
              style={{
                width: size.width,
                height: size.height,
                padding: isSmall ? "2mm" : "4mm",
                fontFamily: "Arial, sans-serif",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {isLarge ? (
                /* Large Label - New Design */
                <>
                  <div
                    className="label-content"
                    style={{
                      display: "flex",
                      height: "calc(100% - 16mm)",
                      gap: "5mm",
                    }}
                  >
                    {/* Left Column - Logo and QR */}
                    <div
                      className="left-column"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "45mm",
                        flexShrink: 0,
                      }}
                    >
                      {/* Company Logo */}
                      <div
                        className="company-logo"
                        style={{
                          width: "40mm",
                          height: "25mm",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid #ddd",
                          background: "#f9f9f9",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={company.name}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <span
                            className="company-initials"
                            style={{
                              fontSize: "20pt",
                              fontWeight: "bold",
                              color: "#1e3a5f",
                            }}
                          >
                            {companyInitials}
                          </span>
                        )}
                      </div>

                      {/* Large Equipment QR Code */}
                      <div
                        className="equipment-qr"
                        style={{
                          padding: "2mm",
                          background: "white",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                        }}
                      >
                        <QRCodeSVG value={equipmentUrl} size={140} level="M" />
                      </div>
                    </div>

                    {/* Right Column - Info */}
                    <div
                      className="right-column"
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* Header Row */}
                      <div
                        className="header-row"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "3mm",
                        }}
                      >
                        <div className="company-equipment" style={{ flex: 1 }}>
                          <div
                            className="company-name"
                            style={{
                              fontWeight: "bold",
                              fontSize: "12pt",
                              color: "#1e3a5f",
                              marginBottom: "1mm",
                            }}
                          >
                            {company.name}
                          </div>
                          <div
                            className="equipment-name"
                            style={{
                              fontWeight: "bold",
                              fontSize: "14pt",
                              color: "#000",
                            }}
                          >
                            {equipment.name}
                          </div>
                        </div>

                        {/* Asset Tag Badge */}
                        {equipment.asset_tag && (
                          <div
                            className="asset-tag-badge"
                            style={{
                              background: "#1e3a5f",
                              color: "white",
                              padding: "2mm 4mm",
                              borderRadius: "3px",
                              fontWeight: "bold",
                              fontSize: "10pt",
                              fontFamily: "monospace",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {equipment.asset_tag}
                          </div>
                        )}
                      </div>

                      {/* F-Gas Warning */}
                      <div
                        className="warning-box"
                        style={{
                          backgroundColor: "#fef3c7",
                          border: "1.5px solid #f59e0b",
                          padding: "2mm 3mm",
                          margin: "2mm 0",
                          textAlign: "center",
                          fontWeight: "bold",
                          fontSize: "7pt",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        CONTAINS FLUORINATED GREENHOUSE GASES
                      </div>

                      {/* Refrigerant Grid */}
                      <div
                        className="refrigerant-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "3mm",
                          marginTop: "3mm",
                        }}
                      >
                        <div
                          className="ref-item"
                          style={{
                            textAlign: "center",
                            padding: "2mm",
                            background: "#e0f2fe",
                            borderRadius: "3px",
                          }}
                        >
                          <div
                            className="ref-label"
                            style={{
                              fontSize: "6pt",
                              color: "#666",
                              textTransform: "uppercase",
                              marginBottom: "1mm",
                            }}
                          >
                            Refrigerant
                          </div>
                          <div
                            className="ref-value type"
                            style={{
                              fontWeight: "bold",
                              fontSize: "16pt",
                              color: "#1e3a5f",
                            }}
                          >
                            {equipment.refrigerant_type}
                          </div>
                        </div>

                        <div
                          className="ref-item"
                          style={{
                            textAlign: "center",
                            padding: "2mm",
                            background: "#e0f2fe",
                            borderRadius: "3px",
                          }}
                        >
                          <div
                            className="ref-label"
                            style={{
                              fontSize: "6pt",
                              color: "#666",
                              textTransform: "uppercase",
                              marginBottom: "1mm",
                            }}
                          >
                            Charge
                          </div>
                          <div
                            className="ref-value"
                            style={{
                              fontWeight: "bold",
                              fontSize: "12pt",
                            }}
                          >
                            {equipment.refrigerant_charge_kg.toFixed(2)} kg
                          </div>
                        </div>

                        <div
                          className="ref-item"
                          style={{
                            textAlign: "center",
                            padding: "2mm",
                            background: "#e0f2fe",
                            borderRadius: "3px",
                          }}
                        >
                          <div
                            className="ref-label"
                            style={{
                              fontSize: "6pt",
                              color: "#666",
                              textTransform: "uppercase",
                              marginBottom: "1mm",
                            }}
                          >
                            CO₂e
                          </div>
                          <div
                            className="ref-value"
                            style={{
                              fontWeight: "bold",
                              fontSize: "12pt",
                            }}
                          >
                            {co2e} t
                          </div>
                        </div>
                      </div>

                      {/* GWP Row */}
                      <div
                        className="gwp-row"
                        style={{
                          marginTop: "2mm",
                          fontSize: "8pt",
                          color: "#666",
                        }}
                      >
                        GWP: <strong style={{ color: "#000" }}>{gwp.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    className="footer"
                    style={{
                      position: "absolute",
                      bottom: "3mm",
                      left: "4mm",
                      right: "4mm",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "2mm",
                      borderTop: "0.5px solid #ccc",
                    }}
                  >
                    <div
                      className="footer-left"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2mm",
                      }}
                    >
                      <img
                        src={FTRACK_LOGO_BASE64}
                        alt="FTrack"
                        className="ftrack-logo"
                        style={{ width: "6mm", height: "6mm" }}
                      />
                      <span
                        className="ftrack-text"
                        style={{ fontSize: "6pt", color: "#666" }}
                      >
                        FTrack F-Gas Compliance
                      </span>
                    </div>

                    <div
                      className="footer-right"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3mm",
                      }}
                    >
                      <span
                        className="generated-date"
                        style={{ fontSize: "5pt", color: "#999" }}
                      >
                        Generated {format(new Date(), "dd/MM/yyyy")}
                      </span>
                      <div
                        className="ftrack-qr"
                        style={{
                          padding: "1mm",
                          background: "white",
                          border: "0.5px solid #ddd",
                          borderRadius: "2px",
                        }}
                      >
                        <QRCodeSVG value={FTRACK_URL} size={40} level="L" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Medium and Small Labels - Original Design */
                <div className="label-content" style={{ position: "relative", height: "100%" }}>
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
                      size={isSmall ? 40 : 60}
                      level="M"
                    />
                  </div>

                  {/* Header */}
                  <div style={{ marginBottom: isSmall ? "1mm" : "2mm" }}>
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: isSmall ? "7pt" : "10pt",
                      }}
                    >
                      {company.name}
                    </div>
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: isSmall ? "8pt" : "11pt",
                      }}
                    >
                      {equipment.name}
                    </div>
                  </div>

                  {/* F-Gas Warning Box */}
                  <div
                    className="warning-box"
                    style={{
                      backgroundColor: "#fef3c7",
                      border: "1px solid #f59e0b",
                      padding: isSmall ? "1mm" : "2mm",
                      marginBottom: isSmall ? "1mm" : "2mm",
                      textAlign: "center",
                      fontWeight: "bold",
                      fontSize: isSmall ? "5pt" : "7pt",
                      marginRight: isSmall ? "42mm" : "65mm",
                    }}
                  >
                    CONTAINS FLUORINATED GREENHOUSE GASES
                  </div>

                  {/* Refrigerant Section */}
                  <div
                    className="refrigerant-section"
                    style={{
                      backgroundColor: "#e0f2fe",
                      padding: isSmall ? "1mm" : "2mm",
                      marginBottom: isSmall ? "1mm" : "2mm",
                      display: "flex",
                      gap: isSmall ? "4mm" : "8mm",
                      marginRight: isSmall ? "42mm" : "65mm",
                    }}
                  >
                    <div>
                      <span className="ref-label" style={{ color: "#666", fontSize: isSmall ? "5pt" : "6pt" }}>
                        Type
                      </span>
                      <div
                        className="ref-type"
                        style={{
                          fontWeight: "bold",
                          fontSize: isSmall ? "10pt" : "14pt",
                        }}
                      >
                        {equipment.refrigerant_type}
                      </div>
                    </div>
                    <div>
                      <span className="ref-label" style={{ color: "#666", fontSize: isSmall ? "5pt" : "6pt" }}>
                        Charge
                      </span>
                      <div className="ref-detail" style={{ fontWeight: "bold", fontSize: isSmall ? "8pt" : "10pt" }}>
                        {equipment.refrigerant_charge_kg.toFixed(2)} kg
                      </div>
                    </div>
                    <div>
                      <span className="ref-label" style={{ color: "#666", fontSize: isSmall ? "5pt" : "6pt" }}>
                        GWP
                      </span>
                      <div className="ref-detail" style={{ fontWeight: "bold", fontSize: isSmall ? "8pt" : "10pt" }}>
                        {gwp.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* CO2e Value */}
                  <div
                    className="co2e-row"
                    style={{
                      marginBottom: isSmall ? "1mm" : "2mm",
                      marginRight: isSmall ? "42mm" : "65mm",
                    }}
                  >
                    <span style={{ color: "#666" }}>CO₂ Equivalent: </span>
                    <strong>{co2e} tonnes</strong>
                  </div>

                  {/* Footer */}
                  <div
                    className="footer"
                    style={{
                      fontSize: isSmall ? "4pt" : "5pt",
                      color: "#666",
                      textAlign: "center",
                      position: "absolute",
                      bottom: isSmall ? "2mm" : "3mm",
                      left: isSmall ? "2mm" : "4mm",
                      right: isSmall ? "2mm" : "4mm",
                      borderTop: "0.5px solid #ccc",
                      paddingTop: "1mm",
                    }}
                  >
                    Scan QR for records | Generated {format(new Date(), "dd/MM/yyyy")}
                  </div>
                </div>
              )}
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
