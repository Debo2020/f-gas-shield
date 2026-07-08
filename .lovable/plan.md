
# FTrack Hybrid Delivery: Web PWA (Admin/Billing) + Free Native Mobile (Engineers)

## The Model in One Diagram

```text
                    ┌─────────────────────────────┐
                    │   Lovable Cloud (Supabase)  │
                    │   Single backend · RLS · Fn │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼──────────┐   ┌───────────▼──────────┐   ┌───────────▼───────────┐
│  ftrack.uk       │   │  Installable Desktop │   │  FTrack Mobile        │
│  Marketing +     │   │  PWA (same URL,      │   │  iOS + Android        │
│  Signup +        │   │  "Install app")      │   │  FREE download        │
│  Stripe Checkout │   │  Owners / Managers / │   │  Engineers only       │
│                  │   │  Admin / Stores      │   │  Requires license     │
└──────────────────┘   └──────────────────────┘   └───────────────────────┘
     PUBLIC              PAID (Stripe seat)          FREE (seat consumed)
```

**One codebase, one backend, one billing system (Stripe). No IAP. No 30% Apple/Google cut.**

---

## Customer Journey

1. **Discover** → visits `ftrack.uk` (marketing site, unchanged)
2. **Sign up** → creates company account, becomes Owner
3. **Subscribe** → chooses tier on Stripe Checkout (£X per licence/month, min 1 seat = the Owner)
4. **Install desktop app** → browser prompt "Install FTrack" → PWA installs to Windows/Mac dock
5. **Add seats** → Owner buys additional licences in Stripe portal (quantity ↑)
6. **Invite team** → assigns licence to email → engineer receives email with:
   - App Store badge (iOS)
   - Google Play badge (Android)
   - "Already have the app? Open invite" deep link
7. **Engineer installs free app** → signs in with invited email → licence auto-attaches → full mobile access
8. **Owner controls everything** → revoke licence = engineer's app shows "Access removed" on next sync

---

## Roles & Platform Access

| Role | Desktop PWA | Mobile Native | Consumes Licence? |
|---|---|---|---|
| Owner | ✅ Full + Billing | ✅ (rare, allowed) | ✅ 1 seat (auto) |
| Manager | ✅ Full (no billing) | ✅ Read + approve | ✅ 1 seat |
| Admin | ✅ Ops + reports | ⚠️ Limited | ✅ 1 seat |
| Stores Manager | ✅ Gas stores + supplier | ✅ Stock issuance | ✅ 1 seat |
| Engineer | ⚠️ Read-only web fallback | ✅ **Primary** | ✅ 1 seat |
| Client User | ⚠️ Portal only | ❌ | Separate £20 add-on |
| Platform Admin (FTrack staff) | ✅ Back-office | ❌ | Not billable |

**Rule enforced everywhere**: any authenticated user without an `active` row in `user_licenses` sees the existing `LicenseBlockedPage` — on web AND in the mobile app.

---

## Billing — Stripe Only, Web Only

