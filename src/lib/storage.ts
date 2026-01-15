import { supabase } from "@/integrations/supabase/client";

// Bucket mapping based on document type and context
export type DocumentType = "certificate" | "invoice" | "photo" | "declaration" | "label" | "report" | "other";

interface BucketContext {
  documentType: DocumentType;
  siteId?: string;
  equipmentId?: string;
  profileId?: string;
}

/**
 * Determine the appropriate storage bucket based on document type and context.
 */
export function getBucketForDocument(context: BucketContext): string {
  const { documentType, siteId, equipmentId, profileId } = context;

  switch (documentType) {
    case "certificate":
      return "certificates";
    case "invoice":
      return "invoices";
    case "photo":
      // Photos go to different buckets based on context
      if (siteId) return "site-photos";
      if (equipmentId) return "equipment-photos";
      return "compliance-documents"; // Fallback for general photos
    case "label":
      return "equipment-photos"; // Labels are typically equipment-related
    case "declaration":
    case "report":
      return "compliance-reports";
    default:
      return "compliance-documents";
  }
}

/**
 * Generate a structured file path for storage.
 * Format: {companyId}/{year}/{month}/{filename}
 */
export function generateFilePath(companyId: string, fileName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const fileExt = fileName.split(".").pop() || "bin";
  const uniqueId = crypto.randomUUID();
  
  return `${companyId}/${year}/${month}/${uniqueId}.${fileExt}`;
}

/**
 * Get a signed URL for a document in any private storage bucket.
 * This allows time-limited access to private files.
 * 
 * @param filePath - The file path stored in the database (can be full URL or just path)
 * @param bucketId - The storage bucket ID (defaults to 'compliance-documents' for legacy files)
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns The signed URL or null if failed
 */
export async function getDocumentUrl(
  filePath: string, 
  bucketId: string = "compliance-documents",
  expiresIn = 3600
): Promise<string | null> {
  try {
    const path = extractFilePath(filePath, bucketId);
    console.log("[Storage] Creating signed URL:", { originalPath: filePath, extractedPath: path, bucket: bucketId });
    
    const { data, error } = await supabase.storage
      .from(bucketId)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("[Storage] Signed URL error:", error);
      // Fallback to legacy bucket if we're not already trying it
      if (bucketId !== "compliance-documents") {
        console.log("[Storage] Trying legacy bucket fallback...");
        return getDocumentUrl(filePath, "compliance-documents", expiresIn);
      }
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("[Storage] Exception in getDocumentUrl:", error);
    return null;
  }
}

export function extractFilePath(fileUrlOrPath: string, bucketId: string = "compliance-documents"): string {
  // If it's not a URL, return as-is (it's already a path)
  if (!fileUrlOrPath.includes("://")) {
    return fileUrlOrPath;
  }

  try {
    const url = new URL(fileUrlOrPath);
    
    // Handle various URL patterns:
    // 1. /storage/v1/object/public/{bucket}/{path}
    // 2. /storage/v1/object/sign/{bucket}/{path}
    // 3. /storage/v1/object/{bucket}/{path}
    
    const patterns = [
      new RegExp(`/storage/v1/object/(?:public|sign)/${bucketId}/(.+?)(?:\\?|$)`),
      new RegExp(`/storage/v1/object/${bucketId}/(.+?)(?:\\?|$)`),
      new RegExp(`${bucketId}/(.+?)(?:\\?|$)`),
    ];
    
    for (const pattern of patterns) {
      const match = url.pathname.match(pattern);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    
    // Try legacy compliance-documents bucket
    const legacyPatterns = [
      /\/storage\/v1\/object\/(?:public|sign)\/compliance-documents\/(.+?)(?:\?|$)/,
      /compliance-documents\/(.+?)(?:\?|$)/,
    ];
    
    for (const pattern of legacyPatterns) {
      const match = url.pathname.match(pattern);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    
    // Last resort: get the last path segments (company/file pattern)
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts.slice(-2).join("/");
    }
    
    return pathParts[pathParts.length - 1] || fileUrlOrPath;
  } catch {
    return fileUrlOrPath;
  }
}

/**
 * Download a document by creating a signed URL and triggering download.
 */
export async function downloadDocument(
  filePath: string, 
  fileName: string,
  bucketId: string = "compliance-documents"
): Promise<void> {
  const signedUrl = await getDocumentUrl(filePath, bucketId);
  
  if (!signedUrl) {
    throw new Error("Failed to get download URL");
  }

  // Create a temporary link and click it
  const link = document.createElement("a");
  link.href = signedUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Check if a MIME type is viewable inline (images and PDFs).
 */
export function isViewableInline(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

/**
 * Get a human-readable bucket label.
 */
export function getBucketLabel(bucketId: string): string {
  const labels: Record<string, string> = {
    "certificates": "Certificates",
    "site-photos": "Site Photos",
    "equipment-photos": "Equipment Photos",
    "compliance-reports": "Compliance Reports",
    "invoices": "Invoices",
    "compliance-documents": "Documents",
  };
  return labels[bucketId] || "Documents";
}
