import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  saveLicenseSnapshot,
  readLicenseSnapshot,
  clearLicenseSnapshot,
  isSnapshotWithinGrace,
  LICENSE_CACHE_MAX_AGE_MS,
} from "@/lib/license-cache";

/**
 * Phase 3 license enforcement:
 * - On mount, on foreground (Capacitor appStateChange / visibilitychange),
 *   and every 15 minutes while active, re-run `check-subscription` and cache
 *   an encrypted snapshot.
 * - When offline, honour the cached snapshot for up to 72 h; beyond that,
 *   force sign-out.
 * - Subscribe to realtime changes on the current user's `user_licenses` row.
 *   If it flips to `disabled` (or is deleted) we clear the cache and sign the
 *   user out with a "Access removed by admin" toast — this is the client-side
 *   half of the revoke flow that Phase 4 will complete with a push.
 *
 * Owners are exempt (they always have implicit access).
 */
export function useLicenseEnforcement() {
  const { user, profile, hasRole, refreshLicense, signOut } = useAuth();
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const isOwner = hasRole("owner");

    const forceSignOut = async (message: string) => {
      await clearLicenseSnapshot();
      toast.error(message);
      await signOut();
    };

    const runCheck = async () => {
      // Owners: no license check needed, but still keep a snapshot so their
      // cached state persists offline.
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase.functions.invoke("check-subscription");
          if (cancelled) return;
          if (error) throw error;
          await saveLicenseSnapshot({
            userId: user.id,
            subscribed: !!data?.subscribed,
            licenseStatus: (data?.license_status as "active" | "disabled" | "pending" | null) ?? (isOwner ? "active" : null),
            isTrialing: !!data?.is_trialing,
            trialEnd: data?.trial_end ?? null,
            cachedAt: Date.now(),
          });
          await refreshLicense();
          return;
        } catch (err) {
          console.warn("[license-enforcement] online check failed, falling back to cache", err);
        }
      }

      // Offline (or online check failed): consult cache.
      const snapshot = await readLicenseSnapshot(user.id);
      if (!snapshot) {
        if (!isOwner && !navigator.onLine) {
          await forceSignOut(
            "You're offline and we have no cached licence. Please reconnect to continue."
          );
        }
        return;
      }
      if (!isSnapshotWithinGrace(snapshot)) {
        if (!isOwner) {
          await forceSignOut(
            `Offline licence grace expired (${Math.round(LICENSE_CACHE_MAX_AGE_MS / 3_600_000)}h). Reconnect to continue using FTrack.`
          );
        }
      }
    };

    refreshRef.current = runCheck;
    runCheck();

    // Foreground listeners
    const cleanups: Array<() => void> = [];
    if (Capacitor.isNativePlatform()) {
      const handle = CapacitorApp.addListener("appStateChange", (state) => {
        if (state.isActive) runCheck();
      });
      cleanups.push(() => {
        void handle.then((h) => h.remove());
      });
    } else if (typeof document !== "undefined") {
      const onVis = () => { if (document.visibilityState === "visible") runCheck(); };
      document.addEventListener("visibilitychange", onVis);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVis));
    }

    // Periodic refresh (every 15 minutes while active)
    const interval = window.setInterval(runCheck, 15 * 60 * 1000);
    cleanups.push(() => window.clearInterval(interval));

    // Realtime revoke: watch this user's own license row.
    const companyId = profile?.company_id;
    if (companyId && !isOwner) {
      const channel = supabase
        .channel(`user-license-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_licenses",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new as { status?: string } | null;
            const eventType = payload.eventType;
            if (eventType === "DELETE" || newRow?.status === "disabled") {
              void (async () => {
                await forceSignOut("Access removed by admin.");
              })();
            } else {
              // Any other change (e.g. reactivated) → refresh state.
              void runCheck();
            }
          }
        )
        .subscribe();
      cleanups.push(() => {
        void supabase.removeChannel(channel);
      });
    }

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.company_id]);

  return { recheck: () => refreshRef.current() };
}
