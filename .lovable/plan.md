# FTrack Mobile App — Native Capability Requirements

A specification for taking the existing Capacitor shell (`uk.ftrack.app`, appId already configured) from PWA-grade to a fully featured native iOS + Android app, covering push notifications, hybrid in-app purchases, camera and the full Capacitor device-API surface FTrack actually needs.

Deliverable as requested: **chat-only**, no files written.

---

## 1. Push Notifications

### 1.1 Architecture

```
                ┌─────────────────────┐
 Supabase  ───▶ │ send-push edge fn   │ ──▶ FCM HTTP v1 ──▶ Android
                │ (service account)    │ ──▶ APNs (token-auth) ──▶ iOS
                └─────────────────────┘
                          ▲
                          │ device_tokens table (user_id, token, platform, app_version, last_seen)
                          │
 Mobile app on launch ────┘  registers token via @capacitor/push-notifications
```

Two transport channels:
- **Remote push** (server-initiated) — leak-check due, certificate expiring, assigned job, sync conflict, invitation accepted.
- **Local notifications** (`@capacitor/local-notifications`) — offline reminders, scheduled leak-check alarms while offline, sync-complete confirmations.

### 1.2 iOS requirements

| Item | Value |
|---|---|
| Capability | Push Notifications + Background Modes → Remote notifications |
| Apple Developer account | Paid ($99/yr), Team ID needed |
| APNs auth | **Token-based (.p8 key)** — preferred over certificates; one key per team, never expires |
| Entitlements | `aps-environment` = `development` (debug) / `production` (release) |
| Provisioning profile | Must include Push Notifications capability |
| Info.plist | `UIBackgroundModes` = `["remote-notification", "fetch", "processing"]` |
| Permission prompt | iOS 14+ requires explicit `requestPermissions()`; show pre-prompt rationale screen first ("Get alerted when a leak check is due") |
| Provisional auth | Optional — delivers quietly without prompt; good for compliance reminders |
| Critical alerts | Requires Apple entitlement request (probably not needed for FTrack) |
| Notification Service Extension | Required only if you want rich media (images) or end-to-end-encrypted payloads — recommend deferring |
| Badge management | Server sends `badge` count; reset via `PushNotifications.removeAllDeliveredNotifications()` on app open |

### 1.3 Android requirements

| Item | Value |
|---|---|
| Service | **Firebase Cloud Messaging (FCM HTTP v1)** — legacy server key API was retired 2024 |
| Firebase project | Same `app.lovable.0b33a0ababa943f09671c6f0a67e5212` (or new `uk.ftrack.app`) |
| Files | `android/app/google-services.json` checked into repo (not secret) |
| Gradle plugin | `com.google.gms.google-services` in `android/build.gradle` |
| AndroidManifest | `POST_NOTIFICATIONS` permission (required Android 13+), `WAKE_LOCK`, `VIBRATE` |
| Permission prompt | Runtime request on Android 13+ |
| Notification channels | Must create channels at install: `compliance-alerts` (high), `sync-status` (low), `job-assignment` (default), `general` (default). Channel importance is locked once created |
| Default icon | White silhouette in `res/drawable-*/ic_stat_notification.png` (Android tints colored icons grey) |
| Default colour | FTrack brand colour in `colors.xml` |
| Data-only vs notification | Use **data messages** for FTrack so the app can decide channel + deep-link target; render via `@capacitor/local-notifications` on receive |

### 1.4 Backend (Supabase edge function)

- New table `device_tokens` (user_id, company_id, token, platform, app_version, locale, timezone, created_at, last_seen_at, revoked_at). RLS: user can only see/insert own; service role full.
- New edge function `register-device-token` — called from app on login + on token refresh.
- New edge function `send-push` — invoked from triggers/cron:
  - FCM HTTP v1 needs **Google service-account JSON** stored as `FCM_SERVICE_ACCOUNT_JSON` secret; mint OAuth2 access token per request.
  - APNs needs `.p8` key, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` as secrets; sign JWT (ES256) per batch.
- Triggers to wire up: existing leak-check cron, invitation accept, AI-credit overage warning, license assignment.
- Token cleanup: on 410/Unregistered response, mark `revoked_at`; nightly purge >90 days inactive.

### 1.5 Deep-linking from notification

- Payload includes `route` (e.g. `/equipment/{id}`, `/inspections/{id}`) and `entity_id`.
- App listens to `pushNotificationActionPerformed` → `navigate(route)`.
- Universal Links (iOS) + App Links (Android) for tapped marketing emails — requires `apple-app-site-association` + `assetlinks.json` hosted at `https://ftrack.uk/.well-known/`.

