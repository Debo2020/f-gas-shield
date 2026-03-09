

# Phase 3 — Operational Readiness

## Summary
Four actionable changes: global error boundary with error logging to database, health-check edge function, structured error logging from edge functions, and a simple admin system status widget on the dashboard.

Note: CI/CD pipelines and E2E test frameworks are outside Lovable's scope. Database indexes were already added in Phase 1.

---

## 1. Error Boundary + Error Logging Table

**Database migration:**
- Create `error_logs` table: `id`, `user_id` (nullable), `company_id` (nullable), `error_message`, `error_stack`, `component_name`, `url`, `user_agent`, `metadata` (jsonb), `created_at`
- RLS: service-role-only insert (via edge function), admins can SELECT for their company
- Add index on `created_at` and `company_id`

**New edge function `supabase/functions/log-error/index.ts`:**
- Accepts `{ message, stack, component, url, userAgent, metadata }` 
- Inserts into `error_logs` using service role (bypasses RLS)
- Uses restricted CORS from `_shared/cors.ts`

**New component `src/components/ErrorBoundary.tsx`:**
- React class component with `componentDidCatch`
- POSTs error details to `log-error` edge function
- Renders a friendly fallback UI with "Try Again" button

**Wire into `src/App.tsx`:**
- Wrap the entire app tree with `<ErrorBoundary>`

---

## 2. Health Check Edge Function

**New edge function `supabase/functions/health-check/index.ts`:**
- Pings the database with a simple `SELECT 1`
- Returns `{ status: "ok", timestamp, db: "connected" }` or error state
- No auth required, uses restricted CORS
- Add to `supabase/config.toml` with `verify_jwt = false`

---

## 3. Admin System Status Widget

**New component `src/components/dashboard/SystemStatusWidget.tsx`:**
- Only rendered for users with `owner` or `admin` role
- Calls health-check endpoint on mount
- Shows recent error count (last 24h) from `error_logs` table query
- Displays system status indicator (green/yellow/red)

**Update `src/pages/Dashboard.tsx`:**
- Import and render `SystemStatusWidget` for admin users

---

## 4. Structured Edge Function Error Logging

**Update `supabase/functions/_shared/cors.ts`** (add a logger utility):
- Add `logError(context, error)` helper that writes structured JSON to `console.error` with `{ timestamp, context, message, stack }` — no PII

**Apply to all edge functions:**
- Replace bare `console.error` calls with the structured logger

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/ErrorBoundary.tsx` | New — global error boundary |
| `src/App.tsx` | Wrap app with ErrorBoundary |
| `supabase/functions/log-error/index.ts` | New — error logging endpoint |
| `supabase/functions/health-check/index.ts` | New — health check endpoint |
| `src/components/dashboard/SystemStatusWidget.tsx` | New — admin status widget |
| `src/pages/Dashboard.tsx` | Add SystemStatusWidget |
| `supabase/functions/_shared/cors.ts` | Add structured logger utility |
| `supabase/config.toml` | Add new function entries |
| Database migration | Create `error_logs` table |

