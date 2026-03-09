

# Phase 2 — Compliance & Security Hardening

## Summary
Six changes addressing GDPR compliance, password security, offline auth bug fix, CORS lockdown, and IndexedDB PII protection.

---

## 1. Fix Offline Login Bug (Auth.tsx)

`Auth.tsx` line 93 calls `signInOffline(email)` without passing the password, bypassing the password check added in Phase 1. The password field is also disabled when offline.

**Changes:**
- `src/pages/Auth.tsx`: Enable the password input when offline, pass `password` to `signInOffline(email, password)`

---

## 2. Strengthen Password Policy

Current: 8 chars minimum, no complexity. 

**Changes:**
- `src/pages/Auth.tsx`: Update `passwordSchema` to require 12+ chars with at least 1 uppercase, 1 lowercase, 1 number, 1 special character. Update the helper text.
- `src/pages/SetPassword.tsx` and `src/pages/ResetPassword.tsx`: Apply same validation rules.

---

## 3. Restrict CORS on All Edge Functions

All 12 edge functions use `Access-Control-Allow-Origin: *`.

**Changes:**
- All edge function files: Replace `"*"` with a helper that reads an `ALLOWED_ORIGINS` list (hardcoded to `https://f-gas-shield.lovable.app`, `https://ftrack.lovable.app`, and the Lovable preview domain pattern). Falls back to checking the `Origin` header against the allowlist.

---

## 4. Add Account Deletion (GDPR Article 17)

**Changes:**
- New edge function `supabase/functions/delete-account/index.ts`: Authenticated endpoint that deletes the user's profile, roles, licenses, documents (+ storage files), gas certificates, refrigerant movements, inspections, and finally the auth user via service role. Logs to audit_log.
- `src/pages/settings/Profile.tsx`: Add "Delete My Account" danger zone card with confirmation dialog.
- Database migration: No new tables needed — uses existing structure.

---

## 5. Add Data Export (GDPR Article 20)

**Changes:**
- New edge function `supabase/functions/export-user-data/index.ts`: Collects all user-associated data (profile, inspections, gas movements, certificates, documents metadata) and returns as JSON download.
- `src/pages/settings/Profile.tsx`: Add "Export My Data" button in a new "Data & Privacy" card.

---

## 6. Encrypt IndexedDB PII

**Changes:**
- `src/lib/offline-db.ts`: Add AES-GCM encryption/decryption utilities using a key derived from the user's password hash (already stored during login). Encrypt the `profile` object and sensitive fields in cached sites before storing. Decrypt on read.
- `src/hooks/useAuth.tsx`: Pass the encryption key to the caching layer during `fetchProfile`.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Fix offline password passthrough, strengthen password schema |
| `src/pages/SetPassword.tsx` | Strengthen password schema |
| `src/pages/ResetPassword.tsx` | Strengthen password schema |
| `src/pages/settings/Profile.tsx` | Add Delete Account + Export Data sections |
| `src/lib/offline-db.ts` | Add AES-GCM encryption for cached PII |
| `src/hooks/useAuth.tsx` | Pass encryption key to offline cache |
| `supabase/functions/delete-account/index.ts` | New — account deletion |
| `supabase/functions/export-user-data/index.ts` | New — data export |
| All 12 existing edge functions | CORS restriction |
| `supabase/config.toml` | Add new function entries |

