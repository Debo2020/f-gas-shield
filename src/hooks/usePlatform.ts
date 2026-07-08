import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export type Platform = "web" | "ios" | "android" | "ipad";

/**
 * Returns true when the app is running inside a native Capacitor shell
 * (iOS or Android). Returns false in the browser / PWA.
 */
export function useIsNativeApp(): boolean {
  const [isNative, setIsNative] = useState<boolean>(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setIsNative(Capacitor.isNativePlatform());
    } catch {
      setIsNative(false);
    }
  }, []);

  return isNative;
}

/**
 * Detailed platform detection. Distinguishes iPad from iPhone even when
 * running inside a universal iOS binary (iPadOS reports as "MacIntel"
 * on modern Safari, so we sniff touch + userAgent).
 */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("web");

  useEffect(() => {
    try {
      const native = Capacitor.getPlatform(); // "ios" | "android" | "web"
      if (native === "android") {
        setPlatform("android");
        return;
      }
      if (native === "ios") {
        const ua = navigator.userAgent || "";
        const isIpad =
          /iPad/.test(ua) ||
          (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
        setPlatform(isIpad ? "ipad" : "ios");
        return;
      }
    } catch {
      // fall through to web detection
    }

    // Web fallback: detect iPadOS tablets running Safari PWA
    const ua = navigator.userAgent || "";
    const isIpad =
      /iPad/.test(ua) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
    if (isIpad) setPlatform("ipad");
    else setPlatform("web");
  }, []);

  return platform;
}

/** True on iPad (native or web). */
export function useIsIpad(): boolean {
  return usePlatform() === "ipad";
}
