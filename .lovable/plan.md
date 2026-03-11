

## Problem

Two branding issues in the invitation emails:

1. **`send-license-invitation`** uses a **base64 data URI** for the logo (`FTRACK_LOGO_BASE64`). Most email clients (Gmail, Outlook, Yahoo) strip base64 `src` attributes, so the logo is invisible.

2. **Inconsistent branding** between the two email functions:
   - `invite-member`: dark header `#18181b`, references `https://ftrack.lovable.app/ftrack-logo.png` (works but uses published URL)
   - `send-license-invitation`: dark blue header `#0a2540`, sky blue CTA button `#0ea5e9`, completely different layout

## Solution

### 1. Fix `send-license-invitation/index.ts`
- Remove the `FTRACK_LOGO_BASE64` constant entirely
- Replace the base64 `<img>` with a hosted URL: `https://f-gas-shield.lovable.app/ftrack-logo.png` (the published URL where the asset is reliably served)
- Unify branding to match `invite-member`: same header color (`#18181b`), same CTA button color (`#18181b`), same layout structure, same font stack
- Keep license-specific content (role badge colors, license type display)

### 2. Update `invite-member/index.ts`
- Update logo URL from `https://ftrack.lovable.app/ftrack-logo.png` to `https://f-gas-shield.lovable.app/ftrack-logo.png` (the actual published domain)

### 3. Redeploy both edge functions

Both emails will share the same branded template: dark header with hosted logo, consistent typography, consistent button styling -- only the body copy differs.

