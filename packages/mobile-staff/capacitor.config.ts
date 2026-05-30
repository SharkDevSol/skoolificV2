import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skoolific.staff',
  appName: 'Skoolific Staff',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, you can set this to your local server
    // url: 'http://192.168.1.100:5175',
    // cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#667eea',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#667eea',
      showSpinner: false,
    },
  },
};

export default config;
