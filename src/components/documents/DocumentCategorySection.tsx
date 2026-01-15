import { useMemo, useState } from "react";
import { DocumentTypeSection, type DocumentType } from "./DocumentTypeSection";
import { DocumentUploader } from "./DocumentUploader";
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

export type DocumentCategory = "site" | "compliance" | "equipment" | "media";

interface Document {
  id: string;
  name: string;
  file_url: string;
  document_type: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  bucket_id: string | null;
  equipment_id: string | null;
  site_id: string | null;
  equipment?: { name: string } | null;
  site?: { name: string } | null;
}

interface Site {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
  site_id: string;
}

interface DocumentCategorySectionProps {
  category: DocumentCategory;
  documents: Document[];
  sites: Site[];
  equipment: Equipment[];
  companyId: string;
  canDelete: boolean;
  signedUrls: Record<string, string>;
  onDocumentDeleted: (doc: Document) => void;
  onUploadComplete: () => void;
}

// Define which document types belong to each category
const CATEGORY_CONFIG: Record<DocumentCategory, {
  types: { type: DocumentType; label: string }[];
  description: string;
}> = {
  site: {
    types: [
      { type: "declaration", label: "Declarations" },
      { type: "invoice", label: "Invoices" },
      { type: "report", label: "Reports" },
      { type: "photo", label: "Site Photos" },
      { type: "other", label: "Other Documents" },
    ],
    description: "Documents related to site locations",
  },
  compliance: {
    types: [
      { type: "certificate", label: "Certificates" },
      { type: "declaration", label: "Declarations" },
      { type: "report", label: "Compliance Reports" },
    ],
    description: "Compliance certificates, declarations, and audit reports",
  },
  equipment: {
    types: [
      { type: "label", label: "Equipment Labels" },
      { type: "photo", label: "Equipment Photos" },
      { type: "report", label: "Equipment Reports" },
      { type: "certificate", label: "Equipment Certificates" },
      { type: "other", label: "Other Documents" },
    ],
    description: "Documents related to equipment assets",
  },
  media: {
    types: [
      { type: "photo", label: "Photos" },
      { type: "label", label: "Labels & Images" },
    ],
    description: "Photos and visual documentation",
  },
};

// Filter rules for each category
const getCategoryFilter = (category: DocumentCategory) => (doc: Document): boolean => {
  switch (category) {
    case "site":
      // Site documents: has site_id OR is site-related type without equipment
      return (doc.site_id !== null && doc.equipment_id === null) || 
             (doc.site_id === null && doc.equipment_id === null && 
              ["declaration", "invoice", "report", "other"].includes(doc.document_type));
    case "compliance":
      // Compliance: certificates, declarations, reports
      return ["certificate", "declaration", "report"].includes(doc.document_type);
    case "equipment":
      // Equipment documents: has equipment_id OR is equipment-related
      return doc.equipment_id !== null || doc.document_type === "label";
    case "media":
      // Media: photos and images
      return doc.document_type === "photo" || 
             doc.document_type === "label" ||
             doc.mime_type?.startsWith("image/") || false;
    default:
      return true;
  }
};

export function DocumentCategorySection({
  category,
  documents,
  sites,
  equipment,
  companyId,
  canDelete,
  signedUrls,
  onDocumentDeleted,
  onUploadComplete,
}: DocumentCategorySectionProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<DocumentType>("other");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");

  const config = CATEGORY_CONFIG[category];
  const categoryFilter = getCategoryFilter(category);

  // Filter documents for this category
  const categoryDocuments = useMemo(() => {
    return documents.filter(categoryFilter);
  }, [documents, category]);

  // Group documents by type within this category
  const documentsByType = useMemo(() => {
    const grouped: Record<string, Document[]> = {};
    config.types.forEach(({ type }) => {
      grouped[type] = categoryDocuments.filter((doc) => doc.document_type === type);
    });
    return grouped;
  }, [categoryDocuments, config.types]);

  const handleUploadClick = (type: DocumentType) => {
    setUploadType(type);
    setSelectedSiteId("");
    setSelectedEquipmentId("");
    setUploadDialogOpen(true);
  };

  const handleUploadComplete = () => {
    setUploadDialogOpen(false);
    setSelectedSiteId("");
    setSelectedEquipmentId("");
    onUploadComplete();
  };

  // Determine context for upload based on category
  const showSiteSelector = category === "site";
  const showEquipmentSelector = category === "equipment";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{config.description}</p>
      
      {config.types.map(({ type, label }) => (
        <DocumentTypeSection
          key={type}
          type={type}
          label={label}
          documents={documentsByType[type] || []}
          onUpload={() => handleUploadClick(type)}
          onDelete={onDocumentDeleted}
          canDelete={canDelete}
          signedUrls={signedUrls}
          defaultOpen={documentsByType[type]?.length > 0}
        />
      ))}

      {/* Upload Dialog with Type Pre-selected */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Upload {config.types.find((t) => t.type === uploadType)?.label || "Document"}
            </DialogTitle>
            <DialogDescription>
              Upload a new {uploadType} document to your {category} documents
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Site Selector for Site category */}
            {showSiteSelector && sites.length > 0 && (
              <div className="space-y-2">
                <Label>Attach to Site (optional)</Label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific site</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Equipment Selector for Equipment category */}
            {showEquipmentSelector && equipment.length > 0 && (
              <div className="space-y-2">
                <Label>Attach to Equipment (optional)</Label>
                <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific equipment</SelectItem>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DocumentUploader
              companyId={companyId}
              documentType={uploadType}
              siteId={selectedSiteId && selectedSiteId !== "none" ? selectedSiteId : undefined}
              equipmentId={selectedEquipmentId && selectedEquipmentId !== "none" ? selectedEquipmentId : undefined}
              onUploadComplete={handleUploadComplete}
              showExpiryDate={["certificate", "declaration", "report"].includes(uploadType)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
