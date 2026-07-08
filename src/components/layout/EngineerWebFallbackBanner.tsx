import { useState } from "react";
import { Smartphone, X, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsNativeApp } from "@/hooks/usePlatform";
import { APP_CONFIG } from "@/lib/device-detection";

const DISMISS_KEY = "ftrack-engineer-web-fallback-dismissed";

/**
 * Shown to engineers who sign in on the web/PWA. Encourages them to install
 * the native mobile app where the full engineer experience lives.
 * Dismissible per-session.
 */
export function EngineerWebFallbackBanner() {
  const { hasRole } = useAuth();
  const isNative = useIsNativeApp();
  const [dismissed, setDismissed] = useState<boolean>(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  // Only show for engineers on the web (not native, not iPad Manager use)
  const isEngineerOnly =
    hasRole("engineer") &&
    !hasRole("owner") &&
    !hasRole("manager") &&
    !hasRole("stores_manager");

  if (isNative || !isEngineerOnly || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="border-b bg-primary/10">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Smartphone className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1 text-sm">
          <span className="font-medium">You're viewing FTrack on the web.</span>{" "}
          <span className="text-muted-foreground">
            For full engineer features — offline logs, camera capture, QR scanning
            — install the mobile app.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={APP_CONFIG.iosStoreUrl} target="_blank" rel="noreferrer">
              <Apple className="mr-1.5 h-4 w-4" />
              App Store
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={APP_CONFIG.androidStoreUrl} target="_blank" rel="noreferrer">
              Google Play
            </a>
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
