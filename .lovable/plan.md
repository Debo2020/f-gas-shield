## Goal

Get FTrack building on Appflow for both Android and iOS by adding the missing native folders and fixing the two config issues blocking production builds.

## What I'll change in the repo (Lovable side)

1. **Fix `capacitor.config.ts` for production builds**
   - Remove the hardcoded `server.url` pointing at the Lovable sandbox (this is what currently makes Appflow builds load the preview instead of the bundled app).
   - Keep a commented-out dev block so you can re-enable hot-reload locally when you want it.
   - Result: Appflow builds will load `dist/` from inside the app bundle, as they should for store submission.

2. **Add `package-lock.json` generation note + Appflow build config**
   - Add a small `ionic.config.json` (or document the Appflow build settings) so Appflow uses the right Node version and install command.
   - Recommend committing a `package-lock.json` (generated locally via `npm install`) so Appflow's default `npm ci` works. The project currently has `bun.lock` only, which Appflow doesn't understand.

3. **Update `.lovable/plan.md`** to reflect the new dual-platform workflow (Mac for iOS, PC for Android, both pushing native folders to the same repo).

## What you'll do locally (one-time)

Native folders **must be generated on your machines** and committed to GitHub. Appflow then builds from them. You only do this once per platform.

**On your PC (Android):**
```
git pull
npm install
npx cap add android
git add android/
git commit -m "Add Android native project"
git push
```

**On your Mac (iOS):**
```
git pull                 # picks up the android/ folder too — harmless
npm install
npx cap add ios
cd ios/App && pod install && cd ../..
git add ios/
git commit -m "Add iOS native project"
git push
```

After both pushes, Appflow will have `android/` and `ios/` in the repo and `npx cap sync` will succeed.

## Appflow configuration

- **Android build**: Debug or Release, native binary, target `android/` — should now succeed.
- **iOS build**: requires an Apple Developer account ($99/yr) for signing certificates and a provisioning profile uploaded to Appflow. Debug builds for simulator work without it; device/store builds don't.
- **Build stack**: set Node to 20.x, install command `npm ci`.

## Ongoing workflow after future Lovable changes

You won't need to re-run `cap add`. Just:
```
git pull
npm install
npm run build
npx cap sync
```
Appflow does the equivalent automatically on each build trigger.

## Risks / things to know

- The `android/` and `ios/` folders are large (~hundreds of MB unbuilt, much more once Gradle/CocoaPods cache). They go in git but `.gitignore` from `cap add` excludes the build artifacts correctly.
- Future Capacitor plugin additions (native scanner, NFC, push) will require re-running `npx cap sync` locally and possibly editing native files — Lovable can't do that part.
- The iOS bundle ID is currently `app.lovable.0b33a0ababa943f09671c6f0a67e5212`. If you want a real ID like `uk.ftrack.app` for the App Store, tell me and I'll change it before you run `cap add` (changing it after is painful).

## Want me to proceed?

If yes, I'll make the three repo changes above. Then you run the `cap add` commands on each machine and push.

Also — should I rename the bundle ID to something like `uk.ftrack.app` first?
