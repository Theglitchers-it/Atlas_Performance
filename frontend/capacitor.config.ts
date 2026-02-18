import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.theglitchers.atlas',
  appName: 'Atlas',
  webDir: 'dist',
  server: {
    // Per dev locale su dispositivo, decommentare e inserire IP locale:
    // url: 'http://192.168.1.X:5173',
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#131515'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#131515',
      showSpinner: false
    }
  }
};

export default config;
