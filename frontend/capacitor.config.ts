import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.momentum.productivity',
  appName: 'Momentum',
  webDir: 'dist',

  // When running as native app, all web assets are bundled inside the APK.
  // API calls are rewritten to point to the cloud backend via VITE_API_URL.
  server: {
    androidScheme: 'https',
    cleartext: true,   // allows HTTP for local-network testing
    allowNavigation: ['*'],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#030712',
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030712',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#7C3AED',
      sound: 'default',
    },
  },
}

export default config
