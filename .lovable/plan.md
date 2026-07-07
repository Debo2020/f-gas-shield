# FTrack Platform Split: Mobile-Native + Desktop-Web

## Recommended Structure

**One backend, two frontends, one shared UI package.**

```text
┌─────────────────────────────────────────────┐
│   Lovable Cloud (Supabase) — SINGLE source  │
│   Auth · Postgres · RLS · Storage · Edge Fns│
└──────────────┬──────────────────────────────┘
               │  same anon key, same RLS
   ┌───────────┴────────────┐
   │                        │
┌──▼──────────────┐   ┌─────▼───────────────┐
│ MOBILE (native) │   │ DESKTOP (web)       │
│ iOS + Android   │   │ ftrack.uk           │
│ Capacitor shell │   │ current Lovable app │
│ Engineer-first  │   │ Manager/Admin-first │
│ Camera, QR,     │   │ Reports, Billing,   │
│ Offline, Push,  │   │ Team, Clients,      │
│ IAP (solo)      │   │ Stripe, Analytics   │
└─────────────────┘   └─────────────────────┘
```

Both frontends share the current React codebase; role + platform detection decide which routes render.

---

## Why this structure (not two separate apps)

- **One RLS model, one audit log, one licence table.** Two codebases = double the compliance risk for F-Gas regulation.
- **Engineers move between site (mobile) and office (desktop) daily.** Same login, same data, no sync gap.
- **You already have `capacitor.config.ts`, offline Dexie, QR scanning, camera capture.** ~70% of native work is done.
- **Stripe stays desktop-only for B2B.** Mobile gets IAP only for solo-engineer plan (avoids Apple's 30% on team seats).

---

## Split of Responsibilities

| Area | Mobile Native | Desktop Web |
|---|---|---|
| Record inspection | ✅ Primary | ✅ View/edit |
| QR scan cylinder/system | ✅ Primary | ❌ |
| Camera capture (site photos, docs) | ✅ Primary | ⚠️ Upload only |
| Gas movements (book in/out/recover) | ✅ Primary | ✅ |
| Engineer gas log | ✅ | ✅ |
| Signatures on certificates | ✅ Primary (touch) | ⚠️ Mouse |
| Push notifications (leak-check due, invites) | ✅ | ⚠️ Browser only |
| Offline mode | ✅ Full | ⚠️ Read-only |
| Biometric login | ✅ | ❌ |
| Reports / PDF export | View + share | ✅ Primary |
| Team / licence management | View only | ✅ Primary |
| Clients & sites CRUD | View + limited edit | ✅ Primary |
| Billing / Stripe portal | Deep-link to browser | ✅ Primary |
| Platform admin | ❌ Hide | ✅ |
| Compliance AI assistant | ✅ | ✅ |
| IAP (solo engineer £X/mo) | ✅ StoreKit/Play | ❌ |
| Stripe subscriptions (teams) | ❌ (external link) | ✅ |

---

## Recommended Build Path for Your Developer

**Phase 1 — Wrap & ship (2–3 weeks)**
1. `npx cap add ios && npx cap add android` on current codebase
2. Replace hot-reload `server.url` with production `https://f-gas-shield.lovable.app` initially, then switch to bundled build
3. Add native plugins already spec'd: `@capacitor/camera`, `@capacitor-mlkit/barcode-scanning`, `@capacitor/geolocation`, `@capacitor/filesystem`, `@capacitor/push-notifications`, biometrics
4. Add `usePlatform()` hook — hides Team/Clients/Admin/Billing routes when `Capacitor.isNativePlatform()`
5. TestFlight + Play Closed Testing

**Phase 2 — Native polish (2–3 weeks)**
6. Push infrastructure: `device_tokens` table + `send-push` edge function, wire to existing triggers (leak-check, invite, AI credit, licence)
7. Universal Links / App Links so `ftrack.uk/invite/xyz` opens the app
8. Sign in with Apple (mandatory alongside Google)
9. Biometric-gated offline login using existing AES-GCM crypto

**Phase 3 — IAP (2 weeks, only if selling to solo engineers via stores)**
10. RevenueCat + `billing_source` column on `subscribers` (`stripe` | `app_store` | `play_store`)
11. `check-subscription` edge function checks all three sources
12. External Link Entitlement so B2B users can still reach Stripe portal from inside app

**Phase 4 — Desktop refinements (parallel, 1 week)**
13. Hide mobile-only nav items (QR quick-scan) on desktop
14. Promote reporting, billing, team management to primary nav

---

## Technical Details

- **No fork.** Keep one repo, one `src/`. Use `Capacitor.getPlatform()` + a `useIsNativeApp()` hook to conditionally render.
- **Shared components** already exist under `src/components/` — no restructure needed.
- **Route guards**: extend `ProtectedRoute` with `platform?: 'native' | 'web' | 'both'` prop; redirect blocked routes.
- **Auth**: `lovable.auth.signInWithOAuth('google')` works in Capacitor with `redirect_uri: 'app.lovable.0b33a...://callback'` via Universal Links. Email/password unchanged.
- **Stripe on mobile**: never call `create-checkout` from native — open `customer-portal` URL in `@capacitor/browser` (in-app Safari/Custom Tab). Apple allows this for B2B accounts with External Link Entitlement.
- **Offline**: existing Dexie + `useOfflineData` already work in WebView; just extend sync-service to run on `App.addListener('appStateChange')`.
- **Env split**: no separate env needed — same Supabase URL/anon key. Platform detection is client-side.
- **Store submissions**: iOS $99/yr, Google $25 one-off. Privacy Manifest + Data Safety forms use existing `ftrack.uk/privacy`.

---

## Commercial Structure Options

Pick one before build starts (drives IAP scope):

1. **Web-only billing** — cheapest, fastest. All plans sold on ftrack.uk. Mobile is a free companion app requiring existing login. **No IAP, no 30% Apple cut.** ← recommended if 100% of customers are companies.
2. **Hybrid** — Company plans on Stripe (web), solo-engineer plan on IAP (mobile). Adds 4–6 weeks + RevenueCat.
3. **Full IAP** — Everything through stores. Not recommended (loses Stripe features, 30% cut on team seats).

---

## Open Questions Before Handover

1. Which commercial model (1/2/3 above)?
2. iPad — universal binary or iPhone-only?
3. Any manager tasks that MUST work on mobile (approvals, licence assignment)?
4. Should platform admin ever be accessible from mobile, or web-only always?
5. Deep-link scheme — use `ftrack.uk` Universal Links only, or also custom `ftrack://` scheme?
6. Keep hot-reload from Lovable preview in dev builds, or ship fully bundled from day one?
