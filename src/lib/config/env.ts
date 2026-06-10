/**
 * Startup Environment Validation
 *
 * Validates critical and feature-specific environment variables on server startup.
 * NEVER logs or exposes actual env var values — only checks their presence.
 */

/**
 * Environment variable categories and their members.
 * CRITICAL vars must be present for the server to start in production.
 * Other categories enable optional features.
 */
const ENV_CATEGORIES = {
  CRITICAL: ['JWT_SECRET', 'DATABASE_URL'],
  PAYMENT: [
    'MTN_MOMO_SUBSCRIPTION_KEY',
    'MTN_MOMO_API_KEY',
    'MTN_MOMO_SECRET_KEY',
    'AIRTEL_MONEY_CLIENT_ID',
    'AIRTEL_MONEY_CLIENT_SECRET',
  ],
  NOTIFICATION: [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
  ],
  EMAIL: ['RESEND_API_KEY'],
  MAPS: ['NEXT_PUBLIC_MAPBOX_TOKEN'],
} as const;

type CategoryName = keyof typeof ENV_CATEGORIES;

/**
 * Map from feature name to the env var category it requires.
 */
const FEATURE_CATEGORY_MAP: Record<string, CategoryName> = {
  payments: 'PAYMENT',
  notifications: 'NOTIFICATION',
  email: 'EMAIL',
  maps: 'MAPS',
};

/**
 * Check whether a single env var is present (non-empty string).
 */
function isPresent(key: string): boolean {
  const value = process.env[key];
  return typeof value === 'string' && value.length > 0;
}

/**
 * Get the list of missing env vars for a given category.
 */
function getMissingForCategory(category: CategoryName): string[] {
  return ENV_CATEGORIES[category].filter((key) => !isPresent(key));
}

/**
 * Validate environment variables on server startup.
 *
 * - Always checks CRITICAL vars:
 *   - In production (NODE_ENV=production): throws if any are missing.
 *   - In development: logs warnings but does not throw.
 * - For all other categories: logs warnings about missing vars and
 *   which features will be unavailable.
 * - Returns an object with validation status, missing vars per category,
 *   and warning messages.
 */
export function validateEnv(): {
  isValid: boolean;
  missing: Record<string, string[]>;
  warnings: string[];
} {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: Record<string, string[]> = {};
  const warnings: string[] = [];

  // --- CRITICAL vars ---
  const criticalMissing = getMissingForCategory('CRITICAL');
  missing.CRITICAL = criticalMissing;

  if (criticalMissing.length > 0) {
    const msg = `[ENV] CRITICAL: Missing required environment variables: ${criticalMissing.join(', ')}`;

    if (isProduction) {
      throw new Error(
        `Server cannot start without required environment variables: ${criticalMissing.join(', ')}. ` +
          `Please set them before deploying to production.`
      );
    }

    // Development: warn only
    console.warn(msg);
    warnings.push(msg);
  }

  // --- Optional feature categories ---
  const optionalCategories: CategoryName[] = [
    'PAYMENT',
    'NOTIFICATION',
    'EMAIL',
    'MAPS',
  ];

  for (const category of optionalCategories) {
    const categoryMissing = getMissingForCategory(category);
    missing[category] = categoryMissing;

    if (categoryMissing.length > 0) {
      const featureLabel = category.toLowerCase();
      const msg =
        `[ENV] ${category}: Missing variables [${categoryMissing.join(', ')}]. ` +
        `The '${featureLabel}' feature will be unavailable until these are configured.`;
      console.warn(msg);
      warnings.push(msg);
    }
  }

  // Overall validity: all CRITICAL vars must be present
  const isValid = criticalMissing.length === 0;

  return { isValid, missing, warnings };
}

/**
 * Check if a feature is available based on whether its required env vars are set.
 *
 * Supported features: 'payments', 'notifications', 'email', 'maps'
 * Returns false for unknown feature names.
 */
export function isFeatureAvailable(feature: string): boolean {
  const category = FEATURE_CATEGORY_MAP[feature];
  if (!category) return false;

  const required = ENV_CATEGORIES[category];
  return required.every((key) => isPresent(key));
}

/**
 * Get a summary of which features are configured.
 *
 * Returns a plain object mapping feature names to boolean presence checks.
 * No env var values are ever included — only booleans indicating whether
 * the required variables for each feature are set.
 * Useful for the health/startup endpoint.
 */
export function getEnvStatus(): Record<string, boolean> {
  const features = Object.keys(FEATURE_CATEGORY_MAP);
  const status: Record<string, boolean> = {};

  for (const feature of features) {
    status[feature] = isFeatureAvailable(feature);
  }

  // Also include critical vars presence (boolean only)
  for (const key of ENV_CATEGORIES.CRITICAL) {
    status[key] = isPresent(key);
  }

  return status;
}
