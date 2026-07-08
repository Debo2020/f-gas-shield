# FTrack Mobile Developer Handoff

**App name (stores):** FTrack — F-Gas Compliance
**App ID:** `uk.ftrack.app`
**Universal iOS binary** (iPhone + iPad) · **Android** phone + tablet
**Backend:** Lovable Cloud (Supabase managed) — no changes required native-side
**Billing:** Stripe, **web-only**. Native apps must never surface prices or in-app purchases.

---

## 1. Local setup

```bash
git pull                       # from your GitHub fork
npm install
npx cap add ios
npx cap add android
npm run build
npx cap sync
```

After every `git pull` from Lovable:

```bash
npm install && npm run build && npx cap sync
```

Open native projects:

```bash
npx cap open ios       # requires macOS + Xcode 15+
npx cap open android   # requires Android Studio
```

## 2. Capacitor config

Already in `capacitor.config.ts`:

- `appId: uk.ftrack.app`
- `appName: FTrack — F-Gas Compliance`
- Push presentation: badge, sound, alert

## 3. iOS universal binary (iPad support)

In Xcode → target **App** → **General**:

1. **Deployment Info → Devices:** `iPhone, iPad` (set `TARGETED_DEVICE_FAMILY = 1,2`)
2. **Deployment Target:** iOS 15.0 or later
3. **iPad orientations:** Portrait, Landscape Left, Landscape Right (Manager workflow)
4. **iPhone orientations:** Portrait only (Engineer workflow)

Test on iPad Pro 12.9" / iPad Air simulator — the web layout already responds ≥768px.

## 4. Installed Capacitor plugins

| Plugin | Purpose |
| --- | --- |
| `@capacitor/app` | Deep links, app state, back-button |
| `@capacitor/browser` | In-app Safari/Chrome for Stripe Customer Portal |
| `@capacitor/camera` | Photo capture for inspections & documents |
| `@capacitor/barcode-scanner` | Equipment QR / cylinder tracking |
| `@capacitor/geolocation` | Site check-in location tag |
| `@capacitor/haptics` | Feedback on scan / save |
| `@capacitor/preferences` | Encrypted license cache (72h offline grace) |
| `@capacitor/push-notifications` | Expiry alerts, license changes |
| `@capacitor/share` | Share PDFs / reports |

## 5. Required native capabilities

**iOS (Xcode → Signing & Capabilities):**
- Push Notifications
- Background Modes → Remote notifications
- Associated Domains → `applinks:ftrack.uk`, `applinks:www.ftrack.uk`
- Sign in with Apple

**iOS Info.plist strings:**
- `NSCameraUsageDescription` — "FTrack uses the camera to capture inspection photos and scan equipment QR codes."
- `NSPhotoLibraryUsageDescription` — "FTrack saves compliance photos to your library."
- `NSLocationWhenInUseUsageDescription` — "FTrack tags site inspections with your location for the compliance log."

**Android (`android/app/src/main/AndroidManifest.xml`):**
- `CAMERA`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, `INTERNET`
- Intent filter for `https://ftrack.uk/invite/*` and `/accept-license`

## 6. Deep links / Universal Links (Phase 4)

Host these files at `https://ftrack.uk/.well-known/`:
- `apple-app-site-association` — bundle: `TEAMID.uk.ftrack.app`, paths `/invite/*`, `/accept-license`
- `assetlinks.json` — package: `uk.ftrack.app`, SHA-256 fingerprint from Play signing key

## 7. Store metadata

**App Store Connect:**
- Name: FTrack — F-Gas Compliance
- Subtitle: UK F-Gas logbook & compliance
- Keywords: f-gas, refrigerant, REFCOM, HVAC, compliance, logbook, engineer
- Screenshots required: iPhone 6.7", iPhone 6.5", iPad Pro 12.9" (both 2nd & 6th gen)
- Data Safety: Camera, Location, Contact info (email), User content — all used for app functionality, none for tracking
- Privacy Manifest (`PrivacyInfo.xcprivacy`): declare `NSPrivacyAccessedAPICategoryUserDefaults`, `NSPrivacyAccessedAPICategoryDiskSpace`

**Google Play Console:**
- Category: Business
- Data Safety form: same disclosures as iOS
- Content rating: Everyone
- Target audience: 18+ (professional tool)

## 8. Auth

- **Managed Cloud Auth** — no keys required native-side
- **Sign in with Apple** required (App Store rule since Google is offered)
- OAuth callback: `https://ftrack.uk/~oauth/callback` (handled by Lovable's OAuth broker)
- Native sign-in uses the same `lovable.auth.signInWithOAuth("google" | "apple")` flow

## 9. What NOT to do

- ❌ No in-app purchases / StoreKit / Google Play Billing — billing is web-only via Stripe
- ❌ No prices, plans, or subscription UI in the app — Owner opens Stripe Customer Portal via `@capacitor/browser`
- ❌ No custom auth flow — always use `lovable.auth.signInWithOAuth`
- ❌ Do not edit `src/integrations/supabase/client.ts` or `types.ts` — auto-generated
- ❌ Do not add new npm packages that duplicate existing plugins

## 10. Runtime platform detection

Use `usePlatform()` / `useIsNativeApp()` from `src/hooks/usePlatform.ts` to branch UI. `Capacitor.isNativePlatform()` is the source of truth.

## 11. Checklist before TestFlight / internal testing

- [ ] `npx cap sync` clean
- [ ] Universal iOS: launches on iPhone 15 sim + iPad Pro 12.9" sim
- [ ] Camera + QR scan works on real device
- [ ] Deep link `https://ftrack.uk/invite/TEST` opens app
- [ ] Push token registers (visible in `device_tokens` table after Phase 4)
- [ ] Sign in with Apple, Google, and email/password all succeed
- [ ] Stripe Customer Portal opens in `@capacitor/browser`, returns cleanly
- [ ] Engineer role: no billing UI visible
- [ ] Offline: cached license honoured for 72h, then forces re-check
