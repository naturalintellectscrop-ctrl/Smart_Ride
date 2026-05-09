/**
 * Input Sanitization Module
 * 
 * Provides global input sanitization for all API endpoints:
 * - String trimming and normalization
 * - Script injection prevention
 * - HTML entity encoding
 * - SQL injection prevention (additional layer)
 */

import { z } from 'zod';

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Trim and normalize a string
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  
  return value
    .trim()
    .normalize('NFC') // Normalize Unicode
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(value: string): string {
  if (typeof value !== 'string') return value;
  
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  
  return value.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char);
}

/**
 * Remove potentially dangerous characters
 */
export function stripDangerousChars(value: string): string {
  if (typeof value !== 'string') return value;
  
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, ''); // Remove data: protocol
}

/**
 * Comprehensive string sanitization
 */
export function sanitizeInput(value: unknown): unknown {
  if (typeof value === 'string') {
    let sanitized = sanitizeString(value);
    sanitized = stripDangerousChars(sanitized);
    return sanitized;
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }
  
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[sanitizeString(key)] = sanitizeInput(val);
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Sanitize phone number (Uganda format)
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Normalize Ugandan phone numbers
  if (cleaned.startsWith('256')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    cleaned = '+256' + cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return email;
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w.@+-]/g, ''); // Remove invalid email characters
}

// ============================================================================
// Zod Refinements
// ============================================================================

/**
 * Zod refinement for sanitized string
 */
export const sanitizedString = z.string().transform(val => {
  let sanitized = sanitizeString(val);
  sanitized = stripDangerousChars(sanitized);
  return sanitized;
});

/**
 * Zod refinement for safe text (with HTML escaping for display)
 */
export const safeText = z.string().transform(val => {
  let sanitized = sanitizeString(val);
  sanitized = stripDangerousChars(sanitized);
  return escapeHtml(sanitized);
});

/**
 * Zod refinement for phone number
 */
export const phoneSchema = z.string()
  .min(10, 'Phone number is too short')
  .max(15, 'Phone number is too long')
  .transform(sanitizePhone);

/**
 * Zod refinement for email
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .transform(sanitizeEmail);

// ============================================================================
// Request Sanitization Middleware
// ============================================================================

/**
 * Sanitize request body recursively
 */
export function sanitizeRequestBody<T>(body: T): T {
  return sanitizeInput(body) as T;
}

/**
 * Create sanitized Zod schema
 */
export function createSanitizedSchema<T extends z.ZodRawShape>(shape: T): z.ZodObject<T> {
  const sanitizedShape: Record<string, z.ZodTypeAny> = {};
  
  for (const [key, schema] of Object.entries(shape)) {
    if (schema instanceof z.ZodString) {
      // Wrap string schemas with sanitization
      sanitizedShape[key] = schema.transform(val => {
        let sanitized = sanitizeString(val);
        sanitized = stripDangerousChars(sanitized);
        return sanitized;
      });
    } else {
      sanitizedShape[key] = schema;
    }
  }
  
  return z.object(sanitizedShape as T);
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

export const commonSchemas = {
  // ID validation (CUID format)
  id: z.string().cuid(),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  
  // Search query
  search: z.string().max(100).transform(val => {
    let sanitized = sanitizeString(val);
    sanitized = stripDangerousChars(sanitized);
    return sanitized;
  }),
  
  // Date range
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
  
  // Coordinates
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  
  // Address
  address: sanitizedString.max(500),
  
  // Name
  name: sanitizedString.min(2).max(100),
  
  // Description
  description: sanitizedString.max(2000).optional(),
  
  // Notes
  notes: sanitizedString.max(1000).optional(),
};

// ============================================================================
// SQL Injection Prevention (Additional Layer)
// ============================================================================

/**
 * Check for potential SQL injection patterns
 */
export function hasSqlInjection(value: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
    /(\b(UNION|JOIN|WHERE|FROM|INTO|VALUES)\b)/i,
    /(--)/,
    /(\/\*)/,
    /(\*\/)/,
    /(;)/,
    /(')/,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(value));
}

/**
 * Validate that input doesn't contain SQL injection
 */
export function assertNoSqlInjection(value: string, fieldName: string = 'input'): void {
  if (hasSqlInjection(value)) {
    throw new Error(`Invalid ${fieldName}: contains disallowed characters`);
  }
}
