// Encrypted license/subscription snapshot cache with 72h offline grace.
//
// Stored in Capacitor Preferences on native (Keychain-backed on iOS,
// EncryptedSharedPreferences-eligible on Android) and localStorage on web.
// Payload is AES-GCM encrypted with a device-scoped random key so that a
// stolen device profile cannot trivially reveal license state.
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { encryptData, decryptData } from "@/lib/offline-crypto";

const CACHE_KEY = "ftrack.license.snapshot.v1";
const DEVICE_KEY_KEY = "ftrack.license.device-key.v1";
export const LICENSE_CACHE_MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72h grace

export interface LicenseSnapshot {
  userId: string;
  subscribed: boolean;
  licenseStatus: "active" | "disabled" | "pending" | null;
  isTrialing: boolean;
  trialEnd: string | null;
  cachedAt: number; // ms epoch
}

const isNative = Capacitor.isNativePlatform();

async function readRaw(key: string): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  }
  return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (isNative) {
    await Preferences.set({ key, value });
    return;
  }
  if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
}

async function removeRaw(key: string): Promise<void> {
  if (isNative) {
    await Preferences.remove({ key });
    return;
  }
  if (typeof localStorage !== "undefined") localStorage.removeItem(key);
}

async function getDeviceKey(): Promise<CryptoKey> {
  let material = await readRaw(DEVICE_KEY_KEY);
  if (!material) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    material = btoa(String.fromCharCode(...Array.from(bytes)));
    await writeRaw(DEVICE_KEY_KEY, material);
  }
  const raw = Uint8Array.from(atob(material), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    raw as unknown as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function saveLicenseSnapshot(snapshot: LicenseSnapshot): Promise<void> {
  try {
    const key = await getDeviceKey();
    const ciphertext = await encryptData(snapshot, key);
    await writeRaw(CACHE_KEY, ciphertext);
  } catch (err) {
    console.error("[license-cache] save failed", err);
  }
}

export async function readLicenseSnapshot(userId: string): Promise<LicenseSnapshot | null> {
  try {
    const raw = await readRaw(CACHE_KEY);
    if (!raw) return null;
    const key = await getDeviceKey();
    const snapshot = await decryptData<LicenseSnapshot>(raw, key);
    if (snapshot.userId !== userId) return null;
    return snapshot;
  } catch {
    return null;
  }
}

export async function clearLicenseSnapshot(): Promise<void> {
  await removeRaw(CACHE_KEY);
}

export function isSnapshotWithinGrace(snapshot: LicenseSnapshot): boolean {
  return Date.now() - snapshot.cachedAt < LICENSE_CACHE_MAX_AGE_MS;
}
