

# FTrack -- Complete Technical Stack Breakdown

---

## Executive Summary

FTrack is a mobile-first, multi-tenant SaaS application for UK F-Gas compliance management. It is built on a React + TypeScript frontend with Supabase (via Lovable Cloud) as the full backend, Stripe for payments, Resend for transactional email, and Plausible for analytics. The app is a PWA with offline-first capabilities using IndexedDB (Dexie). It targets small businesses and field engineers in the refrigeration/HVAC industry.

The stack is coherent, modern, and reasonably production-ready with some gaps noted below.

---

## 1. Frontend Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | React 18.3 | SPA, no SSR |
| **Language** | TypeScript 5.8 | `strictNullChecks: false`, `noImplicitAny: false` -- relaxed config |
| **Build tool** | Vite 5.4 | SWC plugin for React (`@vitejs/plugin-react-swc`) |
| **Styling** | Tailwind CSS 3.4 | With `tailwindcss-animate`, `@tailwindcss/typography` |
| **UI library** | shadcn/ui (Radix primitives) | 30+ Radix UI packages, `class-variance-authority`, `cmdk` |
| **Theme** | `next-themes` | Dark mode via class attribute |
| **State management** | React Context + TanStack Query 5 | Auth via Context, server state via React Query (5 min stale time) |
| **Routing** | React Router DOM 6.30 | Client-side routing, protected routes with license gating |
| **Forms** | React Hook Form 7.61 + `@hookform/resolvers` | Paired with Zod 3.25 for validation |
| **Validation** | Zod 3.25 | Schema-based validation |
| **Charts** | Recharts 2.15 | Used for inspection trends, dashboard visualizations |
| **PDF generation** | jsPDF 4.2 + jspdf-autotable 5 | Gas safety certificates (1,111-line PDF generator) |
| **QR codes** | `qrcode.react` (generation), `html5-qrcode` (scanning) | Equipment/cylinder asset tracking |
| **File upload** | `react-dropzone` 14.3 | Document and photo uploads |
| **Carousel** | `embla-carousel-react` 8.6 | Landing page or content sections |
| **Drawer** | `vaul` 0.9 | Mobile-friendly bottom sheets |
| **Toasts** | `sonner` 1.7 + Radix Toast | Dual toast systems (potential inconsistency) |
| **PWA** | `vite-plugin-pwa` 1.2 | Service worker with workbox, offline caching of API and assets |
| **Offline DB** | Dexie 4.3 (IndexedDB) | Caches sites, equipment, inspections, gas movements, cylinders |
| **Offline crypto** | Web Crypto API | AES-GCM encryption for PII in IndexedDB, PBKDF2 key derivation |

---

## 2. Backend Stack

| Layer | Technology | Details |
|---|---|---|
| **Runtime** | Deno (Supabase Edge Functions) | 20 edge functions deployed |
| **Database** | PostgreSQL (Supabase) | Via Lovable Cloud |
| **Auth** | Supabase Auth | Email/password, magic links for invitations |
| **API structure** | Supabase JS client + Edge Functions | Client queries tables directly via RLS; edge functions for business logic |
| **Email service** | Resend | `RESEND_API_KEY` configured, sending from `noreply@ftrack.uk` |
| **Payments** | Stripe | Checkout, webhooks (signature-verified), customer portal, metered billing |
| **AI** | Supabase Edge Function (`compliance-assistant`) | Calls AI for F-Gas compliance Q&A, credit-metered per tier |
| **Background jobs** | `onboarding-cron` edge function | Nudge emails for onboarding |
| **File storage** | Supabase Storage | 9 buckets: company-logos (public), compliance-documents, asset-photos, certificates, site-photos, equipment-photos, audit-exports, compliance-reports, invoices |
| **CORS** | Custom shared module | Whitelist of production domains + Lovable preview pattern matching |

### Edge Functions (20 total):
- **Payments**: `create-checkout`, `check-subscription`, `customer-portal`, `stripe-webhook`, `create-addon-checkout`, `check-addon`, `update-license-count`, `update-addon-license-count`
- **Team/Invites**: `invite-member`, `send-license-invitation`, `invite-client-user`
- **Compliance**: `compliance-assistant`, `generate-compliance-export`
- **Account**: `delete-account`, `export-user-data`
- **Contact**: `enterprise-contact`
- **Operations**: `log-error`, `health-check`, `onboarding-cron`

---

## 3. Database and Data Layer

