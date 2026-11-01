import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Identificatore iniziale per i test locali: va confermato prima della firma TestFlight/Play.
  appId: 'com.taiodoio.necrothing',
  appName: 'Necrothing',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#17131e',
    },
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#17131e',
      showSpinner: false,
    },
  },
};

export default config;
