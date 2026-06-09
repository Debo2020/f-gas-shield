## Android Emulator Setup Checklist

Goal: give you (Windows) and your Mac collaborator a single source of truth for spinning up FTrack on an Android Virtual Device (AVD), with troubleshooting for the issues that actually bite (HAXM/WHPX, missing SDK, slow boot, ADB).

### Files to create / change

1. **`docs/android-emulator-setup.md`** (new) — the full checklist + troubleshooting. Canonical source.
2. **`README.md`** — replace the boilerplate "How can I edit this code?" section with an FTrack-specific intro and add a short "Run on an Android emulator" section that links to `docs/android-emulator-setup.md`.
3. **`src/pages/Help.tsx`** — add a new FAQ category **"Mobile App (Android)"** with 4 concise Q&As covering prerequisites, first-run steps, the build-sync-run loop, and where to find the full guide. Link out to the GitHub `docs/android-emulator-setup.md` (raw URL via the project's GitHub repo) for the deep version. No new components, no new routes — just appended `faqData` entries so it slots into the existing accordion/search.

### Content outline for `docs/android-emulator-setup.md`

**Section 1 — Prerequisites (one-time)**
- Windows
  - Windows 10/11 64-bit, 16 GB RAM recommended, 20 GB free disk.
  - Virtualization enabled in BIOS/UEFI (Intel VT-x / AMD-V). How to check: `systeminfo` → "Virtualization Enabled In Firmware: Yes".
  - Windows Hypervisor Platform (WHPX) feature enabled — `Turn Windows features on or off` → tick **Windows Hypervisor Platform** and **Virtual Machine Platform**. Reboot.
  - Disable Hyper-V only if WHPX fails (rare).
- macOS (Apple Silicon and Intel)
  - macOS 12+, 16 GB RAM recommended.
  - Hypervisor.framework is built in — nothing to enable.
  - On Apple Silicon use **arm64-v8a** system images (much faster than x86).
- Both
  - Android Studio Hedgehog (2023.1) or newer.
  - Node.js 20 LTS + npm.
  - Git.
  - JDK 17 (bundled with recent Android Studio — verify under `File → Project Structure → SDK Location → Gradle JDK`).

**Section 2 — Android Studio SDK checklist**
Open `Tools → SDK Manager` and tick:
- SDK Platforms: **Android 14 (API 34)** (or latest stable).
- SDK Tools: **Android SDK Build-Tools**, **Android SDK Command-line Tools (latest)**, **Android SDK Platform-Tools**, **Android Emulator**, **Android Emulator hypervisor driver** (Windows AMD/Intel) **or** **Intel x86 Emulator Accelerator (HAXM)** if offered.
- Confirm `ANDROID_HOME` env var points to the SDK (Windows: `%LOCALAPPDATA%\Android\Sdk`; macOS: `~/Library/Android/sdk`) and `platform-tools` is on `PATH` so `adb` works in a terminal.

**Section 3 — Create the virtual device**
- `Tools → Device Manager → Create Device`.
- Hardware: **Pixel 7** (or any phone with Play Store icon).
- System image: **API 34**, ABI **arm64-v8a** on Apple Silicon, **x86_64** on Windows/Intel Mac. Download if greyed out.
- Finish → Launch ▶.

**Section 4 — Build & run FTrack on the emulator**
First time after cloning:
```
npm install
npx cap add android
npm run build
npx cap sync android
npx cap run android
```
Subsequent runs after pulling changes:
```
git pull
npm install
npm run build
npx cap sync android
npx cap run android
```
Or open `android/` in Android Studio and hit ▶ with the AVD selected.

App will install as **FTrack** (`uk.ftrack.app`).

**Section 5 — Troubleshooting**
- "HAXM is not installed" / "WHPX is not available" → re-enable virtualization in BIOS; on Windows tick Windows Hypervisor Platform; on AMD use the **Android Emulator hypervisor driver** instead of HAXM.
- "adb: command not found" → add `platform-tools` to PATH or use `npx cap run android` which resolves it via `ANDROID_HOME`.
- Emulator boots to black screen / very slow → switch to arm64-v8a on Apple Silicon; allocate ≥ 2 GB RAM in AVD advanced settings; enable **Graphics: Hardware - GLES 2.0**.
- "SDK location not found" Gradle error → `File → Project Structure → SDK Location` and point to the SDK; or create `android/local.properties` with `sdk.dir=...`.
- White screen after launch → you forgot `npm run build` before `npx cap sync`. The webview loads `dist/` which must exist.
- Login / Supabase calls fail → emulator has internet by default; behind a corporate proxy set it under **Extended Controls (…) → Settings → Proxy**.
- Camera / QR scanner doesn't work → in the AVD's Extended Controls set **Camera → Front/Back: Webcam0** (or VirtualScene) before launching.
- App still shows old code after pull → re-run `npm run build && npx cap sync android`; Capacitor copies `dist/` into `android/app/src/main/assets/public` only on sync.

**Section 6 — Optional convenience scripts** (mentioned, not added in this plan)
A future tidy-up could add an `npm run android` script (`vite build && cap sync android && cap run android`). Not in scope here — say the word and I'll add it.

### Out of scope
- iOS / Xcode setup (separate doc when your Mac collaborator gets going).
- Play Store signing & release.
- Live-reload from the Lovable sandbox (already commented in `capacitor.config.ts`).

### Verification
- `docs/android-emulator-setup.md` renders on GitHub with working anchors.
- README links to it and no longer contains the generic Lovable placeholder copy in the touched section.
- `/help` shows a new **Mobile App (Android)** category and the existing search filters its entries correctly.
