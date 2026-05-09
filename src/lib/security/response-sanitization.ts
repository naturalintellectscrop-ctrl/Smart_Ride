/**
 * Response Data Sanitization System
 * 
 * Automatically removes sensitive fields from API responses:
 * - Passwords and password hashes
 * - OTP codes
 * - API keys and secrets
 * - Session tokens
 * - Internal IDs and metadata
 * - Financial sensitive data
 * 
 * Usage:
 *   const sanitizedUser = sanitizeResponse(user, 'user');
 *   return NextResponse.json({ user: sanitizedUser });
 */

import { NextResponse } from 'next/server';

// ============================================================================
// Sensitive Field Definitions
// ============================================================================

/**
 * Fields that should NEVER be exposed in API responses
 */
const SENSITIVE_FIELDS = {
  // Authentication sensitive
  password: true,
  passwordHash: true,
  hashedPassword: true,
  password_hash: true,
  hashed_password: true,
  otp: true,
  otpCode: true,
  otp_code: true,
  verificationCode: true,
  verification_code: true,
  resetToken: true,
  reset_token: true,
  accessToken: true,
  access_token: true,
  refreshToken: true,
  refresh_token: true,
  sessionToken: true,
  session_token: true,
  token: true,
  authToken: true,
  auth_token: true,
  
  // API Keys and Secrets
  apiKey: true,
  api_key: true,
  apiSecret: true,
  api_secret: true,
  secretKey: true,
  secret_key: true,
  secret: true,
  privateKey: true,
  private_key: true,
  webhookSecret: true,
  webhook_secret: true,
  
  // Payment sensitive
  cardNumber: true,
  card_number: true,
  cvv: true,
  cvvCode: true,
  cvv_code: true,
  pin: true,
  pinCode: true,
  pin_code: true,
  cardExpiry: true,
  card_expiry: true,
  
  // Personal sensitive
  nationalId: true,
  national_id: true,
  nin: true,
  ninNumber: true,
  nin_number: true,
  drivingLicense: true,
  driving_license: true,
  passportNumber: true,
  passport_number: true,
  
  // Internal fields
  internalNotes: true,
  internal_notes: true,
  adminNotes: true,
  admin_notes: true,
  auditTrail: true,
  audit_trail: true,
  
  // System fields
  deletedAt: true,
  deleted_at: true,
  deletedBy: true,
  deleted_by: true,
};

/**
 * Entity-specific sensitive fields
 */
const ENTITY_SENSITIVE_FIELDS: Record<string, Set<string>> = {
  user: new Set([
    'password',
    'passwordHash',
    'otp',
    'otpCode',
    'resetToken',
    'accessToken',
    'refreshToken',
    'sessionToken',
    'twoFactorSecret',
    'backupCodes',
    'lastLoginIp',
    'loginAttempts',
    'lockedUntil',
  ]),
  
  rider: new Set([
    'password',
    'passwordHash',
    'bankAccountNumber',
    'bankAccountName',
    'nextOfKinPhone',
    'emergencyContactPhone',
    'drivingLicenseExpiry',
    'insuranceExpiry',
    'vehicleInsuranceNumber',
    'identityDocumentNumber',
  ]),
  
  merchant: new Set([
    'password',
    'passwordHash',
    'bankAccountNumber',
    'bankAccountName',
    'taxId',
    'businessRegistrationNumber',
    'momoAccountNumber',
    'settlementBankAccount',
  ]),
  
  payment: new Set([
    'cardNumber',
    'cvv',
    'cardExpiry',
    'cardHolderName',
    'bankAccountNumber',
    'pin',
    'authorizationCode',
    'paymentToken',
    'callbackSignature',
  ]),
  
  order: new Set([
    'customerPhone',
    'customerEmail',
    'deliveryInstructions',
    'paymentDetails',
  ]),
  
  task: new Set([
    'clientPhone',
    'clientEmail',
    'riderPhone',
    'pickupInstructions',
    'deliveryInstructions',
  ]),
  
  session: new Set([
    'token',
    'refreshToken',
    'deviceToken',
    'ipAddress',
    'userAgent',
  ]),
};

/**
 * Fields that should be partially masked
 */
