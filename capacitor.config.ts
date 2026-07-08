import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.ftrack.app',
  appName: 'FTrack — F-Gas Compliance',
  webDir: 'dist',
  ios: {
    // Universal binary: iPhone + iPad. Configure `TARGETED_DEVICE_FAMILY = 1,2`
    // in Xcode target after `npx cap add ios`.
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
  // For local dev hot-reload against the Lovable sandbox, uncomment:
  // server: {
  //   url: 'https://0b33a0ab-aba9-43f0-9671-c6f0a67e5212.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
};

export default config;