### 1.6 Secrets/config required from user

`FCM_SERVICE_ACCOUNT_JSON`, `APNS_AUTH_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` (= `uk.ftrack.app`).

---

## 2. In-App Purchases (Hybrid model)

### 2.1 Strategy

| Customer segment | Channel | Rationale |
|---|---|---|
| Solo engineer signs up inside iOS/Android app | **Native IAP** (StoreKit 2 / Google Play Billing 6+) | Apple/Google **mandate** native IAP for consumer-facing digital subscriptions consumed in-app. Web checkout for these will trigger app rejection (Guideline 3.1.1 / Play Payments policy). |
| Company owner signs up on website/desktop | **Stripe web checkout** (existing flow) | B2B SaaS purchased outside the app is explicitly **exempt** from Apple's IAP rule (Reader / Multiplatform Services exception via External Link Account Entitlement). |
| Enterprise contract | **Stripe invoicing** | Already handled by EnterpriseContact form. |
| AI credit top-ups (consumables) | Native consumable IAP in-app, Stripe metered overage on web | Mirror the per-channel model. |

A `billing_source` column on `subscribers` (`stripe` | `app_store` | `play_store`) is the source of truth — never let two providers bill the same company simultaneously.

### 2.2 iOS — StoreKit 2

| Item | Value |
|---|---|
| App Store Connect | Paid Apple Developer Program account |
| Agreements | Paid Apps Agreement signed; banking + tax forms complete |
| Products to create | `uk.ftrack.basic.monthly` (£20), `uk.ftrack.premium.monthly`, `uk.ftrack.natural_gas.monthly` (£15), `uk.ftrack.client_portal.monthly` (£20/seat), `uk.ftrack.ai_credits.1000` (consumable), `uk.ftrack.ai_credits.5000` (consumable) |
| Subscription groups | One group "FTrack Plans" containing Basic + Premium so upgrades/downgrades are atomic |
| Free trial | Configured as Introductory Offer (7-day free) — matches existing trial model |
| Capability | In-App Purchase entitlement |
| Family Sharing | Disable |
| Capacitor plugin | **`@capacitor-community/in-app-purchases`** or **RevenueCat** (`@revenuecat/purchases-capacitor`) — **strongly recommend RevenueCat** because it normalises receipts across stores and ships server-side webhooks |
| Receipt validation | App-Store Server API v2 (JWS) — done server-side in an edge function, never trust client receipts |
| Server Notifications v2 | App Store sends webhook to `app-store-webhook` edge function for renewals, refunds, billing retry, expiration, grace period |
| Promo codes | Supported via App Store Connect |
| Refund handling | Apple-issued refunds arrive via webhook → revoke entitlement |
| App Privacy | Declare "Purchases" data type in App Store Connect |

### 2.3 Android — Google Play Billing Library 6+

| Item | Value |
|---|---|
| Google Play Console | $25 one-time developer fee |
| Merchant account | Required, linked in Play Console |
| Capability | Billing permission in AndroidManifest (`com.android.vending.BILLING`) |
| Products | Same SKUs as iOS, configured as Subscriptions (with base plan + offers) or Managed Products (consumables) |
| Subscription offers | Free-trial offer attached to base plan |
| Capacitor plugin | RevenueCat (same code path as iOS) or `@capacitor-community/in-app-purchases` |
| Real-time Developer Notifications | Pub/Sub topic → Cloud Function → `play-webhook` edge function (or RevenueCat handles it) |
| License testing | Test accounts whitelisted in Play Console |
| Receipt validation | Google Play Developer API — service account JSON secret |
| Refunds | `VOIDED_PURCHASE` notification → revoke |

### 2.4 Backend reconciliation

- `subscribers` table gains `app_store_original_transaction_id`, `play_purchase_token`, `billing_source`, `auto_renew_status`, `expires_date`, `is_in_grace_period`.
- `check-subscription` edge function checks **all three** sources in order: app_store → play_store → stripe; first active wins.
- License count for Client Portal / Natural Gas addons stays in the existing addon_licenses table — IAP quantity SKUs (e.g. `uk.ftrack.natural_gas.5seats`) needed because Apple/Google don't support arbitrary quantity at checkout, or use RevenueCat's quantity feature.
- **External link entitlement (iOS)**: apply for it via App Store Connect so the web "Manage billing" link is allowed for B2B Stripe-billed users; show the link only when `billing_source = 'stripe'`.

### 2.5 Apple commission

- Standard 30% / 15% after year 1 / 15% for Small Business Program (<$1M/yr). Factor into pricing or absorb. Google identical.

### 2.6 Restore purchases UI

