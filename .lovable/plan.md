

# Full Production Readiness & Security Audit Report

## SECTION 1 — PRODUCT MARKET READINESS

### CRITICAL

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1.1 | **No Stripe webhook handler** | CRITICAL | No edge function receives Stripe webhook events (`checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, etc.). Subscription status is only synced when the user manually triggers `check-subscription`. If a user closes the browser after Stripe checkout, their subscription is never recorded. Renewals, cancellations, and failed payments are never captured server-side. |
| 1.2 | **Offline login has no password verification** | CRITICAL | `signInOffline` only checks if the email hash matches a cached profile. Any person who knows an engineer's email can access cached company data (sites, equipment, gas movements) without a password. |
| 1.3 | **`listUsers()` without pagination** | HIGH | `invite-member` and `send-license-invitation` call `adminClient.auth.admin.listUsers()` with no filters or pagination. This fetches ALL users in the auth system. At scale (>1000 users) this will timeout, and it exposes every user's email to the function's memory. |
| 1.4 | **No automated tests** | HIGH | Zero test files exist. No unit, integration, or E2E tests. A compliance SaaS product cannot ship without test coverage for certificate generation, RLS policies, and financial workflows. |
| 1.5 | **Email sent from `onboarding@resend.dev`** | MEDIUM | Invitation emails use Resend's shared sandbox domain. These will be spam-filtered or rejected by enterprise mail servers. A custom verified domain is required. |
| 1.6 | **No email verification enforcement on signup** | MEDIUM | `signUp` creates a profile immediately after `auth.signUp` without waiting for email confirmation. An attacker can create accounts with any email and have a valid profile. Auto-confirm appears disabled, but the profile is created regardless. |
| 1.7 | **`/onboarding` route is unprotected** | LOW | The onboarding page has no `ProtectedRoute` wrapper, accessible without authentication. |

---

## SECTION 2 — SECURITY AUDIT

### Authentication

| # | Issue | Severity |
|---|-------|----------|
| 2.1 | **Password policy is weak** | HIGH | Only 8 characters minimum, no complexity requirements (uppercase, number, special char). Supabase default also allows weak passwords. |
| 2.2 | **No MFA / 2FA** | MEDIUM | No multi-factor authentication available. For a compliance platform handling regulated data, MFA should be available. |
| 2.3 | **No account lockout** | MEDIUM | No rate limiting on login attempts client-side. Supabase has some built-in protection, but no explicit lockout policy is configured. |
| 2.4 | **Offline auth bypass** | CRITICAL | As noted in 1.2 — cached IndexedDB data is accessible to any user who knows the email address, with no password check. |

### Authorization

| # | Issue | Severity |
|---|-------|----------|
| 2.5 | **RLS policies are well-structured** | PASS | Role checks use `security definer` functions (`has_role`, `get_user_company_id`, `is_org_member`). No recursive policies detected. All policies scoped to `authenticated` role. |
| 2.6 | **Edge function role checks are solid** | PASS | `invite-member`, `generate-compliance-export` verify owner/admin roles server-side via `getClaims` + role lookup. |
| 2.7 | **Duplicate route definitions** | LOW | Routes like `/settings/company`, `/reports`, `/documents`, `/settings/licenses`, `/settings/suppliers` are defined twice in `App.tsx` — once as redirects and once as protected routes. The redirect versions are unreachable due to ordering, but this is confusing. |

### Input Validation

| # | Issue | Severity |
|---|-------|----------|
| 2.8 | **Gas certificate form fields lack server-side validation** | HIGH | Certificate data is inserted directly from client-side state with no schema validation in the database or edge function. Malicious clients could insert arbitrary data. |
| 2.9 | **`dangerouslySetInnerHTML` usage is safe** | PASS | Only used in `chart.tsx` for theme CSS — no user input involved. |
| 2.10 | **HTML escaping present** | PASS | `escapeHtml` utility exists and is used in enterprise contact and edge functions. |

### API Security

| # | Issue | Severity |
|---|-------|----------|
| 2.11 | **CORS is `*` on all edge functions** | HIGH | Every edge function uses `Access-Control-Allow-Origin: *`. This allows any website to call your authenticated endpoints. Should be restricted to your known domains (`f-gas-shield.lovable.app`, `ftrack.lovable.app`). |
| 2.12 | **No rate limiting on authenticated endpoints** | MEDIUM | No rate limiting on `compliance-assistant`, `create-checkout`, `check-subscription`, etc. The AI assistant could be abused for credit-draining attacks. |
| 2.13 | **Invitation token returned in API response** | MEDIUM | `invite-member` returns `invitation.token` in the response body (line 305). This token grants account access — it should not be exposed to the API caller. |

### Data Security

| # | Issue | Severity |
|---|-------|----------|
| 2.14 | **Signatures stored as base64 in text columns** | MEDIUM | Base64 PNG signatures are stored in `gas_certificates.issued_by_signature` — potentially very large strings. Should use storage buckets with signed URLs instead. |
| 2.15 | **PII logged in edge functions** | MEDIUM | `create-checkout` logs user email (line 52). `invite-member` logs email (line 82). Production logs should not contain PII. |
| 2.16 | **IndexedDB stores unencrypted PII** | HIGH | Offline cache stores full names, emails, phone numbers, site addresses, and certificate numbers in IndexedDB with no encryption. Any browser extension or XSS attack can read this data. |

### Dependency Security

| # | Issue | Severity |
|---|-------|----------|
| 2.17 | **Edge functions use different Supabase SDK versions** | LOW | `enterprise-contact` uses `@supabase/supabase-js@2.49.2`, others use `@2.57.2`. Inconsistent versions can cause subtle bugs. |

---

## SECTION 3 — PENETRATION TEST SIMULATION

| # | Attack Vector | Exploitability | Detail |
|---|--------------|----------------|--------|
| 3.1 | **Offline auth bypass** | EASY | Attacker opens app offline, enters victim's email → full read access to cached sites, equipment, gas logs. No password required. |
| 3.2 | **CORS exploitation** | MODERATE | Attacker creates malicious site that calls edge functions with a stolen JWT (e.g. from XSS). CORS `*` allows cross-origin requests from any domain. |
| 3.3 | **Subscription fraud** | MODERATE | Without webhooks, attacker could: start checkout → get session → never pay → manually call `check-subscription` repeatedly until a race condition or cache error grants access. |
| 3.4 | **User enumeration via listUsers** | LOW | Edge functions call `listUsers()` which loads all users. If an error message leaks count or existence, it enables enumeration. Currently contained but risky at scale. |
| 3.5 | **Mass assignment on gas_certificates** | MODERATE | Client can set any column on `gas_certificates` insert, including `company_id`, `engineer_id`, `certificate_number`. RLS prevents cross-company access, but an authenticated user could manipulate their own records (e.g. set a different `engineer_id`). |

---

## SECTION 4 — INFRASTRUCTURE SECURITY

| # | Item | Status |
|---|------|--------|
| 4.1 | Secrets management | PASS — All API keys stored as Supabase secrets, not in code |
| 4.2 | `.env` file exposure | PASS — Only contains public anon key and project URL |
| 4.3 | TLS | PASS — Supabase and Lovable enforce HTTPS |
| 4.4 | Database access | PASS — RLS enabled on all tables, service role restricted to edge functions |
| 4.5 | **No Stripe webhook signature verification** | CRITICAL — No webhook endpoint exists at all |
| 4.6 | **No backup/disaster recovery strategy** | HIGH — No documented backup policy. Supabase provides daily backups on paid plans but no point-in-time recovery configured |

---

## SECTION 5 — DATA PROTECTION COMPLIANCE (GDPR)

| # | Issue | Severity |
|---|-------|----------|
| 5.1 | **No user data deletion capability** | HIGH | No "delete my account" or data erasure workflow exists. GDPR Article 17 (Right to Erasure) requires this. |
| 5.2 | **No data export capability for users** | HIGH | No "download my data" feature. GDPR Article 20 (Right to Data Portability) requires this. |
| 5.3 | **No data retention policy** | MEDIUM | Gas certificates, inspection records, and audit logs have no expiry or archival policy. Records accumulate indefinitely. |
| 5.4 | **Audit logging exists** | PASS | `audit_log` table with `log_audit_event` function tracks security-sensitive operations. |
| 5.5 | **Cookie consent banner exists** | PASS | `CookieConsentBanner` component present. |
| 5.6 | **Privacy policy page exists** | PASS | `/privacy` route exists. |
| 5.7 | **PII in IndexedDB without consent** | MEDIUM | Offline caching stores PII locally without explicit user consent for local storage. |

---

## SECTION 6 — PERFORMANCE AND SCALABILITY

| # | Issue | Severity |
|---|-------|----------|
| 6.1 | **`listUsers()` will not scale** | HIGH | Fetches all auth users on every invite. O(n) scan. Will fail at ~10,000 users. Should use `getUserByEmail()` or similar filtered query. |
| 6.2 | **No database indexes visible** | MEDIUM | Primary keys and foreign keys are indexed by default, but no custom indexes for common query patterns (e.g. `gas_certificates` by `company_id + certificate_type`, `inspections` by `equipment_id + inspection_date`). |
| 6.3 | **Sync service caches up to 500 records** | LOW | `limit(500)` on inspections and gas movements in `cacheCompanyData`. Larger companies will have incomplete offline data. |
| 6.4 | **No caching strategy** | MEDIUM | React Query is used but with default staleTime. No CDN caching headers on edge functions. |
| 6.5 | **QueryClient has no custom config** | LOW | `new QueryClient()` with defaults — no retry logic, stale time, or error boundaries configured. |

---

## SECTION 7 — OPERATIONS & DEVOPS

| # | Issue | Severity |
|---|-------|----------|
| 7.1 | **No automated tests** | CRITICAL | Zero test files. No CI testing pipeline. |
| 7.2 | **No CI/CD pipeline** | HIGH | No GitHub Actions, no automated deployments beyond Lovable's built-in publish. |
| 7.3 | **No error tracking** | HIGH | No Sentry, LogRocket, or equivalent. Production errors will be invisible. |
| 7.4 | **No health check endpoints** | MEDIUM | No way to monitor if edge functions are operational. |
| 7.5 | **No monitoring or alerting** | HIGH | No uptime monitoring, no alerts for failed payments, expired certificates, or system errors. |
| 7.6 | **Console logging in production** | LOW | Edge functions use `console.log` extensively. Fine for Supabase logs but no structured logging or log levels. |

---

## SECTION 8 — FINAL RISK REPORT

### Critical Issues (4)
1. No Stripe webhook handler — subscriptions cannot be reliably managed
2. Offline login has no password verification — data exposure risk
3. No automated tests — no confidence in correctness
4. PII stored unencrypted in IndexedDB — data breach risk

### High Risk Issues (8)
1. `listUsers()` without pagination — will break at scale
2. CORS `*` on all edge functions — cross-origin attack surface
3. No user data deletion (GDPR Article 17)
4. No user data export (GDPR Article 20)
5. No error tracking in production
6. No CI/CD pipeline
7. No monitoring or alerting
8. Weak password policy (8 chars, no complexity)

### Medium Risk Issues (10)
1. No MFA capability
2. No rate limiting on authenticated endpoints
3. Invitation token exposed in API response
4. Base64 signatures stored in text columns
5. PII logged in edge functions
6. Email sent from sandbox domain
7. No data retention policy
8. No database performance indexes
9. No caching strategy
10. PII in IndexedDB without explicit consent

### Low Risk Issues (5)
1. `/onboarding` unprotected route
2. Duplicate route definitions in App.tsx
3. Inconsistent Supabase SDK versions in edge functions
4. Sync service 500-record limit
5. QueryClient with default config

---

## Recommended Priority Fixes

**Phase 1 — Security Blockers (before any customer use)**
1. Add Stripe webhook handler with signature verification
2. Add password verification to offline login (or remove offline mode)
3. Restrict CORS to known domains
4. Replace `listUsers()` with `getUserByEmail()`
5. Stop logging PII in edge functions
6. Remove invitation token from API response body

**Phase 2 — Compliance (before commercial launch)**
1. Add user account deletion workflow
2. Add user data export capability
3. Add data retention policy documentation
4. Encrypt or remove PII from IndexedDB
5. Configure a verified email domain for Resend
6. Strengthen password requirements

**Phase 3 — Operational Readiness**
1. Add error tracking (Sentry)
2. Create E2E test suite for certificate generation and auth flows
3. Add CI/CD pipeline with automated testing
4. Add monitoring and alerting
5. Add database indexes for common queries

**Estimated Effort**: 4-6 weeks of focused engineering to reach production-grade readiness, with Phase 1 requiring approximately 1-2 weeks.

---

## Verdict

**The application is NOT ready for:**
- Production deployment
- Enterprise customer use
- External penetration testing
- Commercial SaaS launch

The core product functionality (compliance workflows, certificate generation, multi-tenant architecture, RLS security) is well-built. However, the missing Stripe webhook, offline auth bypass, CORS misconfiguration, and absence of GDPR data rights features represent blocking issues that must be resolved before any commercial release.

