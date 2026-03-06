import { useRef } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, Download, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { escapeHtml } from "@/lib/html-escape";
import type { Database } from "@/integrations/supabase/types";

type Cylinder = Database["public"]["Tables"]["refrigerant_cylinders"]["Row"];

interface RecoveryLabelGeneratorProps {
  cylinder: Cylinder;
  companyName: string;
}

export function RecoveryLabelGenerator({ cylinder, companyName }: RecoveryLabelGeneratorProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !labelRef.current) return;

    const styles = `
      <style>
        @page { size: 100mm 70mm; margin: 0; }
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 8mm;
          box-sizing: border-box;
        }
        .label { 
          border: 2px solid #000; 
          padding: 4mm;
          width: 84mm;
          height: 54mm;
          box-sizing: border-box;
        }
        .header { 
          background: #f59e0b; 
          color: #000; 
          padding: 2mm; 
          text-align: center;
          font-weight: bold;
          font-size: 11pt;
          margin: -4mm -4mm 3mm -4mm;
        }
        .warning { 
          font-size: 9pt; 
          text-align: center;
          margin-bottom: 3mm;
          font-weight: bold;
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 2mm;
          font-size: 8pt;
        }
        .info-item label { 
          font-weight: bold; 
          display: block;
          font-size: 7pt;
          color: #666;
        }
        .info-item span { 
          font-size: 10pt;
          font-weight: bold;
        }
        .footer { 
          margin-top: 3mm; 
          font-size: 7pt; 
          text-align: center;
          border-top: 1px solid #ccc;
          padding-top: 2mm;
        }
        .qr-section {
          text-align: center;
          margin-top: 2mm;
        }
        .qr-section svg {
          width: 25mm;
          height: 25mm;
        }
      </style>
    `;

    const safeCylinderCode = escapeHtml(cylinder.cylinder_code);
    const labelContent = labelRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recovery Label - ${safeCylinderCode}</title>
          ${styles}
        </head>
        <body>
          ${labelContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <Card className="p-4 bg-white">
        <div ref={labelRef}>
          <div className="label border-2 border-black p-3">
            <div className="header bg-amber-500 text-black p-2 text-center font-bold -m-3 mb-3">
              ⚠️ RECOVERED REFRIGERANT - HAZARDOUS ⚠️
            </div>
            
            <div className="warning text-center text-sm font-bold mb-3">
              HANDLE WITH CARE - CONTAMINATED GAS
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground text-[10px]">Cylinder ID</label>
                <div className="font-bold text-sm">{cylinder.cylinder_code}</div>
              </div>
              <div>
                <label className="text-muted-foreground text-[10px]">Refrigerant Type</label>
                <div className="font-bold text-sm">{cylinder.refrigerant_type}</div>
              </div>
              <div>
                <label className="text-muted-foreground text-[10px]">Contents Weight</label>
                <div className="font-bold text-sm">{Number(cylinder.current_weight_kg).toFixed(2)} kg</div>
              </div>
              <div>
                <label className="text-muted-foreground text-[10px]">Tare Weight</label>
                <div className="font-bold text-sm">{Number(cylinder.tare_weight_kg || 0).toFixed(2)} kg</div>
              </div>
              <div>
                <label className="text-muted-foreground text-[10px]">Date Filled</label>
                <div className="font-bold text-sm">{format(new Date(), "dd/MM/yyyy")}</div>
              </div>
              <div>
                <label className="text-muted-foreground text-[10px]">Company</label>
                <div className="font-bold text-sm truncate">{companyName}</div>
              </div>
            </div>

            <div className="qr-section text-center mt-3">
              <QRCodeSVG
                value={`cylinder:${cylinder.id}`}
                size={80}
                level="M"
              />
            </div>

            <div className="footer mt-2 text-[9px] text-center border-t pt-2">
              Must be returned to licensed dealer for reclamation or destruction.
              <br />
              Retain consignment note for minimum 3 years.
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="h-4 w-4 mr-2" />
          Print Label
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        Label size: 100mm × 70mm (standard thermal label)
      </div>
    </div>
  );
}
