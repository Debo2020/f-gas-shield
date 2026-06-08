import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.ftrack.app',
  appName: 'FTrack',
  webDir: 'dist',
  // For local dev hot-reload against the Lovable sandbox, uncomment:
  // server: {
  //   url: 'https://0b33a0ab-aba9-43f0-9671-c6f0a67e5212.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
};

export default config;
