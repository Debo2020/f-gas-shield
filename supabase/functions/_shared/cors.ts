// Shared CORS configuration for all edge functions

export const ALLOWED_ORIGINS = [
  "https://f-gas-shield.lovable.app",
  "https://ftrack.lovable.app",
  "https://ftrack.uk",
  "https://www.ftrack.uk",
];

export const DEFAULT_SAFE_ORIGIN = "https://ftrack.uk";

// Match Lovable preview domains: id-preview--<uuid>.lovable.app OR <uuid>.lovableproject.com
const PREVIEW_PATTERN_LOVABLE = /^https:\/\/[a-z0-9-]+--[a-f0-9-]+\.lovable\.app$/;
const PREVIEW_PATTERN_PROJECT = /^https:\/\/[a-f0-9-]+\.lovableproject\.com$/;

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  const appUrl = Deno.env.get("APP_URL") || "";
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    (appUrl && origin === appUrl) ||
    PREVIEW_PATTERN_LOVABLE.test(origin) ||
    PREVIEW_PATTERN_PROJECT.test(origin) ||
    origin.startsWith("http://localhost:")
  );
}

/**
 * Returns the request origin only if it passes the same allowlist used for CORS.
 * Falls back to the canonical production URL. Use for any URL embedded in
 * third-party redirects (Stripe success_url / cancel_url / return_url, etc.)
 * so a forged Origin header cannot turn our payment flow into an open redirect.
 */
export function getSafeOrigin(req: Request): string {
  const origin = req.headers.get("Origin") || "";
  return isAllowedOrigin(origin) ? origin : DEFAULT_SAFE_ORIGIN;
}

export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), context, message, stack }));
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = isAllowedOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}
