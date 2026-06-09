# FTrack

UK F-Gas compliance, refrigerant tracking and Gas Safe certification — mobile-first, offline-capable, multi-tenant SaaS.

Built with React 18, TypeScript, Vite, Tailwind, shadcn/ui and a Supabase backend (Auth, Postgres + RLS, Edge Functions, Storage). Native mobile builds are wrapped with Capacitor (`uk.ftrack.app`).

## Local development

Requirements: Node.js 20 LTS + npm, Git.

```sh
git clone <YOUR_GIT_URL>
cd f-gas-shield
npm install
npm run dev
```

The dev server runs on <http://localhost:8080>.

## Run on an Android emulator

To preview FTrack inside an Android Virtual Device (AVD) via Android Studio, follow the full checklist:

➡️ **[docs/android-emulator-setup.md](docs/android-emulator-setup.md)** — prerequisites (WHPX / Hypervisor.framework), SDK packages, AVD creation, build/sync/run commands and troubleshooting for Windows and macOS.

TL;DR after first-time setup:

```sh
git pull
npm install
npm run build
npx cap sync android
npx cap run android
```

## Editing the project

You can edit FTrack in the Lovable workspace, your own IDE, directly in GitHub, or in a Codespace. Pushes from any of these stay in sync with the Lovable workspace.

## Deployment

Web app: published via Lovable (Share → Publish). Custom domain configured under Project → Settings → Domains.

Native apps: built locally with Capacitor and submitted to the Apple App Store and Google Play Console (`uk.ftrack.app`).