const MASKED_FIELDS: Record<string, { showFirst: number; showLast: number; maskChar: string }> = {
  phone: { showFirst: 6, showLast: 3, maskChar: '*' },
  phoneNumber: { showFirst: 6, showLast: 3, maskChar: '*' },
  email: { showFirst: 3, showLast: 0, maskChar: '*' },
  emailAddress: { showFirst: 3, showLast: 0, maskChar: '*' },
  cardNumber: { showFirst: 4, showLast: 4, maskChar: '*' },
  accountNumber: { showFirst: 3, showLast: 2, maskChar: '*' },
};

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Mask a string value
 */
function maskValue(value: string, config: { showFirst: number; showLast: number; maskChar: string }): string {
  if (!value || value.length <= config.showFirst + config.showLast) {
    return value;
  }
  
  const first = value.slice(0, config.showFirst);
  const last = value.slice(-config.showLast);
  const maskedLength = value.length - config.showFirst - config.showLast;
  const masked = config.maskChar.repeat(maskedLength);
  
  return `${first}${masked}${last}`;
}

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string, entityType?: string): boolean {
  const normalizedField = fieldName.toLowerCase().replace(/_/g, '');
  
  // Check global sensitive fields
  if (SENSITIVE_FIELDS[fieldName as keyof typeof SENSITIVE_FIELDS]) {
    return true;
  }
  
  // Check entity-specific sensitive fields
  if (entityType && ENTITY_SENSITIVE_FIELDS[entityType]) {
    if (ENTITY_SENSITIVE_FIELDS[entityType].has(fieldName)) {
      return true;
    }
  }
  
  // Check for common sensitive patterns
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key$/i,
    /api_?key/i,
    /private/i,
    /hash/i,
    /otp/i,
    /pin/i,
    /cvv/i,
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(fieldName));
}

/**
 * Check if a field should be masked
 */
function shouldMaskField(fieldName: string): { mask: boolean; config?: typeof MASKED_FIELDS[string] } {
  const config = MASKED_FIELDS[fieldName] || MASKED_FIELDS[fieldName.toLowerCase()];
  
  if (config) {
    return { mask: true, config };
  }
  
  // Auto-detect phone numbers
  if (/phone|mobile|cell/i.test(fieldName)) {
    return { mask: true, config: { showFirst: 6, showLast: 3, maskChar: '*' } };
  }
  
  // Auto-detect emails
  if (/email/i.test(fieldName)) {
    return { mask: true, config: { showFirst: 3, showLast: 0, maskChar: '*' } };
  }
  
  return { mask: false };
}

/**
 * Sanitize a single value
 */
function sanitizeValue(key: string, value: unknown, entityType?: string, options?: SanitizeOptions): unknown {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Check if field should be removed
  if (isSensitiveField(key, entityType)) {
    if (options?.keepSensitive?.includes(key)) {
      // Keep but don't process further
      return value;
    }
    return undefined;
  }
  
  // Check if field should be masked
  const { mask, config } = shouldMaskField(key);
  if (mask && typeof value === 'string' && config) {
    if (options?.keepSensitive?.includes(key)) {
      return value;
    }
    return maskValue(value, config);
  }
  
  // Recursively sanitize objects and arrays
  if (Array.isArray(value)) {
    return value.map(item => 
      typeof item === 'object' && item !== null 
        ? sanitizeResponse(item, entityType, options) 
        : item
    );
  }
  
  if (typeof value === 'object' && value !== null) {
    // Handle Date objects
    if (value instanceof Date) {
      return value;
    }
    // Handle Buffer
    if (Buffer.isBuffer(value)) {
      return '[Buffer]';
    }
    // Recursively sanitize
    return sanitizeResponse(value, entityType, options);
  }
  
  return value;
}

// ============================================================================
// Main Sanitization Function
// ============================================================================

export interface SanitizeOptions {
  /** Fields to keep even if they're sensitive */
  keepSensitive?: string[];
  /** Remove null/undefined values from response */
  removeNulls?: boolean;
  /** Remove internal fields (prefixed with _) */
  removeInternal?: boolean;
  /** Custom fields to remove */
  removeFields?: string[];
  /** Enable field masking */
  enableMasking?: boolean;
}

/**
 * Sanitize an object for API response
 * 
 * @param data - The data to sanitize
 * @param entityType - The type of entity (user, rider, payment, etc.)
 * @param options - Sanitization options
 * @returns Sanitized data safe for API response
 */
