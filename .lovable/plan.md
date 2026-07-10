## Problem

On the published site (`www.ftrack.uk`) clicking **Continue with Google** shows an error containing "404 Oops! Page not found" instead of completing sign-in. Sign-in works in preview.

The Lovable OAuth proxy at `/~oauth/initiate` and `/~oauth/callback` on `www.ftrack.uk` responds correctly (verified — it 302s to `oauth.lovable.app`). So the 404 is being returned *inside* the OAuth broker flow (most likely a redirect or token-exchange step whose expected URL is not routable on the custom domain, or the Google provider redirect allow-list is not honouring the ftrack.uk origin at the broker).

## Plan

### 1. Reproduce and capture the exact failure

Drive Playwright against `https://www.ftrack.uk/auth` in headless Chromium:
- Click **Continue with Google**, follow the popup / redirect.
- Capture the full network waterfall (all `~oauth`, `oauth.lovable.app`, `accounts.google.com`, `supabase.co/auth/v1` requests), the request that returns 404, and the HTML body that is being surfaced as the on-card error.
- Screenshot each step.

Also verify from the shell:
- `curl -I https://www.ftrack.uk/~oauth/callback?...` with a realistic state/code
- `curl` the auth discovery + Google provider metadata on the Supabase issuer
- Compare against the same probe on `f-gas-shield.lovable.app`

### 2. Fix based on what the trace shows

Most likely one of:

- **a. Broker post-back URL not registered for `www.ftrack.uk`.** Re-run `supabase--configure_social_auth` for `["google", "apple"]` so the current canonical Site URL / redirect allow-list is re-declared, then re-test.
- **b. Wrapper (`@lovable.dev/cloud-auth-js`) resolves to a path that 404s on custom domain.** Switch `redirect_uri` from bare `window.location.origin` to an explicit public callback route (`${window.location.origin}/auth/callback`) that renders a tiny "signing you in…" page and lets `onAuthStateChange` hydrate the session before navigating. This avoids relying on the SPA fallback catching the origin root with hash fragments.
- **c. Custom-domain proxy edge case.** If (a) and (b) don't resolve it, temporarily route the OAuth click through `https://f-gas-shield.lovable.app/auth` (open in a new tab), which is guaranteed to hit the proxy on the Lovable subdomain. This is a diagnostic step, not a shipped workaround.

### 3. Verify

- Playwright end-to-end sign-in on `www.ftrack.uk` completes and lands on `/dashboard` (or `/setup-company` for new accounts).
- Repeat on `ftrack.uk` (root) and `f-gas-shield.lovable.app` (both should still work).
- Apple button unchanged behaviour on all three origins.

### Files likely touched

- `src/components/auth/OAuthButtons.tsx` — if we adopt the explicit `/auth/callback` redirect URI.
- Possibly a new `src/pages/AuthCallback.tsx` + a public route entry in `src/App.tsx`.
- No changes to `src/integrations/lovable/index.ts` (auto-generated).

### Out of scope

- Any change to Apple sign-in, email/password, offline auth, license enforcement, or Capacitor iOS OAuth — those keep working.
