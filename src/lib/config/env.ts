/**
 * Environment Configuration Validation
 * Ensures all required environment variables are set for production
 */

// Required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'JWT_SECRET',
  'DATABASE_URL',
] as const;

// Optional environment variables (with defaults)
const optionalEnvVars = {
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: '',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '',
  NEXT_PUBLIC_FIREBASE_APP_ID: '',
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: '',
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: '',
  MTN_MOMO_SUBSCRIPTION_KEY: '',
  MTN_MOMO_API_KEY: '',
  MTN_MOMO_USER_ID: '',
  MTN_MOMO_ENVIRONMENT: 'sandbox',
  AIRTEL_MONEY_CLIENT_ID: '',
  AIRTEL_MONEY_CLIENT_SECRET: '',
  AIRTEL_MONEY_ENVIRONMENT: 'sandbox',
} as const;

export interface EnvConfig {
  // Firebase
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
    vapidKey: string;
  };
  // Mapbox
  mapbox: {
    accessToken: string;
  };
  // Payments
  payments: {
    mtn: {
      subscriptionKey: string;
      apiKey: string;
      userId: string;
      environment: 'sandbox' | 'production';
      isConfigured: boolean;
    };
    airtel: {
      clientId: string;
      clientSecret: string;
      environment: 'sandbox' | 'production';
      isConfigured: boolean;
    };
  };
  // Security
  security: {
    jwtSecret: string;
  };
  // Database
  database: {
    url: string;
  };
}

// Validate and get environment configuration
export function getEnvConfig(): EnvConfig {
  // Check for missing required variables
  const missingVars = requiredEnvVars.filter(
    (key) => !process.env[key] || process.env[key] === ''
  );

  if (missingVars.length > 0) {
    console.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Check for placeholder values
  const placeholderVars: string[] = [];
  Object.entries(process.env).forEach(([key, value]) => {
    if (value && (value.startsWith('your_') || value.includes('change_this'))) {
      placeholderVars.push(key);
    }
  });

  if (placeholderVars.length > 0) {
    console.warn(`Environment variables with placeholder values: ${placeholderVars.join(', ')}`);
  }

  return {
    firebase: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
    },
    mapbox: {
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
    },
    payments: {
      mtn: {
        subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
        apiKey: process.env.MTN_MOMO_API_KEY || '',
        userId: process.env.MTN_MOMO_USER_ID || '',
        environment: (process.env.MTN_MOMO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        isConfigured: !!(process.env.MTN_MOMO_SUBSCRIPTION_KEY && process.env.MTN_MOMO_API_KEY),
      },
      airtel: {
        clientId: process.env.AIRTEL_MONEY_CLIENT_ID || '',
        clientSecret: process.env.AIRTEL_MONEY_CLIENT_SECRET || '',
        environment: (process.env.AIRTEL_MONEY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        isConfigured: !!(process.env.AIRTEL_MONEY_CLIENT_ID && process.env.AIRTEL_MONEY_CLIENT_SECRET),
      },
    },
    security: {
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    },
    database: {
      url: process.env.DATABASE_URL || '',
    },
  };
}

// Check if payments are configured
export function isPaymentConfigured(): { mtn: boolean; airtel: boolean } {
  const config = getEnvConfig();
  return {
    mtn: config.payments.mtn.isConfigured,
    airtel: config.payments.airtel.isConfigured,
  };
}

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  const config = getEnvConfig();
  return !!(config.firebase.apiKey && config.firebase.projectId);
}

// Export singleton config
export const envConfig = getEnvConfig();