| Layer | Details |
|---|---|
| **Database** | PostgreSQL via Supabase |
| **ORM** | None -- direct Supabase JS client (`supabase.from('table').select()`) |
| **Schema** | 20+ tables including: `companies`, `profiles`, `user_roles`, `user_licenses`, `team_invitations`, `sites`, `equipment`, `inspections`, `refrigerant_movements`, `refrigerant_cylinders`, `documents`, `gas_certificates`, `company_subscriptions`, `company_addons`, `addon_licenses`, `clients`, `suppliers`, `audit_log`, `activation_events`, `activation_scores`, `error_logs`, `contact_rate_limits`, `onboarding_nudges`, `trial_status`, `leak_checks`, `company_certificates`, `profile_type_config` |
| **Migrations** | 53 SQL migration files (Jan 2026 -- Mar 2026) |
| **Multi-tenancy** | Company-scoped via `company_id` + RLS policies using `get_user_company_id()` |
| **RLS** | Comprehensive -- every table has row-level security with role-based policies |
| **DB functions** | 18 security-definer functions for role checks, CO2e calculations, company creation, profile validation |
| **Triggers** | `compute_equipment_co2e`, `equipment_calculate_co2`, `update_equipment_inspection_dates`, `update_updated_at_column`, `generate_gas_certificate_number` (defined as functions, trigger bindings exist) |
| **Caching** | TanStack Query client-side (5 min stale), subscription hook has 10s global cache |
| **Offline sync** | Dexie IndexedDB with sync queue for pending mutations |

---

## 4. Infrastructure and Deployment

| Layer | Details |
|---|---|
| **Hosting** | Lovable (frontend), Supabase/Lovable Cloud (backend) |
| **Published URL** | `f-gas-shield.lovable.app` (also `ftrack.uk` custom domain indicated in CORS) |
| **CI/CD** | Lovable auto-deploy; edge functions deploy automatically |
| **Environment variables** | `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`; secrets for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `APP_URL`, `LOVABLE_API_KEY`, service role keys |
| **Containerization** | None |
| **CDN** | Lovable/Supabase infrastructure |
| **Monitoring** | `health-check` edge function (DB connectivity), `log-error` endpoint for frontend crash reports, `error_logs` table |
| **Analytics** | Plausible Analytics (privacy-friendly, loaded conditionally on cookie consent) |
| **PWA** | Full manifest, service worker with NetworkFirst for API, CacheFirst for static assets |
| **SEO** | `robots.txt`, `sitemap.xml` present |

---

## 5. Security

| Layer | Details |
|---|---|
| **Auth provider** | Supabase Auth (email/password + magic links) |
| **RBAC** | `user_roles` table with enum: `owner`, `admin`, `manager`, `engineer`, `stores_manager`, `auditor`, `read_only`. Security-definer `has_role()` function prevents RLS recursion |
| **Multi-tenant isolation** | RLS on every table scoped by `get_user_company_id()` or `is_org_member()` |
| **Organization memberships** | Separate `organization_memberships` table with role per org |
| **Token handling** | Supabase JWT sessions, auto-refresh enabled, `localStorage` persistence |
| **Invitation tokens** | 32-byte hex tokens with 7-day expiry, stored in `team_invitations` |
| **Offline auth** | Password hash verification via Web Crypto (PBKDF2 + AES-GCM for PII) |
| **Secrets** | Managed via Lovable Cloud secrets (9 configured) |
| **Stripe webhook** | Signature verification (`constructEventAsync`) |
| **CORS** | Strict origin whitelist with regex for preview domains |
| **Rate limiting** | `contact_rate_limits` table with IP hashing for enterprise contact form |
| **Input validation** | Zod on frontend, HTML escaping (`escapeHtml`) in edge functions |
| **Audit logging** | `audit_log` table with `log_audit_event()` security-definer function |
| **GDPR** | `delete-account` (Article 17), `export-user-data` (Article 20), cookie consent banner |
| **Password policy** | 12-character complex passwords (per security audit memory) |

---

## 6. Third-Party Integrations

| Service | Provider | Status |
|---|---|---|
| **Payments** | Stripe | Fully integrated -- checkout, subscriptions, webhooks, customer portal, metered AI credits |
| **Email** | Resend | Transactional emails (invitations, enterprise contact, license invitations) from `noreply@ftrack.uk` |
| **Analytics** | Plausible | Privacy-friendly, GDPR-compliant, consent-gated |
| **AI** | Lovable AI / edge function | Compliance assistant chatbot with credit metering per subscription tier |
| **Maps** | Not found | No mapping integration detected |
| **Webhooks** | Stripe webhook endpoint | Signature-verified |

---

## 7. Codebase Structure

```text
src/
├── components/
│   ├── ui/              # 50+ shadcn/ui primitives
│   ├── layout/          # AppLayout, banners
│   ├── auth/            # ProtectedRoute, LicenseBlockedPage
│   ├── landing/         # Marketing page sections
│   ├── dashboard/       # Widgets, charts
│   ├── cylinders/       # Cylinder CRUD, QR, timeline
│   ├── equipment/       # Equipment CRUD, labels, QR
│   ├── inspections/     # Inspection forms, wizard
│   ├── gas-certificates/# Certificate forms, PDF gen, previews
│   ├── gas-log/         # Gas movement tracking
│   ├── documents/       # Upload, viewer, camera
│   ├── organisation/    # Multi-tab org management
│   ├── compliance/      # AI assistant chat
│   ├── team/            # Invite, member list
│   ├── sites/           # Site CRUD
│   ├── clients/         # Client management
│   ├── onboarding/      # Setup wizard, nudges
│   ├── reports/         # Report cards
│   ├── alerts/          # Expiry alerts
│   ├── batch-upload/    # CSV batch upload
│   ├── cookies/         # Cookie consent
│   ├── company/         # Company setup forms
│   └── pricing/         # AI credit info
├── hooks/               # 12 custom hooks (auth, offline, subscriptions, etc.)
├── lib/                 # Utilities (offline DB, sync, crypto, CSV templates, storage, subscription config)
├── pages/               # 30+ route pages
├── integrations/supabase/ # Auto-generated client + types
supabase/
├── functions/           # 20 Deno edge functions
├── migrations/          # 53 SQL migration files
└── config.toml          # Function configuration
```

