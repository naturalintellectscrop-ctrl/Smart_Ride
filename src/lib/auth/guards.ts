/**
 * Authentication and Authorization Guards
 * Production-grade security module for API route protection
 * 
 * This module provides:
 * - Authentication verification (JWT validation)
 * - Role-based access control (RBAC)
 * - Resource ownership verification (IDOR prevention)
 * - Webhook signature verification
 * - Rate limiting integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload, isAdmin as isAdminCheck, hasRole } from './jwt';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import crypto from 'crypto';

// Re-export isAdmin for convenience
export { isAdmin } from './jwt';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

export interface AuthResult {
  success: boolean;
  user?: JWTPayload;
  error?: string;
  statusCode?: number;
}

export interface ResourceOwnershipCheck {
  userId: string;
  resourceId: string;
  resourceType: 'task' | 'order' | 'rider' | 'merchant' | 'user' | 'prescription' | 'payment' | 'wallet';
  allowAdmin?: boolean;
}

// ============================================================================
// Core Authentication Functions
// ============================================================================

/**
 * Get authenticated user from request
 * Returns null if not authenticated (doesn't throw)
 */
export function getAuthUser(req: NextRequest): JWTPayload | null {
  const authHeader = req.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) return null;
  
  return verifyAccessToken(token);
}

/**
 * Require authentication - returns error response if not authenticated
 * Use this in API routes that require authentication
 */
export function requireAuth(req: NextRequest): AuthResult {
  const user = getAuthUser(req);
  
  if (!user) {
    return {
      success: false,
      error: 'Authentication required',
      statusCode: 401,
    };
  }
  
  return {
    success: true,
    user,
  };
}

/**
 * Require specific role(s) - returns error response if not authorized
 * Use this for role-restricted endpoints
 */
export function requireRole(req: NextRequest, allowedRoles: UserRole[]): AuthResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }
  
  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: 'Insufficient permissions',
      statusCode: 403,
    };
  }
  
  return authResult;
}

/**
 * Require admin role - convenience function for admin-only endpoints
 */
export function requireAdmin(req: NextRequest): AuthResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }
  
  if (!isAdminCheck(authResult.user!.role)) {
    return {
      success: false,
      error: 'Admin access required',
      statusCode: 403,
    };
  }
  
  return authResult;
}

/**
 * Require super admin - for critical operations
 */
export function requireSuperAdmin(req: NextRequest): AuthResult {
  return requireRole(req, ['SUPER_ADMIN']);
}

/**
 * Require system access - for internal service-to-service calls
 * Uses API key authentication
 */
export function requireSystem(req: NextRequest): AuthResult {
  const apiKey = req.headers.get('x-api-key');
  const systemKey = process.env.SYSTEM_API_KEY;
  
  if (!systemKey) {
    console.error('SYSTEM_API_KEY not configured');
    return {
      success: false,
      error: 'System authentication not configured',
      statusCode: 500,
    };
  }
  
  if (!apiKey || apiKey !== systemKey) {
    return {
      success: false,
      error: 'Invalid system credentials',
      statusCode: 401,
    };
  }
  
  return {
    success: true,
    user: {
      userId: 'system',
      email: 'system@smartride.internal',
      role: 'SUPER_ADMIN',
      name: 'System',
    },
  };
}

// ============================================================================
// IDOR (Insecure Direct Object Reference) Protection
// ============================================================================

/**
 * Verify resource ownership - prevents IDOR attacks
 * Checks if the authenticated user owns or has access to a resource
 */
export async function verifyResourceOwnership(
  req: NextRequest,
  check: ResourceOwnershipCheck
): Promise<AuthResult> {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }
  
  const { userId, resourceId, resourceType, allowAdmin = true } = check;
  const currentUserId = authResult.user!.userId;
  
  // Admin bypass (if allowed)
  if (allowAdmin && isAdminCheck(authResult.user!.role)) {
    return authResult;
  }
  
  // Check if user is accessing their own resource
  if (userId === currentUserId) {
    return authResult;
  }
  
  // Resource-specific ownership checks
  try {
    const hasAccess = await checkResourceAccess(currentUserId, resourceId, resourceType, authResult.user!.role);
    
    if (!hasAccess) {
      return {
        success: false,
        error: 'Access denied to this resource',
        statusCode: 403,
      };
    }
    
    return authResult;
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    return {
      success: false,
      error: 'Failed to verify resource access',
      statusCode: 500,
    };
  }
}

/**
 * Check resource access based on type and relationships
 */
