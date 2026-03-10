import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { CLIENT_HEADERS, SUPPLIER_HEADERS } from "@/lib/csv-templates";

interface CSVBatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "clients" | "suppliers";
  companyId: string;
  onSuccess: () => void;
  existingNames?: string[];
}

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
  isDuplicate: boolean;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && text[i + 1] === "\n")) {
        row.push(current.trim());
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
        current = "";
        if (char === "\r") i++;
      } else {
        current += char;
      }
    }
  }
  row.push(current.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  return rows;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRow(
  data: Record<string, string>,
  existingNames: string[]
): { errors: string[]; isDuplicate: boolean } {
  const errors: string[] = [];
  let isDuplicate = false;

  if (!data.name || data.name.length === 0) {
    errors.push("Name is required");
  } else if (data.name.length > 200) {
    errors.push("Name too long (max 200)");
  }

  if (data.contact_email && !EMAIL_REGEX.test(data.contact_email)) {
    errors.push("Invalid email format");
  }

  if (data.contact_email && data.contact_email.length > 255) {
    errors.push("Email too long (max 255)");
  }

  if (data.name && existingNames.includes(data.name.toLowerCase())) {
    isDuplicate = true;
  }

  return { errors, isDuplicate };
}

export function CSVBatchUploadDialog({
  open,
  onOpenChange,
  type,
  companyId,
  onSuccess,
  existingNames = [],
}: CSVBatchUploadDialogProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const headers = type === "clients" ? CLIENT_HEADERS : SUPPLIER_HEADERS;
  const lowerExisting = existingNames.map((n) => n.toLowerCase());

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = parseCSV(text);

        if (rows.length < 2) {
          toast.error("CSV must have a header row and at least one data row");
          return;
        }

        const csvHeaders = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
        const missingHeaders = headers.filter(
          (h) => h === "name" && !csvHeaders.includes(h)
        );

        if (missingHeaders.length > 0) {
          toast.error(`Missing required column: ${missingHeaders.join(", ")}`);
          return;
        }

        const dataRows = rows.slice(1, 101); // Max 100 rows
        if (rows.length > 101) {
          toast.warning("Only the first 100 rows will be processed");
        }

        const parsed: ParsedRow[] = dataRows.map((row) => {
          const data: Record<string, string> = {};
          headers.forEach((header, idx) => {
            const csvIdx = csvHeaders.indexOf(header);
            data[header] = csvIdx >= 0 && row[csvIdx] ? row[csvIdx] : "";
          });
          const { errors, isDuplicate } = validateRow(data, lowerExisting);
          return { data, errors, isDuplicate };
        });

        setParsedRows(parsed);
      };
      reader.readAsText(file);
    },
    [headers, lowerExisting]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const errorRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleUpload = async () => {
    if (validRows.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const insertData = validRows.map((r) => ({
        company_id: companyId,
        name: r.data.name,
        contact_name: r.data.contact_name || null,
        contact_email: r.data.contact_email || null,
        contact_phone: r.data.contact_phone || null,
        address: r.data.address || null,
        notes: r.data.notes || null,
        ...(type === "suppliers" && r.data.account_number
          ? { account_number: r.data.account_number }
          : {}),
      }));

      setProgress(50);

      const { error } = await supabase.from(type).insert(insertData);

      if (error) throw error;

      setProgress(100);
      toast.success(`${validRows.length} ${type} imported successfully`);
      setParsedRows([]);
      setFileName("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || `Failed to import ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!uploading) {
      setParsedRows([]);
      setFileName("");
      setProgress(0);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Batch Upload {type === "clients" ? "Clients" : "Suppliers"}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple {type} at once. Maximum 100 rows per upload.
          </DialogDescription>
        </DialogHeader>

        {parsedRows.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {isDragActive ? "Drop your CSV file here" : "Drag & drop a CSV file, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Only .csv files accepted
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{fileName}</span>
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {validRows.length} valid
              </Badge>
              {errorRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errorRows.length} errors
                </Badge>
              )}
              {parsedRows.some((r) => r.isDuplicate) && (
                <Badge variant="secondary">
                  {parsedRows.filter((r) => r.isDuplicate).length} duplicates
                </Badge>
              )}
            </div>

            <div className="border rounded-md overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]">#</TableHead>
                    {headers.map((h) => (
                      <TableHead key={h} className="text-xs">
                        {h.replace(/_/g, " ")}
                      </TableHead>
                    ))}
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={row.errors.length > 0 ? "bg-destructive/5" : ""}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      {headers.map((h) => (
                        <TableCell key={h} className="text-xs max-w-[150px] truncate">
                          {row.data[h] || "-"}
                        </TableCell>
                      ))}
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <span className="text-xs text-destructive">
                            {row.errors.join("; ")}
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="text-xs text-amber-600">Duplicate name</span>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {uploading && <Progress value={progress} className="h-2" />}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={uploading}>
            Cancel
          </Button>
          {parsedRows.length > 0 && (
            <Button onClick={handleUpload} disabled={uploading || validRows.length === 0}>
              {uploading
                ? "Importing..."
                : `Import ${validRows.length} ${type}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
