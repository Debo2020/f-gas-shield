

# Pre-Launch Security & Functionality Assessment

## Summary
Automated security scans surfaced **3 critical (ERROR-level) data-exposure issues**, **1 medium storage issue**, and **33 warnings**. Functionality-wise the app is feature-complete per memory notes, but several production-readiness items remain (testing, TypeScript strictness, CSP). This plan groups findings into fix tiers — no code is changed until you approve.

---

## 🔴 CRITICAL — Must fix before launch (data exposure)

### 1. `companies` table publicly readable
Anonymous SELECT policy with `USING (true)` exposes **every company's** name, email, phone, and address to unauthenticated requests.
**Fix:** Drop the broad anon policy. Replace with a narrowly scoped anon policy that returns only `id, name, slug, logo_url` when looked up by `slug` (needed for the invitation flow), or move public name lookup into a SECURITY DEFINER RPC that returns only those safe columns.

### 2. `user_licenses` table publicly readable
Policy `USING (token IS NOT NULL)` is always true (token has a default), so **all license rows including emails** are anon-readable.
**Fix:** Replace with a parameterised RPC `get_license_by_token(_token text)` returning only the single matching row, and drop the anon SELECT policy on the table.

### 3. `team_invitations` table publicly readable
Same pattern as #2 — all pending invitations (emails, roles, company IDs) exposed.
**Fix:** Same remediation — parameterised RPC `get_invitation_by_token(_token text)`, drop anon SELECT.

---

## 🟡 MEDIUM — Should fix before launch

### 4. `support-attachments` bucket — cross-user read
Any authenticated user can download any other user's ticket attachments.
**Fix:** Tighten storage SELECT policy to `bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text`, and ensure upload code prefixes files with `${userId}/`.

### 5. Public bucket listing
Public buckets (e.g. `company-logos`) allow listing all files.
**Fix:** Restrict the storage SELECT policy so files can be fetched by URL but not enumerated, or accept this if logos are intentionally public (decide per bucket).

---

## 🟢 LOW — Warnings to review (not blockers)

### 6. SECURITY DEFINER functions executable by anon/authenticated (30+ warnings)
All current SECURITY DEFINER helpers (`has_role`, `get_user_company_id`, `is_org_member`, etc.) are intentionally callable — they enforce auth internally. Action: explicitly REVOKE EXECUTE FROM anon on the ones that should never run unauthenticated (e.g. `create_company_for_current_user`, `recalculate_activation_score`, `log_audit_event`), then mark the remaining warnings as accepted in security memory with rationale.

---

## ⚙️ Auth / Platform hardening (recommended before launch)

- Enable **leaked-password protection (HIBP)** via Supabase auth config.
- Confirm **email confirmations** are required (no auto-confirm).
- Verify Google OAuth is configured if used in production.

---

## 🧪 Functionality readiness checklist

These items come from project memory (`production-readiness-requirements`, `development-debt-and-risks`) and are not auto-testable here:

- **No automated tests.** Recommend adding Vitest smoke tests for: sign-up/sign-in, invitation acceptance, license purchase webhook, ticket submission.
- **TypeScript `strictNullChecks: false`** — risky for launch; enable and fix fallout.
- **Dual toast systems** (Sonner + Radix) — consolidate on Sonner.
- **No CSP headers** on the deployed site.
- **No external uptime monitoring** wired to `health-check` endpoint.
- **GasCertificatePDF.tsx** monolith (>1000 lines) — refactor post-launch.

I will not auto-fix these in this pass; they're flagged for your decision.

---

## Proposed execution order (if approved)

1. Migration: fix `companies`, `user_licenses`, `team_invitations` anon exposure (new RPCs + drop policies) — **CRITICAL**.
2. Migration: tighten `support-attachments` storage policy; audit other buckets — **MEDIUM**.
3. Migration: REVOKE EXECUTE on truly-private SECURITY DEFINER functions; update security-memory for accepted ones.
4. Enable HIBP password check via auth config.
5. Update `ServiceTicketDialog.tsx` upload path to include `${userId}/` prefix (if not already).
6. Re-run security scan + linter to confirm clean.
7. Produce a short post-fix report and a "Pre-launch checklist" for the non-automatable items (tests, CSP, strict mode, monitoring).

## Out of scope for this pass
Refactoring monolith files, writing the test suite, enabling strict TS mode, and adding CSP — these are larger workstreams I'll list as follow-ups rather than bundle into one change.