async function checkResourceAccess(
  userId: string,
  resourceId: string,
  resourceType: string,
  userRole: UserRole
): Promise<boolean> {
  switch (resourceType) {
    case 'task': {
      const task = await db.task.findUnique({
        where: { id: resourceId },
        select: { clientId: true, riderId: true },
      });
      return task?.clientId === userId || task?.riderId === userId;
    }
    
    case 'order': {
      const order = await db.order.findUnique({
        where: { id: resourceId },
        select: { clientId: true, merchantId: true, riderId: true },
      });
      
      // Check if user is the client
      if (order?.clientId === userId) return true;
      
      // Check if user is the merchant (via Rider relation)
      if (order?.merchantId) {
        const merchant = await db.merchant.findUnique({
          where: { id: order.merchantId },
          select: { userId: true },
        });
        if (merchant?.userId === userId) return true;
      }
      
      // Check if user is the assigned rider
      const rider = await db.rider.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (rider && order?.riderId === rider.id) return true;
      
      return false;
    }
    
    case 'rider': {
      const rider = await db.rider.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });
      return rider?.userId === userId;
    }
    
    case 'merchant': {
      const merchant = await db.merchant.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });
      return merchant?.userId === userId;
    }
    
    case 'user': {
      return resourceId === userId;
    }
    
    case 'prescription': {
      const prescription = await db.prescription.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });
      return prescription?.userId === userId;
    }
    
    case 'payment': {
      const payment = await db.payment.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });
      return payment?.userId === userId;
    }
    
    case 'wallet': {
      const wallet = await db.wallet.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });
      return wallet?.userId === userId;
    }
    
    default:
      return false;
  }
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify MTN MoMo webhook signature
 */
export function verifyMtnSignature(req: NextRequest, body: string): boolean {
  const signature = req.headers.get('x-mtn-signature');
  const secret = process.env.MTN_MOMO_SECRET_KEY;
  
  if (!signature || !secret) {
    return false;
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Verify Airtel Money webhook signature
 */
export function verifyAirtelSignature(req: NextRequest, body: string): boolean {
  const signature = req.headers.get('x-airtel-signature') || req.headers.get('x-signature');
  const secret = process.env.AIRTEL_MONEY_SECRET_KEY;
  
  if (!signature || !secret) {
    return false;
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Verify Flutterwave webhook signature
 */
export function verifyFlutterwaveSignature(req: NextRequest, body: string): boolean {
  const signature = req.headers.get('verif-hash');
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  
  if (!signature || !secret) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(secret)
    );
  } catch {
    return false;
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create unauthorized response (401)
 */
export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Create forbidden response (403)
 */
export function forbiddenResponse(message: string = 'Insufficient permissions'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

// ============================================================================
// Middleware Wrappers
// ============================================================================

/**
 * Wrap API handler with authentication
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: {
    requiredRoles?: UserRole[];
    allowUnauthenticated?: boolean;
  }
) {
  return async (req: NextRequest, context?: unknown) => {
    const authResult = requireAuth(req);
    
    if (!authResult.success) {
      if (options?.allowUnauthenticated) {
        // Continue without user context
        return handler(req as AuthenticatedRequest, context);
      }
      return unauthorizedResponse(authResult.error);
    }
    
    // Check role requirements
    if (options?.requiredRoles && options.requiredRoles.length > 0) {
      if (!options.requiredRoles.includes(authResult.user!.role)) {
        return forbiddenResponse();
      }
    }
    
    // Attach user to request
    (req as AuthenticatedRequest).user = authResult.user!;
    
    return handler(req as AuthenticatedRequest, context);
  };
}

/**
 * Wrap API handler with admin-only access
 */
export function withAdminOnly(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown) => {
    const authResult = requireAdmin(req);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    
    (req as AuthenticatedRequest).user = authResult.user!;
    
    return handler(req as AuthenticatedRequest, context);
  };
}

/**
 * Wrap API handler with system-only access (for internal webhooks)
 */
export function withSystemOnly(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown) => {
    const authResult = requireSystem(req);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    
    (req as AuthenticatedRequest).user = authResult.user!;
    
    return handler(req as AuthenticatedRequest, context);
  };
}

/**
 * Wrap API handler with resource ownership verification
 */
export function withResourceOwnership(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  getResourceCheck: (req: NextRequest, context?: unknown) => ResourceOwnershipCheck
) {
  return async (req: NextRequest, context?: unknown) => {
    const check = getResourceCheck(req, context);
    const authResult = await verifyResourceOwnership(req, check);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    
    (req as AuthenticatedRequest).user = authResult.user!;
    
    return handler(req as AuthenticatedRequest, context);
  };
}

// ============================================================================
// Role Helper Functions
// ============================================================================

/**
 * Check if user can perform task actions
 */
export function canPerformTaskAction(userRole: UserRole, action: 'create' | 'accept' | 'complete' | 'cancel'): boolean {
  const permissions: Record<UserRole, string[]> = {
    CLIENT: ['create', 'cancel'],
    RIDER: ['accept', 'complete', 'cancel'],
    MERCHANT: ['create', 'cancel'],
    PHARMACIST: ['create', 'cancel'],
    ADMIN: ['create', 'accept', 'complete', 'cancel'],
    SUPER_ADMIN: ['create', 'accept', 'complete', 'cancel'],
    OPERATIONS_ADMIN: ['create', 'accept', 'complete', 'cancel'],
    COMPLIANCE_ADMIN: ['cancel'],
    FINANCE_ADMIN: [],
  };
  
  return permissions[userRole]?.includes(action) ?? false;
}

/**
 * Check if user can access financial data
 */
export function canAccessFinancials(userRole: UserRole): boolean {
  return ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'].includes(userRole);
}

/**
 * Check if user can manage riders
 */
export function canManageRiders(userRole: UserRole): boolean {
  return ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN'].includes(userRole);
}

/**
 * Check if user can manage merchants
 */
export function canManageMerchants(userRole: UserRole): boolean {
  return ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(userRole);
}
