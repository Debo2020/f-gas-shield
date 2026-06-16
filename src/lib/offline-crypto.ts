// AES-GCM encryption utilities for protecting PII in IndexedDB.
//
// Security model:
// - The AES key is derived from the user's PLAINTEXT password using PBKDF2
//   with the user's email as a per-user salt (combined with an app-wide salt).
// - The derived key is NEVER persisted. We only hold it in memory while
//   encrypting/decrypting, then it is dropped.
// - To verify an offline password without exposing the key, we encrypt a
//   known sentinel string ("verifier") and store the ciphertext. On offline
//   login we re-derive the key from the supplied password and attempt to
//   decrypt the verifier; success == correct password.

const APP_SALT = "ftrack-offline-pii-v2";
const VERIFIER_PLAINTEXT = "ftrack-offline-verifier-v1";
const PBKDF2_ITERATIONS = 210_000;

function saltFor(email: string): Uint8Array {
  return new TextEncoder().encode(`${APP_SALT}:${email.trim().toLowerCase()}`);
}

export async function deriveOfflineKey(password: string, email: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltFor(email), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptWithKey(data: unknown, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptWithKey<T>(encrypted: string, key: CryptoKey): Promise<T> {
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export async function encryptData(data: unknown, key: CryptoKey): Promise<string> {
  return encryptWithKey(data, key);
}

export async function decryptData<T>(encrypted: string, key: CryptoKey): Promise<T> {
  return decryptWithKey<T>(encrypted, key);
}

/** Build a verifier ciphertext bound to the supplied key. */
export async function buildVerifier(key: CryptoKey): Promise<string> {
  return encryptWithKey(VERIFIER_PLAINTEXT, key);
}

/** Returns true if the key successfully decrypts the stored verifier. */
export async function verifyKey(verifier: string, key: CryptoKey): Promise<boolean> {
  try {
    const plaintext = await decryptWithKey<string>(verifier, key);
    return plaintext === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}