export function sanitizeResponse<T extends Record<string, unknown>>(
  data: T,
  entityType?: string,
  options?: SanitizeOptions
): Partial<T> {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip internal fields if configured
    if (options?.removeInternal && key.startsWith('_')) {
      continue;
    }
    
    // Skip custom removal fields
    if (options?.removeFields?.includes(key)) {
      continue;
    }
    
    // Skip null/undefined if configured
    if (options?.removeNulls && (value === null || value === undefined)) {
      continue;
    }
    
    // Sanitize the value
    const sanitizedValue = sanitizeValue(key, value, entityType, options);
    
    // Only include if not explicitly removed
    if (sanitizedValue !== undefined || !isSensitiveField(key, entityType)) {
      sanitized[key] = sanitizedValue;
    }
  }
  
  return sanitized as Partial<T>;
}

/**
 * Sanitize an array of objects
 */
export function sanitizeArray<T extends Record<string, unknown>>(
  data: T[],
  entityType?: string,
  options?: SanitizeOptions
): Partial<T>[] {
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.map(item => sanitizeResponse(item, entityType, options));
}

// ============================================================================
// Pre-configured Sanitizers
// ============================================================================

export const sanitizeUser = (user: Record<string, unknown>, options?: SanitizeOptions) => 
  sanitizeResponse(user, 'user', { removeInternal: true, enableMasking: true, ...options });

export const sanitizeRider = (rider: Record<string, unknown>, options?: SanitizeOptions) => 
  sanitizeResponse(rider, 'rider', { removeInternal: true, enableMasking: true, ...options });

export const sanitizeMerchant = (merchant: Record<string, unknown>, options?: SanitizeOptions) => 
  sanitizeResponse(merchant, 'merchant', { removeInternal: true, enableMasking: true, ...options });

export const sanitizePayment = (payment: Record<string, unknown>, options?: SanitizeOptions) => 
  sanitizeResponse(payment, 'payment', { removeInternal: true, ...options });

export const sanitizeOrder = (order: Record<string, unknown>, options?: SanitizeOptions) => 
  sanitizeResponse(order, 'order', { removeInternal: true, enableMasking: true, ...options });

export const sanitizeTask = (task: Record<string, unknown>, options?: SanitizeOptions) => 
  sanitizeResponse(task, 'task', { removeInternal: true, enableMasking: true, ...options });

export const sanitizeSession = (session: Record<string, unknown>, options?: SanitizeOptions) => 
  sanitizeResponse(session, 'session', { removeInternal: true, ...options });

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a sanitized JSON response
 */
export function sanitizedJsonResponse<T extends Record<string, unknown>>(
  data: T,
  entityType?: string,
  options?: SanitizeOptions & { status?: number }
): NextResponse {
  const sanitized = sanitizeResponse(data, entityType, options);
  return NextResponse.json(sanitized, { status: options?.status || 200 });
}

/**
 * Create a sanitized success response
 */
export function sanitizedSuccessResponse<T extends Record<string, unknown>>(
  data: T,
  entityType?: string,
  options?: SanitizeOptions
): NextResponse {
  return sanitizedJsonResponse({ success: true, data }, entityType, options);
}

/**
 * Sanitize response data with pagination
 */
export function sanitizedPaginatedResponse<T extends Record<string, unknown>>(
  data: T[],
  entityType: string,
  pagination: { page: number; limit: number; total: number },
  options?: SanitizeOptions
): NextResponse {
  const sanitizedData = sanitizeArray(data, entityType, options);
  
  return NextResponse.json({
    success: true,
    data: sanitizedData,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

// ============================================================================
// Express/Next.js Middleware
// ============================================================================

/**
 * Middleware to automatically sanitize responses
 * Wrap your API handlers with this
 */
export function withResponseSanitization(
  handler: (req: Request) => Promise<NextResponse>,
  defaultEntityType?: string,
  defaultOptions?: SanitizeOptions
) {
  return async (req: Request): Promise<NextResponse> => {
    const response = await handler(req);
    
    // Only sanitize JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return response;
    }
    
    try {
      const data = await response.json();
      
      // Don't re-sanitize if already sanitized
      if (data._sanitized) {
        return NextResponse.json(data, { status: response.status });
      }
      
      const sanitized = sanitizeResponse(data, defaultEntityType, defaultOptions);
      
      return NextResponse.json(
        { ...sanitized, _sanitized: true },
        { status: response.status }
      );
    } catch {
      // If JSON parsing fails, return original response
      return response;
    }
  };
}
