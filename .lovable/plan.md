
## What I found
- The checkout backend itself is working (recent logs show `Checkout session created` successfully).
- Your browser requests are failing before completion with `Failed to fetch` for both `create-checkout` and `check-subscription`.
- Root cause is CORS allowlisting drift:
  - Current CORS helper allows `*.lovable.app` preview pattern and a couple fixed domains.
  - Your active origins include:
    - `https://0b33a0ab-...lovableproject.com` (preview)
    - `https://ftrack.uk` (published/custom domain)
  - These are not currently allowed, so browser blocks function responses.

## Approved approach (strict allowlist)
You selected:
- Failure scope: **Both preview + published**
- CORS mode: **Strict allowlist**

## Implementation plan
1. **Update shared CORS helper (`supabase/functions/_shared/cors.ts`)**
   - Extend strict allowlist to include:
     - `*.lovableproject.com` preview domains
     - configured production/custom app origin (from `APP_URL` secret when present)
     - existing fixed domains and localhost
   - Keep explicit origin matching (no wildcard `*`).
2. **Improve CORS response headers**
   - Return consistent headers for all responses (OPTIONS + success + errors):
     - `Access-Control-Allow-Origin` (matched origin only)
     - `Access-Control-Allow-Headers` (existing full list)
     - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
     - `Vary: Origin`
3. **No function logic changes needed**
   - `create-checkout` and `check-subscription` already import `getCorsHeaders`, so fix propagates automatically.
4. **Verification**
   - Test checkout flow end-to-end in:
     - preview URL (`lovableproject.com`)
     - published/custom domain (`ftrack.uk` / published app)
   - Confirm:
     - no `Failed to fetch`
     - checkout URL returned/opened
     - subscription refresh call succeeds after payment/cancel.

## Technical details
```text
Current mismatch:
Allowed: f-gas-shield.lovable.app, ftrack.lovable.app, *.lovable.app previews
Actual:  *.lovableproject.com preview + ftrack.uk custom domain

Effect:
Browser CORS block -> fetch throws -> UI toast: "Failed to start checkout"
even though Stripe/session code is valid.
```
