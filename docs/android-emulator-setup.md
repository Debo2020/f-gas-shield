# Running FTrack on an Android Virtual Device (AVD)

This checklist gets FTrack (`uk.ftrack.app`) running inside an Android Studio emulator on **Windows** and **macOS**. Follow it top-to-bottom on a fresh machine; jump to [Troubleshooting](#5-troubleshooting) once you're set up.

---

## 1. Prerequisites (one-time)

### Windows 10 / 11
- [ ] 64-bit Windows 10 (≥ 21H2) or Windows 11, 16 GB RAM recommended, ~20 GB free disk.
- [ ] **Hardware virtualization enabled** in BIOS/UEFI (Intel VT-x or AMD-V).
  - Check via PowerShell: `systeminfo` → look for `Virtualization Enabled In Firmware: Yes`.
- [ ] **Windows features** turned on (`Turn Windows features on or off`):
  - ✅ Windows Hypervisor Platform (WHPX)
  - ✅ Virtual Machine Platform
  - Reboot after enabling.
- [ ] Only disable Hyper-V if WHPX refuses to initialise (uncommon on Win 11).

### macOS (Intel and Apple Silicon)
- [ ] macOS 12 Monterey or newer, 16 GB RAM recommended.
- [ ] Hypervisor.framework is built in — nothing to install.
- [ ] On Apple Silicon (M1/M2/M3/M4), always pick **arm64-v8a** system images. x86_64 emulators are unusably slow.

### Both platforms
- [ ] [Android Studio](https://developer.android.com/studio) Hedgehog (2023.1) or newer.
- [ ] [Node.js 20 LTS](https://nodejs.org/) + npm.
- [ ] Git.
- [ ] JDK 17 — bundled with recent Android Studio. Verify under `File → Project Structure → SDK Location → Gradle JDK`.

---

## 2. Android Studio SDK checklist

Open **Tools → SDK Manager** and make sure these are installed:

**SDK Platforms tab**
- [ ] Android 14 (API 34) — or the latest stable.

**SDK Tools tab** (tick "Show Package Details" to see versions)
- [ ] Android SDK Build-Tools (latest)
- [ ] Android SDK Command-line Tools (latest)
- [ ] Android SDK Platform-Tools
- [ ] Android Emulator
- [ ] **Android Emulator hypervisor driver** (Windows AMD or Intel) — preferred over HAXM on modern setups.

**Environment**
- [ ] `ANDROID_HOME` points at the SDK:
  - Windows: `%LOCALAPPDATA%\Android\Sdk`
  - macOS: `~/Library/Android/sdk`
- [ ] `platform-tools` is on `PATH` so `adb` works in any terminal.

Verify:
```
adb --version
```

---

## 3. Create the virtual device

1. **Tools → Device Manager → Create Device**.
2. Hardware: **Pixel 7** (or any phone profile with the Play Store icon).
3. System image:
   - Windows / Intel Mac → **API 34 · x86_64**.
   - Apple Silicon → **API 34 · arm64-v8a**.
4. Advanced settings (recommended): RAM ≥ 2048 MB, Graphics: **Hardware – GLES 2.0**.
5. Finish, then click the ▶ icon to boot the AVD once and confirm it reaches the home screen.

---

## 4. Build and run FTrack

### First run after cloning
```
npm install
npx cap add android
npm run build
npx cap sync android
npx cap run android
```

### Every time you pull new changes
```
git pull
npm install
npm run build
npx cap sync android
npx cap run android
```

You can also open the `android/` folder in Android Studio and press the green ▶ Run button with the AVD selected.

The app installs as **FTrack** with package ID `uk.ftrack.app`.

> Capacitor copies the freshly built `dist/` into `android/app/src/main/assets/public` during `cap sync`. Skip `npm run build` and you'll launch stale code.

---

## 5. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `HAXM is not installed` / `WHPX is not available` | Re-check virtualization in BIOS. On Windows tick Windows Hypervisor Platform. On AMD use the **Android Emulator hypervisor driver** (SDK Tools) instead of HAXM. |
| `adb: command not found` | Add `$ANDROID_HOME/platform-tools` to `PATH`, or run via `npx cap run android` which resolves it from `ANDROID_HOME`. |
| Emulator boots to black screen or is painfully slow | Use **arm64-v8a** on Apple Silicon. Bump AVD RAM to ≥ 2 GB. Set Graphics to **Hardware – GLES 2.0**. Close other VMs (Docker Desktop, WSL2 heavy workloads). |
| Gradle error `SDK location not found` | `File → Project Structure → SDK Location` → set SDK path. Or create `android/local.properties` with `sdk.dir=<absolute path to SDK>`. |
| White screen after the splash | You skipped `npm run build` before `npx cap sync`. Re-run both and re-launch. |
| Login / Supabase calls fail inside the emulator | Emulator has internet by default. Behind a corporate proxy, set it under the AVD's **Extended Controls (…) → Settings → Proxy**. |
| QR scanner / camera doesn't work | In **Extended Controls → Camera**, set Front and Back to **Webcam0** (real camera) or **VirtualScene**. Restart the AVD. |
| App still shows old code after `git pull` | Re-run `npm run build && npx cap sync android`. The native project doesn't see source changes until `sync`. |
| `INSTALL_FAILED_INSUFFICIENT_STORAGE` | Wipe the AVD via Device Manager (⋮ → Wipe Data) or increase its internal storage. |

---

## 6. Out of scope
- iOS / Xcode setup — separate guide once the Mac collaborator joins.
- Play Store signing & release.
- Live-reload from the Lovable sandbox (already commented in `capacitor.config.ts`).

Further reading: <https://lovable.dev/blog/mobile-apps-with-capacitor>