Mandatory App Store / Play requirement — settings screen button that calls `Purchases.restorePurchases()`.

---

## 3. Camera & Device Capabilities

All via Capacitor plugins. Current `CameraCapture.tsx` uses `navigator.mediaDevices` which is a PWA fallback; the native build should prefer Capacitor APIs for OS integration (HDR, format conversion, EXIF, permission UX).

### 3.1 Camera & media

| Capability | Plugin | iOS Info.plist key | Android permission | FTrack use |
|---|---|---|---|---|
| Photo capture | `@capacitor/camera` | `NSCameraUsageDescription` = "FTrack uses the camera to photograph F-Gas systems, nameplates, and compliance evidence." | `CAMERA` | Inspection photos, equipment evidence, gas certificates |
| Photo library pick | `@capacitor/camera` (source: PHOTOS) | `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription` | `READ_MEDIA_IMAGES` (API 33+), `READ_EXTERNAL_STORAGE` (lower) | Bulk photo upload |
| QR / barcode scan | **`@capacitor-mlkit/barcode-scanning`** (replaces deprecated html5-qrcode for native) | `NSCameraUsageDescription` | `CAMERA` | Equipment QR labels, cylinder tracking |
| Video (signature workflow capture) | `@capacitor/camera` video mode | `NSMicrophoneUsageDescription` if audio | `RECORD_AUDIO` if audio | Optional future |
| Document scanner (auto-crop) | `@capacitor-mlkit/document-scanner` | same as camera | same | Scan certificates to PDF |

### 3.2 Location

| Capability | Plugin | iOS | Android | Use |
|---|---|---|---|---|
| Foreground location | `@capacitor/geolocation` | `NSLocationWhenInUseUsageDescription` = "FTrack tags inspections with the site location for compliance audit." | `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | Auto-stamp inspection + gas movement records |
| Background location | Same plugin + custom config | `NSLocationAlwaysAndWhenInUseUsageDescription` | `ACCESS_BACKGROUND_LOCATION` | Only if route tracking — **not recommended** (Apple/Google heavy review) |

### 3.3 Storage & file system

| Capability | Plugin | Notes |
|---|---|---|
| Local file storage (offline cache for cert PDFs) | `@capacitor/filesystem` | Use `Directory.Library` (iOS) / `Directory.Data` (Android) — survives app updates |
| Encrypted preferences | `@capacitor-community/secure-storage` (Keychain / EncryptedSharedPreferences) | Store offline AES key, biometrics-gated |
| Share / export | `@capacitor/share` | Email a PDF certificate to client |
| Open external doc | `@capacitor/browser` (in-app browser) | T&Cs, help docs |

### 3.4 Biometrics & security

| Capability | Plugin | iOS | Android |
|---|---|---|---|
| Face ID / Touch ID / Fingerprint | `@capacitor-community/biometric-auth` or `@aparajita/capacitor-biometric-auth` | `NSFaceIDUsageDescription` = "Unlock FTrack with Face ID to access offline compliance data." | `USE_BIOMETRIC` |
| Device-bound key for offline encryption | Secure Enclave / StrongBox via secure storage plugin | — | — |

This replaces the password-derived PBKDF2 key in the existing offline-encryption design for native builds (faster + more secure).

### 3.5 Connectivity & background

| Capability | Plugin | Use |
|---|---|---|
| Network status | `@capacitor/network` | Offline banner, sync trigger |
| App state / lifecycle | `@capacitor/app` | Resume sync, deep-link entry |
| Background sync | `@capacitor/background-runner` (iOS) + WorkManager wrapper (Android) | Flush Dexie outbox when user is offline & app backgrounded; iOS limits to ~30s opportunistic windows |
| Background fetch | iOS `BGAppRefreshTask` / Android `WorkManager` | Pre-sync new assignments overnight |

### 3.6 Bluetooth & NFC (extended set)

| Capability | Plugin | iOS | Android | Use |
|---|---|---|---|---|
| BLE (refrigerant scales, leak detectors, e.g. Inficon Bluetooth, Wohler) | `@capacitor-community/bluetooth-le` | `NSBluetoothAlwaysUsageDescription` = "FTrack connects to Bluetooth refrigerant scales to auto-record gas weights." | `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, fine location | Auto-fill gas movement weight |
| NFC tag read | `@capawesome-team/capacitor-nfc` | `NFCReaderUsageDescription` | `NFC` | Asset tagging alternative to QR |

### 3.7 Hardware UX niceties

