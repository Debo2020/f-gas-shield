import { useState, useEffect } from "react";
import { Smartphone, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getDevicePlatform,
  tryOpenApp,
  APP_CONFIG,
  type DevicePlatform,
} from "@/lib/device-detection";

interface AppDownloadSectionProps {
  token: string;
  tokenType?: "invite" | "license";
}

export default function AppDownloadSection({ token, tokenType = "invite" }: AppDownloadSectionProps) {
  const [platform, setPlatform] = useState<DevicePlatform>("desktop");

  useEffect(() => {
    setPlatform(getDevicePlatform());
  }, []);

  const handleOpenApp = () => {
    tryOpenApp(token, tokenType);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
          or use the mobile app
        </span>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Smartphone className="h-4 w-4 text-primary" />
          <span>Get the FTrack App</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Download the app for the best experience with offline access, push notifications, and camera scanning.
        </p>

        {platform === "desktop" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              asChild
            >
              <a href={APP_CONFIG.iosStoreUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                App Store
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              asChild
            >
              <a href={APP_CONFIG.androidStoreUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Google Play
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleOpenApp}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in App
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              asChild
            >
              <a
                href={platform === "ios" ? APP_CONFIG.iosStoreUrl : APP_CONFIG.androidStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {platform === "ios" ? "Download from App Store" : "Get it on Google Play"}
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
