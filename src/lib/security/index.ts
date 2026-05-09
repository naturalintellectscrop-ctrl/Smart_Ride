/**
 * Security Module Index
 * 
 * Export all security components for easy import
 * Phase 2 Security Hardening Complete
 */

// Rate Limiting
export { RATE_LIMITS, checkRateLimit, rateLimitResponse, withRateLimit, getClientIp, blockIp, isIpBlocked, unblockIp } from './rate-limit';

// Audit Logging
export { securityAudit, logAuthEvent, logAdminAction, logSecurityEvent, getRequestContext } from './audit-log';

// Input Sanitization
export { sanitizeInput, sanitizeString, sanitizePhone, sanitizeEmail, escapeHtml, commonSchemas, phoneSchema, emailSchema, sanitizeRequestBody, stripDangerousChars, hasSqlInjection, assertNoSqlInjection } from './input-sanitization';

// Environment Validation
export { validateEnvironment, ensureEnvValid, getEnv, getEnvNumber, getEnvBoolean, getEnvValidation } from './env-validation';

// Security Headers
export { addSecurityHeaders, secureApiResponse, handleCors, handlePreflight, withSecurityHeaders, getApiSecurityHeaders } from './security-headers';

// Webhook Protection
export { isWebhookProcessed, validateWebhookTimestamp, recordWebhookProcessed, webhookDuplicateResponse, webhookErrorResponse, webhookSuccessResponse, processMtnWebhook, processAirtelWebhook, processFlutterwaveWebhook } from './webhook-protection';

// Response Sanitization (NEW - TASK 3)
export { 
  sanitizeResponse, 
  sanitizeArray,
  sanitizeUser, 
  sanitizeRider, 
  sanitizeMerchant, 
  sanitizePayment, 
  sanitizeOrder, 
  sanitizeTask, 
  sanitizeSession,
  sanitizedJsonResponse,
  sanitizedSuccessResponse,
  sanitizedPaginatedResponse,
  withResponseSanitization
} from './response-sanitization';

// Admin Safety (NEW - TASK 9)
export {
  generateConfirmationToken,
  validateConfirmationToken,
  validateAdminAction,
  withAdminSafety,
  isAdminIpAllowed,
  verifyAdminPassword,
  trackAdminSession,
  isAdminSessionValid,
  invalidateAdminSession,
  checkCooldown,
  recordAction,
  CRITICAL_ACTIONS,
  getActionConfig
} from './admin-safety';

// Types
export type { RateLimitConfig } from './rate-limit';
export type { AuditAction, EntityType, ActorType, AuditLogEntry } from './audit-log';
export type { WebhookRecord } from './webhook-protection';
export type { SanitizeOptions } from './response-sanitization';
export type { CriticalAction, AdminActionConfirmation, AdminActionResult } from './admin-safety';