| Capability | Plugin |
|---|---|
| Haptic feedback | `@capacitor/haptics` |
| Status bar control | `@capacitor/status-bar` |
| Splash screen | `@capacitor/splash-screen` |
| Keyboard mgmt | `@capacitor/keyboard` |
| Screen orientation lock (landscape cert preview) | `@capacitor/screen-orientation` |
| Prevent screen sleep during inspection | `@capacitor-community/keep-awake` |
| Print (label printer) | `@bcyesil/capacitor-plugin-printer` |
| Toast / native dialogs | `@capacitor/toast`, `@capacitor/dialog` |
| Sign with finger | existing canvas-based signature pad — no plugin needed |

### 3.8 Universal / App Links

- iOS: `Associated Domains` capability + `applinks:ftrack.uk`, host `apple-app-site-association` JSON.
- Android: `intent-filter` for `android:autoVerify="true"` + host `.well-known/assetlinks.json`.
- Enables: invitation emails, license invites, magic-links, and push deep-links open directly in the app when installed.

### 3.9 Photo upload pipeline changes for native

- Capacitor camera returns `webPath` → fetch as blob → upload to Supabase Storage exactly like current web flow.
- Enable EXIF stripping server-side (privacy) — small edge function or PostgREST trigger.
- Auto-downscale to 2048px long edge before upload to keep mobile data usage manageable.

---

## 4. App Store Submission Checklist (high-level)

### iOS App Store
1. Apple Developer Program enrolment ($99/yr)
2. App Store Connect app record (bundle id `uk.ftrack.app`)
3. App icons (1024², plus all required sizes via Xcode asset catalog)
4. Launch screen storyboard
5. Privacy Manifest (`PrivacyInfo.xcprivacy`) declaring SDK reasons (camera, location, user defaults)
6. App Privacy nutrition labels (data types collected: contact info, identifiers, usage data, purchases)
7. Export compliance — declares standard HTTPS only (`ITSAppUsesNonExemptEncryption = NO` unless AES-GCM custom counts)
8. Screenshots for 6.7", 6.5", 5.5" iPhone + 12.9" iPad (if iPad supported)
9. Demo account credentials for review team
10. Age rating questionnaire (likely 4+)
11. Sign in with Apple — **mandatory** if Google sign-in is offered (we have Google → must add Apple)
12. ATT (App Tracking Transparency) — required only if you track across other apps; FTrack doesn't, declare so in nutrition labels

### Google Play
1. Play Console account ($25 one-off)
2. Internal testing track → Closed → Open → Production progression
3. Data safety form (mirrors iOS nutrition labels)
4. Target API level — currently API 34 minimum for new apps
5. Signing key managed by Play App Signing (recommended)
6. Content rating questionnaire (IARC)
7. Screenshots: phone + 7" + 10" tablet
8. Privacy policy URL (existing /privacy page)
9. Subscriptions Data form

### Both
- Marketing site / privacy / terms updated to reference the apps
- Support email + URL
- Crash reporting (Sentry or Firebase Crashlytics)
- Telemetry/analytics with explicit consent (already have cookie banner pattern — extend to native opt-in)

---

## 5. Recommended Implementation Order

1. **Foundations** — `npx cap add ios`, `npx cap add android`, app icons, splash, signing.
2. **Camera + QR** native plugins → replace `navigator.mediaDevices` path in `CameraCapture.tsx` and `EquipmentQRScanner.tsx`.
3. **Universal/App Links** so existing invitation/license/magic-link flows open in-app immediately.
4. **Push notifications** end-to-end (token registration → leak-check trigger).
5. **Biometric unlock** + Secure Enclave-backed offline key.
6. **RevenueCat IAP** with the SKU set above; hybrid `billing_source` reconciliation in `check-subscription`.
7. **Background sync** for Dexie outbox.
8. **Bluetooth scale integration** (extended — phase 2).
9. **Store submission** — TestFlight + Play Closed Testing first.

---

## 6. Open Questions Before Build

1. **RevenueCat vs raw plugin** — RevenueCat is £0 up to $2.5k/mo MTR then 1%. Strongly recommended; confirm OK.
2. **Subscription parity** — should Apple/Google prices match £20 exactly, or use Apple price tiers (Tier 20 = £19.99) to avoid odd rounding?
3. **External link entitlement** — apply now (Apple takes 1-2 weeks) so B2B Stripe customers can manage billing from inside the app?
4. **Background location** — confirm NOT needed (saves a major review headache).
5. **iPad support** — universal binary or iPhone-only?
6. **Sign in with Apple** — required to keep Google login on iOS; OK to add?

Approve this scope and I'll switch to build mode and begin with Step 1 (Capacitor platform add + camera/QR native plugins), or pick a different starting point.
