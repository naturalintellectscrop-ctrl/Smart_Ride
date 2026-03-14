import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ug.smartride.app',
  appName: 'Smart Ride',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  
  // Plugins configuration
  plugins: {
    // Geolocation for GPS tracking
    Geolocation: {
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
      ],
    },
    
    // Push notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    
    // Local notifications
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#1F4E79',
    },
    
    // Camera for document uploads
    Camera: {
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
    },
    
    // Splash screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1F4E79',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    
    // Status bar
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1F4E79',
    },
    
    // Keyboard
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    
    // App settings
    CapacitorHttp: {
      enabled: true,
    },
  },
  
  // Android specific configuration
  android: {
    buildOptions: {
      keystorePath: 'android/app/smattride.keystore',
      keystorePassword: 'CHANGE_THIS',
      keystoreAlias: 'smartride',
      keystoreAliasPassword: 'CHANGE_THIS',
      signingType: 'apksigner',
    },
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  
  // iOS specific configuration
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
  },
};

export default config;
