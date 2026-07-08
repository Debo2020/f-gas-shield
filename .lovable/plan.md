# FTrack Hybrid Architecture — Final Decisions & Build Plan

## Confirmed Answers

| # | Question | Decision |
|---|---|---|
| 1 | Engineer web fallback | ✅ Engineers **can** sign in to the PWA (read-only + limited actions where sensible; primary UX stays mobile) |
| 2 | Desktop PWA install requirement | ✅ **Mandatory** — persistent "Install FTrack" banner for Owner / Manager / Office roles until installed (dismissible per-session, re-prompts next login) |
| 3 | Sign in with Apple | ✅ Add alongside Google + email/password (required by App Store since Google is offered) |
| 4 | iPad support | ✅ **Universal iOS binary** — single build runs on iPhone + iPad, layout adapts for Manager iPad workflows |
| 5 | App store name | ✅ **"FTrack — F-Gas Compliance"** (subtitle: "UK F-Gas logbook & compliance") |

---

## Locked Architecture (recap)

- **One codebase**, one backend (Lovable Cloud), one billing system (Stripe, web-only).
- **Web (ftrack.uk)** — sign-up, subscription purchase, seat management, PWA for Admin/Manager/Office; engineer fallback allowed.
- **Native mobile (iOS Universal + Android)** — free download, licence-gated, no IAP, no prices shown. Opens Stripe Customer Portal via in-app browser for any billing action.
- Universal Links / App Links on `ftrack.uk/invite/:token` and `ftrack.uk/accept-license`.

---

## Build Phases (revised with decisions)

### Phase 1 — Desktop PWA polish + mandatory install prompt (Week 1)
- Manifest audit: `display: standalone`, correct icons (192/512/maskable), theme colour, `id`, `scope`.
- **New:** `<InstallPrompt />` component — detects `beforeinstallprompt`, shows persistent banner for Owner/Manager/Office roles when not installed. iOS Safari fallback = instructional modal ("Share → Add to Home Screen"). Engineers signing in on web get a soft prompt only.
- Track install state in `profiles.pwa_installed_at` for analytics.

### Phase 2 — Native shell (Weeks 2–4)
- `npx cap add ios android`, Capacitor config (appName `FTrack — F-Gas Compliance`, appId `uk.ftrack.app`).
- **iPad universal**: enable iPhone + iPad device family in Xcode target; verify responsive breakpoints ≥768px for Manager screens (dashboards, approvals, gas logs).
- Plugins: Camera, Barcode Scanner, Geolocation, Push Notifications, Biometrics, Browser (for Stripe portal), Share, Haptics, App (state/deep-links).
- `useIsNativeApp()` hook + `usePlatform()` (web / ios / android / ipad).
- `ProtectedRoute` gains `platform` prop; role+platform matrix enforced.
- Engineer web fallback: allow sign-in, render read-only Systems/Logs, hide edit CTAs, banner "For full features install the FTrack mobile app" with store links.

### Phase 3 — Licence enforcement + Apple Sign-In (Weeks 5–6)
- App-launch + foreground: re-run `check-subscription`, cache encrypted result (Capacitor Preferences + existing AES-GCM helper) for offline grace (72h).
- **Sign in with Apple**: enable via Lovable Cloud managed Apple provider (web + native). Add Apple button to `/auth` and native login screen. Configure Universal Link callback `ftrack.uk/~oauth/callback`.
- Revoke flow: on `licence_revoked` push, clear cache, force sign-out, show "Access removed by admin".

### Phase 4 — Push + Deep Links (Weeks 7–8)
- `device_tokens` table (user_id, token, platform, last_seen).
- Edge function `send-push` (APNs + FCM via Firebase Admin).
- Push categories: expiring certs, new assignments, licence changes, ticket updates.
- Universal Links (`apple-app-site-association`) + App Links (`assetlinks.json`) served from `ftrack.uk/.well-known/`.

### Phase 5 — Store submission (Weeks 9–10)
- Apple: $99 dev account, App Store Connect, TestFlight → review. Data Safety, Privacy Manifest, screenshots for iPhone 6.7"/6.5" **and iPad 12.9"/13"** (required for universal).
- Google: $25 one-time, closed testing → production, Data Safety form.
- Store listing name: **"FTrack — F-Gas Compliance"**; subtitle & keywords tuned for "F-Gas", "refrigerant logbook", "REFCOM".

### Phase 6 — Owner controls polish (Weeks 11–12)
- Active devices per user (revoke individual sessions/tokens).
- Licence revoke → invalidates push tokens + forces re-check.
- Audit log entries for install, licence attach/revoke, device sign-out.

---

## Deliverable for Mobile Developer

Once you approve this plan I'll switch to build mode and start with **Phase 1** (manifest + mandatory install prompt) which is fully doable in-app today. Native phases (2+) will be scaffolded here, but need to be run on your developer's Mac (`npx cap add ios`, Xcode signing, TestFlight upload) — I'll produce a `MOBILE_HANDOFF.md` with exact commands, capabilities checklist, and store metadata.

Approve to begin Phase 1.
