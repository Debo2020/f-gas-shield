

## Fix: Health-Check Endpoint Info Leakage

**File:** `supabase/functions/health-check/index.ts`

### Changes
1. Remove raw `error.message` from the 503 response body (the `detail` field)
2. Log the error server-side via `console.error` instead
3. Same treatment for the 500 catch block — strip `detail`, log internally

This is a single-file edit with no dependencies.

