import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ftrack.installPrompt.dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isMobileUA() {
  return /Android|iPhone|iPod/i.test(navigator.userAgent);
}

/**
 * Mandatory desktop PWA install prompt for Owner / Manager / Office roles.
 * - Skips if already installed, or on mobile phones (they use the native app).
 * - Engineers: soft, dismissed by default (skipped here — they get the native app).
 * - Dismissible per session; re-appears on next sign-in.
 */
export function InstallPrompt() {
  const { hasRole, user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const isOfficeRole =
    hasRole("owner") || hasRole("manager") || hasRole("stores_manager");

  useEffect(() => {
    if (!user || !isOfficeRole) return;
    if (isStandalone()) return;
    if (isMobileUA()) return; // phones use native app
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari never fires beforeinstallprompt — show banner with instructions.
    if (isIOS()) {
      setVisible(true);
    }

    const installedHandler = () => setVisible(false);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [user, isOfficeRole]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      setDeferredPrompt(null);
    } else if (isIOS()) {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="w-full bg-primary text-primary-foreground border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Download className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">Install FTrack</span>
            <span className="hidden sm:inline">
              {" "}
              — recommended for admins and managers for a faster, app-like experience.
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstall}
            className="h-8"
          >
            Install
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install FTrack on iPad / iPhone</DialogTitle>
            <DialogDescription>
              Safari doesn't offer a one-click install. Follow these steps:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="font-semibold">1.</span>
              <span>
                Tap the <Share className="inline h-4 w-4" /> <strong>Share</strong> button
                in Safari's toolbar.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">2.</span>
              <span>
                Scroll and tap <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">3.</span>
              <span>
                Confirm the name <strong>FTrack</strong> and tap <strong>Add</strong>.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
