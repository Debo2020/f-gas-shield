import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for a document in the private compliance-documents bucket.
 * This allows time-limited access to private files.
 * 
 * @param filePath - The file path stored in the database (can be full URL or just path)
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns The signed URL or null if failed
 */
export async function getDocumentUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
  try {
    // If it's already a full URL, extract the file path
    const path = extractFilePath(filePath);
    
    const { data, error } = await supabase.storage
      .from("compliance-documents")
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error in getDocumentUrl:", error);
    return null;
  }
}

/**
 * Extract the file path from a URL or return the path if already a path.
 * Handles both full Supabase storage URLs and plain paths.
 */
export function extractFilePath(fileUrlOrPath: string): string {
  // If it's not a URL, return as-is
  if (!fileUrlOrPath.includes("://")) {
    return fileUrlOrPath;
  }

  try {
    const url = new URL(fileUrlOrPath);
    // Path format: /storage/v1/object/public/compliance-documents/{companyId}/{filename}
    // We need to extract: {companyId}/{filename}
    const pathMatch = url.pathname.match(/compliance-documents\/(.+)$/);
    if (pathMatch) {
      return pathMatch[1];
    }
    // Fallback: get last two segments (companyId/filename)
    const pathParts = url.pathname.split("/");
    return pathParts.slice(-2).join("/");
  } catch {
    // If URL parsing fails, return original
    return fileUrlOrPath;
  }
}

/**
 * Download a document by creating a signed URL and triggering download.
 */
export async function downloadDocument(filePath: string, fileName: string): Promise<void> {
  const signedUrl = await getDocumentUrl(filePath);
  
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