**Pattern**: Feature-based component organization, hooks for shared logic, lib for utilities. No formal service layer -- business logic split between edge functions and components/hooks.

---

## 8. Quality and Maintainability

| Area | Status |
|---|---|
| **Testing** | No test framework installed. No test files found. |
| **Linting** | ESLint 9 with `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint` |
| **Formatting** | No Prettier or formatter configured |
| **Type safety** | TypeScript with relaxed settings (`strictNullChecks: false`, `noImplicitAny: false`) |
| **Error boundary** | Global `ErrorBoundary` component wrapping the app |
| **Dual toast systems** | Both `sonner` and Radix Toast are installed and used -- minor inconsistency |
| **Technical debt** | Relaxed TS config masks potential null/type bugs; no automated tests; some large files (GasCertificatePDF: 1,111 lines) |

---

## 9. Production Readiness Assessment

### Production Ready
- Multi-tenant database with comprehensive RLS
- Stripe payment integration with webhook signature verification
- Authentication with role-based access control (7 roles)
- Email delivery via verified Resend domain (`ftrack.uk`)
- Offline-first PWA with encrypted local storage
- GDPR compliance (delete account, data export, cookie consent)
- Audit logging for sensitive operations
- CORS hardening
- Error reporting infrastructure
- Health check endpoint
- 53 database migrations tracking schema evolution

### Partially Implemented
- Offline sync queue exists but sync-back-to-server logic needs verification
- AI compliance assistant works but credit metering/overage billing partially coupled to Stripe metered subscriptions
- Onboarding cron function exists but scheduling mechanism (external trigger) not confirmed

### Missing / Gaps
- **No automated tests** -- zero test files, no test runner
- **No code formatter** -- no Prettier config
- **Relaxed TypeScript** -- `strictNullChecks` and `noImplicitAny` both disabled
- **No staging environment** -- single environment detected
- **No rate limiting on auth endpoints** -- only contact form has rate limiting
- **No CSP headers** -- Content Security Policy not configured
- **No uptime monitoring** -- health check exists but no external monitoring service confirmed

---

## Dependency Overview

- **53 production dependencies** (React ecosystem, Supabase, Stripe, UI, PDF, QR, charts, PWA, offline)
- **14 dev dependencies** (Vite, TypeScript, ESLint, Tailwind toolchain)
- No dependency vulnerability scanning configured

---

## Risks / Weaknesses

1. **Zero test coverage** -- highest risk; no unit, integration, or e2e tests
2. **Relaxed TypeScript** -- `strictNullChecks: false` allows runtime null errors to slip through
3. **Large monolithic files** -- GasCertificatePDF.tsx at 1,111 lines is hard to maintain
4. **Dual toast systems** -- `sonner` and Radix Toast both active; should consolidate
5. **No staging environment** -- all changes deploy directly to production
6. **No formatter** -- code style inconsistencies across contributors
7. **Offline sync reliability** -- sync queue exists but conflict resolution and retry logic needs thorough testing

---

## One-Page Summary

**What stack is this app built on?**
React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui frontend, Supabase (PostgreSQL + Auth + Storage + Edge Functions) backend, Stripe payments, Resend email, Plausible analytics. PWA with Dexie/IndexedDB offline support.

**Is the stack coherent?**
Yes. All technologies are well-matched and commonly used together. The only minor inconsistency is the dual toast library usage (sonner + Radix Toast).

**Is it scalable?**
Yes. Supabase/PostgreSQL handles multi-tenancy via RLS, edge functions scale automatically, Stripe handles payment scaling, and the PWA architecture reduces server load for field engineers.

**Is it production ready?**
Largely yes, with the critical caveat of zero automated test coverage and relaxed TypeScript strictness. The security posture (RLS, RBAC, webhook verification, GDPR, audit logs, encrypted offline storage) is strong.

**What should be changed before launch?**
1. Add automated tests (at minimum: auth flow, payment flow, invitation flow)
2. Enable `strictNullChecks` in TypeScript config
3. Add a code formatter (Prettier)
4. Consolidate to a single toast system
5. Add Content Security Policy headers
6. Set up external uptime monitoring
7. Consider a staging environment for pre-production testing

