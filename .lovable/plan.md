## What's broken

The custom auth email hook (`supabase/functions/auth-email-hook`) is scaffolded and tries to enqueue mail into `email_send_log` / `enqueue_email`, but those tables/RPCs don't exist in this project. Result: when a new user signs up, Supabase calls our hook, the hook errors, and **no verification email is ever sent**. The domain `notify.ftrack.uk` is already verified, so once infra is in place sends will work immediately.

Google sign-up is currently not exposed anywhere in the UI — only email/password on `GetStarted` (sign up) and `Auth` (sign in).

## Plan

### 1. Provision the missing email queue infrastructure
- Run the Cloud email-infra setup (creates `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, pgmq `auth_emails` queue, `enqueue_email` RPC, `process-email-queue` cron, vault secrets).
- Redeploy `auth-email-hook` so it picks up a clean environment.
- After this, signup → hook → queue → send works end-to-end on `notify.ftrack.uk`.

No template content changes — current branded templates in `_shared/email-templates/*` are kept as-is.

### 2. Enable Google as a sign-in/sign-up method
- Enable Lovable Cloud's managed Google provider (no Google Cloud credentials needed — keeps email/password enabled too).
- Install the Lovable auth module for managed social OAuth.

### 3. Add a "Continue with Google" button
Use `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` (handles both sign-up and sign-in — first Google login auto-creates the account, no email verification needed).

- **`src/pages/GetStarted.tsx`** — add a Google button above the email form on step 1, with an "or" divider. On success it'll land on `/setup-company` via the existing post-auth redirect in `useAuth` (new user, no `company_id`).
- **`src/pages/Auth.tsx`** — add the same Google button above the sign-in form. Existing Google users land on `/dashboard`, new ones on `/setup-company`.

Note: Google sign-ups skip the company-name step in the wizard, so `SetupCompany` (already used for users without a `company_id`) becomes the place they enter company details. That page already exists and is wired up — no changes needed.

### Files touched
- `supabase/functions/auth-email-hook/index.ts` — redeploy only (no code edits unless deploy surfaces an issue)
- `src/pages/Auth.tsx` — add Google button + handler
- `src/pages/GetStarted.tsx` — add Google button + handler

### Out of scope
- Apple / other social providers (can be added later the same way)
- Email template restyling
- Changes to `SetupCompany` flow
