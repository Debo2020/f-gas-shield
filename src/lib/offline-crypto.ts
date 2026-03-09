// AES-GCM encryption utilities for protecting PII in IndexedDB

const SALT = new TextEncoder().encode("ftrack-offline-pii-v1");

async function deriveKey(passwordHash: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passwordHash),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: unknown, passwordHash: string): Promise<string> {
  if (!passwordHash) return JSON.stringify(data);
  const key = await deriveKey(passwordHash);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  // Store as base64: iv (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptData<T>(encrypted: string, passwordHash: string): Promise<T> {
  if (!passwordHash) return JSON.parse(encrypted) as T;
  try {
    const key = await deriveKey(passwordHash);
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted)) as T;
  } catch {
    // If decryption fails (e.g. wrong key, unencrypted data), try parsing as plain JSON
    try {
      return JSON.parse(encrypted) as T;
    } catch {
      throw new Error("Failed to decrypt offline data");
    }
  }
}
