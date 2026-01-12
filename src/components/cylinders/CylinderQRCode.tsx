import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { escapeHtml } from "@/lib/html-escape";

interface CylinderQRCodeProps {
  cylinderCode: string;
  cylinderId: string;
  refrigerantType: string;
  size?: number;
}

export function CylinderQRCode({
  cylinderCode,
  cylinderId,
  refrigerantType,
  size = 128,
}: CylinderQRCodeProps) {
  const qrValue = JSON.stringify({
    type: "cylinder",
    id: cylinderId,
    code: cylinderCode,
  });

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${cylinderId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = size * 2;
      canvas.height = size * 2 + 60;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, size / 2, 10, size, size);
        ctx.fillStyle = "black";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cylinderCode, size, size + 40);
        ctx.font = "12px sans-serif";
        ctx.fillText(refrigerantType, size, size + 56);
      }

      const link = document.createElement("a");
      link.download = `cylinder-${cylinderCode}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Escape user-controlled data to prevent XSS
    const safeCylinderCode = escapeHtml(cylinderCode);
    const safeRefrigerantType = escapeHtml(refrigerantType);
    
    // Get QR SVG content safely
    const qrElement = document.getElementById(`qr-${cylinderId}`);
    const qrContent = qrElement ? qrElement.innerHTML : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Cylinder Label - ${safeCylinderCode}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: sans-serif;
            }
            .label { 
              border: 2px solid #000; 
              padding: 20px; 
              text-align: center;
              border-radius: 8px;
            }
            h2 { margin: 10px 0 5px; }
            p { margin: 0; color: #666; }
          </style>
        </head>
        <body>
          <div class="label">
            <svg id="print-qr">${qrContent}</svg>
            <h2>${safeCylinderCode}</h2>
            <p>${safeRefrigerantType}</p>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card className="p-4 flex flex-col items-center gap-3">
      <QRCodeSVG
        id={`qr-${cylinderId}`}
        value={qrValue}
        size={size}
        level="M"
        includeMargin
      />
      <div className="text-center">
        <p className="font-mono font-bold">{cylinderCode}</p>
        <p className="text-sm text-muted-foreground">{refrigerantType}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
      </div>
    </Card>
  );
}
