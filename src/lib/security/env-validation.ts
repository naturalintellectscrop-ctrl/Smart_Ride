/**
 * Environment Variable Validation
 * 
 * Validates critical environment variables on application startup.
 * Fails fast if required variables are missing in production.
 */

// ============================================================================
// Required Environment Variables
// ============================================================================

interface EnvConfig {
  name: string;
  required: boolean;
  validate?: (value: string) => boolean;
  sensitive?: boolean;
  defaultValue?: string;
}

const ENV_CONFIG: EnvConfig[] = [
  // Authentication
  { name: 'JWT_SECRET', required: true, sensitive: true },
  { name: 'JWT_EXPIRES_IN', required: false, defaultValue: '15m' },
  { name: 'JWT_REFRESH_EXPIRES_IN', required: false, defaultValue: '7d' },
  
  // Database
  { name: 'DATABASE_URL', required: true, sensitive: true },
  
  // Payment Gateways
  { name: 'MTN_MOMO_SECRET_KEY', required: true, sensitive: true },
  { name: 'MTN_MOMO_API_KEY', required: true, sensitive: true },
  { name: 'MTN_MOMO_SUBSCRIPTION_KEY', required: true, sensitive: true },
  { name: 'AIRTEL_MONEY_SECRET_KEY', required: true, sensitive: true },
  { name: 'AIRTEL_MONEY_API_KEY', required: true, sensitive: true },
  { name: 'FLUTTERWAVE_SECRET_KEY', required: true, sensitive: true },
  
  // System
  { name: 'SYSTEM_API_KEY', required: false, sensitive: true },
  
  // Optional
  { name: 'NODE_ENV', required: false, defaultValue: 'development' },
  { name: 'NEXT_PUBLIC_API_URL', required: false },
  { name: 'ALLOW_OTP_IN_RESPONSE', required: false, defaultValue: 'false' },
];

// ============================================================================
// Validation Functions
// ============================================================================

function validateJwtSecret(value: string): boolean {
  // JWT secret should be at least 32 characters in production
  if (process.env.NODE_ENV === 'production') {
    return value.length >= 32;
  }
  return value.length >= 10;
}

function validateDatabaseUrl(value: string): boolean {
  // Must be a valid PostgreSQL URL in production
  if (process.env.NODE_ENV === 'production') {
    return value.startsWith('postgresql://') || value.startsWith('postgres://');
  }
  return true; // Allow SQLite in development
}

function validateApiKey(value: string): boolean {
  // API keys should be at least 16 characters
  return value.length >= 16;
}

// ============================================================================
// Environment Validator
// ============================================================================

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  sensitive: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];
  const sensitive: string[] = [];
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  for (const config of ENV_CONFIG) {
    let value = process.env[config.name];
    
    // Use default value if not set
    if (!value && config.defaultValue) {
      value = config.defaultValue;
    }
    
    // Check required
    if (config.required && !value) {
      missing.push(config.name);
      errors.push(`Missing required environment variable: ${config.name}`);
      continue;
    }
    
    // Skip validation if not set and not required
    if (!value) continue;
    
    // Track sensitive variables
    if (config.sensitive) {
      sensitive.push(config.name);
    }
    
    // Validate value
    if (config.validate && !config.validate(value)) {
      errors.push(`Invalid value for ${config.name}`);
    }
  }
  
  // Production-specific checks
  if (isProduction) {
    // JWT secret must be strong
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }
    
    // OTP must not be exposed
    if (process.env.ALLOW_OTP_IN_RESPONSE === 'true') {
      errors.push('ALLOW_OTP_IN_RESPONSE must be false in production');
    }
    
    // Database must be PostgreSQL
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.startsWith('postgresql') && !dbUrl.startsWith('postgres')) {
      errors.push('DATABASE_URL must be PostgreSQL in production');
    }
  }
  
  // Development warnings
  if (!isProduction) {
    if (process.env.JWT_SECRET === 'dev-jwt-secret-not-for-production-use') {
      warnings.push('Using development JWT secret. Set JWT_SECRET for production.');
    }
    
    if (process.env.ALLOW_OTP_IN_RESPONSE === 'true') {
      warnings.push('OTP is exposed in responses. Disable for production.');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing,
    sensitive,
  };
}

/**
 * Get environment variable with validation
 */
export function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];
  
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  
  return value;
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  
  return num;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(name: string, defaultValue?: boolean): boolean {
  const value = process.env[name];
  
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  
  return value === 'true' || value === '1' || value === 'yes';
}

// ============================================================================
// Startup Validation
// ============================================================================

let validated = false;
let validationResult: EnvValidationResult | null = null;

/**
 * Validate environment on startup
 * Should be called early in the application lifecycle
 */
export function ensureEnvValid(): void {
  if (validated) return;
  
  validationResult = validateEnvironment();
  validated = true;
  
  // Log warnings
  for (const warning of validationResult.warnings) {
    console.warn(`[ENV WARNING] ${warning}`);
  }
  
  // Fail in production if errors
  if (process.env.NODE_ENV === 'production' && !validationResult.valid) {
    console.error('[ENV ERROR] Environment validation failed:');
    for (const error of validationResult.errors) {
      console.error(`  - ${error}`);
    }
    throw new Error('Environment validation failed. Check logs for details.');
  }
  
  // Log success
  if (validationResult.valid) {
    console.log('[ENV] Environment validation passed');
    if (validationResult.warnings.length > 0) {
      console.log(`[ENV] ${validationResult.warnings.length} warnings`);
    }
  }
}

/**
 * Get validation result
 */
export function getEnvValidation(): EnvValidationResult | null {
  return validationResult;
}

// Auto-validate on import in production
if (process.env.NODE_ENV === 'production') {
  // Delay to allow for async initialization
  setTimeout(() => ensureEnvValid(), 100);
}
