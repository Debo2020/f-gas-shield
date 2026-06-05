# Convert FTrack to Native iOS & Android (Capacitor)

Wrap the existing React app in a Capacitor native shell. No UI, routing, Supabase, Dexie, or business logic changes. The same codebase continues to power the web app, PWA, and now the native apps.

## What changes in the project

1. **Install Capacitor packages**
   - `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`
   - `@capacitor/cli` as a dev dependency

2. **Create `capacitor.config.ts` in the project root**
   - `appId`: `app.lovable.0b33a0ababa943f09671c6f0a67e5212`
   - `appName`: `f-gas-shield`
   - `webDir`: `dist`
   - `server.url`: `https://0b33a0ab-aba9-43f0-9671-c6f0a67e5212.lovableproject.com?forceHideBadge=true`
   - `server.cleartext`: `true`
   - This enables hot-reload from the Lovable sandbox so you can iterate without rebuilding.

3. **No code changes** to React components, Supabase client, Dexie offline layer, html5-qrcode scanner, NFC code, PWA service worker, or routing. Everything keeps working in the browser exactly as it does today.

## What you do on your machine (one-time per platform)

Capacitor requires a local dev environment — Lovable cannot run Xcode or Android Studio in the sandbox.

```text
1. Export to GitHub → git clone your repo
2. npm install
3. npx cap add ios          (needs macOS + Xcode)
   npx cap add android      (needs Android Studio)
4. npm run build
5. npx cap sync
6. npx cap run ios          or   npx cap run android
```

**Whenever you `git pull` future Lovable changes:** run `npm install` then `npx cap sync` before launching again.

## Requirements & limitations

- **iOS builds** require a Mac with Xcode. **Android builds** require Android Studio (any OS).
- **App Store / Play Store** publishing requires Apple Developer ($99/yr) and Google Play ($25 one-time) accounts — handled outside Lovable.
- The hot-reload config points the native app at the Lovable preview during development. For production builds you'll comment out the `server.url` block so the native app loads the bundled `dist/` assets instead.
- Native upgrades (native barcode scanner, native NFC for iOS RFID, native push notifications, biometrics) are **not included in this step** — the app will continue using its current web APIs inside the native shell. These can be added as follow-ups.

## After this step

I'll point you to the official Lovable mobile guide for the local run-through, and we can plan any native plugin upgrades (scanner / NFC / push) as separate follow-ups.