- **Where**: `ftrack.uk` only. Mobile app **never** shows prices or a "Buy" button (App Store policy compliant because we sell no digital goods in-app; it's a business tool for licensed users, same category as Slack, Salesforce, Xero).
- **In mobile app**: if Owner is signed in and tries to add seats → deep-link out to `customer-portal` via `@capacitor/browser` (in-app Safari/Custom Tab). No External Link Entitlement needed because we don't sell consumer digital content.
- **Stripe products**: existing tiers unchanged. `quantity` on the subscription line = licence count. Existing `update-license-count` edge function already handles this.
- **No RevenueCat, no StoreKit, no Play Billing.** ~£0 additional infra.

---

## What Needs Building

### Phase 1 — Desktop PWA polish (1 week)
- Add proper web app manifest (`display: "standalone"`, icons, theme) — manifest-only, no service worker unless offline is explicitly requested later
- Add "Install FTrack" banner for Owner/Manager on desktop viewports
- SEO title/meta already present — no changes

### Phase 2 — Native mobile shell (2 weeks)
- `npx cap add ios && npx cap add android`
- Wire native plugins (already spec'd previously): `@capacitor/camera`, `@capacitor-mlkit/barcode-scanning`, `@capacitor/geolocation`, `@capacitor/filesystem`, `@capacitor/push-notifications`, `@aparajita/capacitor-biometric-auth`, `@capacitor/browser`, `@capacitor/share`, `@capacitor/haptics`
- Add `useIsNativeApp()` hook using `Capacitor.isNativePlatform()`
- Extend `ProtectedRoute` with `platform?: 'native' | 'web' | 'both'` prop
- Hide from mobile nav: Team management, Licences, Billing, Suppliers admin, Platform admin, Reports (view-only allowed), Client portal admin
- Show as primary on mobile: Dashboard (engineer view), Inspections wizard, QR quick-scan, Gas movements, My gas log, Certificates, Compliance AI
- Sign in with Apple (mandatory alongside Google/email for App Store approval)

### Phase 3 — Licence enforcement on mobile (0.5 week)
- Existing `hasActiveLicense` check in `useAuth` already gates routes
- On app launch and every foreground event: re-run `check-subscription` + licence check → if revoked, sign out and show "Your licence has been removed by your administrator"
- Cache last-known licence state encrypted (existing AES-GCM) for offline use, expires after 7 days

### Phase 4 — Push + Deep Links (1.5 weeks)
- `device_tokens` table + `send-push` edge function
- Triggers: leak-check due, invite accepted (notify Owner), licence assigned (notify engineer), overdue inspection, gas cylinder alerts
- Universal Links (iOS) + App Links (Android) for `ftrack.uk/invite/:token` and `ftrack.uk/accept-license` → opens app directly if installed

### Phase 5 — Store submission (1 week + review time)
- **iOS**: $99/yr Apple Developer, App Store Connect listing. Position as "Business/Productivity — requires FTrack company account". Privacy Manifest + nutrition labels.
- **Android**: $25 one-off Google Play. Data safety form. Closed testing → production.
- Store descriptions must state clearly: "This app requires an active FTrack subscription purchased at ftrack.uk. Free to download for licensed users."

### Phase 6 — Owner controls polish (parallel, 0.5 week)
- Licence page: "Revoke access" button now also invalidates push tokens and forces sign-out on next mobile launch
- New Owner-only view: "Active devices" per user (from `device_tokens`) with "Sign out this device" action
- Audit log entry for every licence assign/revoke and device sign-out (already have `audit_log` table)

**Total: ~6 weeks to TestFlight/Play Closed, +1–2 weeks Apple review.**

---

## Technical Details (for the developer)

- **No fork.** One React repo, `Capacitor.getPlatform()` decides render path.
- **Auth**: Supabase auth unchanged. OAuth callback via Universal Links: `redirect_uri: 'https://ftrack.uk/~oauth/callback'` for both web and native.
- **Stripe on mobile**: never call `create-checkout` from native. Only opens `customer-portal` URL in in-app browser (Owner only).
- **Offline** on mobile: existing Dexie + `useOfflineData` + `sync-service` already work in WebView. Extend to trigger sync on `App.addListener('appStateChange', {isActive: true} → sync)`.
- **Licence revocation propagation**: mobile app polls `check-subscription` on launch/foreground + Supabase realtime channel on `user_licenses` filtered by `user_id`. Immediate sign-out on `status != 'active'`.
- **No new billing_source column, no IAP receipt validation, no RevenueCat.** Everything is Stripe seat quantity.
- **Env**: same `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` for all three surfaces.

---

## What This Model Rules Out (intentional)

- ❌ Solo engineer buying a personal subscription from within the mobile app (would require IAP, 30% cut, RevenueCat). If you want this later, it's an add-on project.
- ❌ Consumer/B2C purchases through the app store.
- ❌ Free tier accessible without a company account.

---

## Open Questions Before Build

1. **Engineer web fallback** — should engineers be able to sign in to the PWA at all (e.g. lost phone), or is mobile-only for the Engineer role?
2. **Desktop PWA install requirement** — mandatory ("please install" banner) or optional (works in browser too)?
3. **Sign in with Apple** — confirm we add this alongside Google/email (Apple requires it if Google is offered on iOS)?
4. **iPad** — universal iOS binary (Manager iPad use case) or iPhone-only to start?
5. **App name in stores** — "FTrack" or "FTrack — F-Gas Compliance"?
