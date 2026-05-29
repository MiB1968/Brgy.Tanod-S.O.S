import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brgytanod.sos',
  appName: 'Brgy Tanod SOS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true // Useful for local dev
  },
  plugins: {
    LocalNotifications: {
      smallIconColor: '#3b82f6',
    },
    BackgroundRunner: {
      notification: {
        title: "Brgy Tanod SOS",
        body: "Running in background for emergency detection"
      }
    },
    Geolocation: {
      permissions: ['location', 'locationAlways']
    }
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInsetAdjustmentBehavior: 'always'
  }
};

export default config;
