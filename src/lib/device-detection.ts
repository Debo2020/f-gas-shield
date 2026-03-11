/**
 * Device detection utilities for app download and deep linking
 */

export type DevicePlatform = "ios" | "android" | "desktop";

export function getDevicePlatform(): DevicePlatform {
  const ua = navigator.userAgent || navigator.vendor || "";

  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    return "ios";
  }

  if (/android/i.test(ua)) {
    return "android";
  }

  return "desktop";
}

// App configuration - update these when apps are published
export const APP_CONFIG = {
  scheme: "ftrack",
  iosStoreUrl: "https://apps.apple.com/app/ftrack-f-gas-compliance/id0000000000",
  androidStoreUrl: "https://play.google.com/store/apps/details?id=app.lovable.0b33a0ababa943f09671c6f0a67e5212",
  iosBundleId: "app.lovable.0b33a0ababa943f09671c6f0a67e5212",
  androidPackage: "app.lovable.0b33a0ababa943f09671c6f0a67e5212",
} as const;

/**
 * Build a deep link URL for the invitation token
 */
export function buildDeepLink(token: string, type: "invite" | "license" = "invite"): string {
  return `${APP_CONFIG.scheme}://${type}?token=${encodeURIComponent(token)}`;
}

/**
 * Attempt to open the app via deep link, falling back to app store
 */
export function tryOpenApp(token: string, type: "invite" | "license" = "invite"): void {
  const platform = getDevicePlatform();
  const deepLink = buildDeepLink(token, type);

  if (platform === "desktop") {
    // On desktop, deep links don't apply
    return;
  }

  // Try deep link with timeout fallback to store
  const start = Date.now();
  window.location.href = deepLink;

  setTimeout(() => {
    // If we're still on this page after 1.5s, the app isn't installed
    if (Date.now() - start < 2000) {
      window.location.href =
        platform === "ios" ? APP_CONFIG.iosStoreUrl : APP_CONFIG.androidStoreUrl;
    }
  }, 1500);
}

/**
 * Get the appropriate store URL for the current platform
 */
export function getStoreUrl(platform?: DevicePlatform): string {
  const p = platform || getDevicePlatform();
  return p === "ios" ? APP_CONFIG.iosStoreUrl : APP_CONFIG.androidStoreUrl;
}
