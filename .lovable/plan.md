## Update Capacitor app ID to `uk.ftrack.app`

### Change in this repo
Update `capacitor.config.ts`:
- `appId`: `app.lovable.0b33a0ababa943f09671c6f0a67e5212` → `uk.ftrack.app`
- `appName`: `f-gas-shield` → `FTrack` (cleaner display name on home screen; say if you'd prefer to keep `f-gas-shield`)

No `android/` or `ios/` folders exist in the repo yet, so there are no native identifiers to rewrite here — `npx cap add` will generate them fresh from the new `appId`.

### Your steps after I push the change

**On the PC (Android)** — from `C:\Users\Debo\Documents\f-gas-shield`:
```powershell
git pull
npm install
npx cap add android
git add android/ capacitor.config.ts package-lock.json
git commit -m "Add Android platform with uk.ftrack.app ID"
git push
```

**On the Mac (iOS)** — after the PC push:
```bash
git pull
npm install
npx cap add ios
cd ios/App && pod install && cd ../..
git add ios/ capacitor.config.ts package-lock.json
git commit -m "Add iOS platform with uk.ftrack.app ID"
git push
```

### Heads-up
- `uk.ftrack.app` becomes the permanent Android package name and iOS bundle identifier. Changing it later means re-publishing as a new app in both stores — treat it as final.
- You'll need to own/control the `ftrack.uk` domain for iOS Universal Links / Android App Links later (you already do — good).
- Apple Developer Program ($99/yr) and Google Play Console ($25 one-time) accounts are required to publish, not to build.

Confirm and I'll switch to build mode and make the edit.