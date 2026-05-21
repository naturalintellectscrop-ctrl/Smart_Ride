/**
 * Admin Guard Functions for API Routes
 * Production-grade role-based guards for admin operations
 * 
 * This module provides:
 * - Guard functions for specific admin roles
 * - Combined guards for shared access
 * - Convenience wrappers for common permission patterns
 * - Response helpers for forbidden/unauthorized responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { 
  requireAuth, 
  AuthResult, 
  getAuthUser,
  forbiddenResponse,
  unauthorizedResponse,
  AuthenticatedRequest 
} from './guards';
import {
  hasPermission,
  isAdminRole,
  requireAnyAdmin,
  requireAdminRoles,
  logAccessAttempt,
  createAccessLogEntry,
  Action,
  Resource,
  AccessLogEntry,
} from './rbac';

// ============================================================================
// Types
// ============================================================================

/**
 * Guard result with additional context
 */
export interface GuardResult extends AuthResult {
  adminRole?: 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'COMPLIANCE_ADMIN' | 'FINANCE_ADMIN' | 'ADMIN';
}

/**
 * Guard function type
 */
export type GuardFunction = (req: NextRequest) => GuardResult;

/**
 * Combined guard options
 */
export interface CombinedGuardOptions {
  logAccess?: boolean;
  resource?: Resource;
  action?: Action;
}

// ============================================================================
// Individual Admin Role Guards
// ============================================================================

/**
 * Super Admin Guard
 * Only SUPER_ADMIN role can access
 * Full access to all system features
 */
export function superAdminGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user!.role !== 'SUPER_ADMIN') {
    return {
      success: false,
      error: 'Super Admin access required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: 'SUPER_ADMIN',
  };
}

/**
 * Operations Admin Guard
 * OPERATIONS_ADMIN and SUPER_ADMIN can access
 * Can manage: tasks, riders, dispatch, analytics
 */
export function operationsAdminGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'OPERATIONS_ADMIN'];
  
  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: 'Operations Admin access required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'OPERATIONS_ADMIN',
  };
}

/**
 * Compliance Admin Guard
 * COMPLIANCE_ADMIN and SUPER_ADMIN can access
 * Can manage: verification, documents, compliance checks
 */
export function complianceAdminGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'];
  
  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: 'Compliance Admin access required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'COMPLIANCE_ADMIN',
  };
}

/**
 * Finance Admin Guard
 * FINANCE_ADMIN and SUPER_ADMIN can access
 * Can manage: payments, wallets, settlements, commissions, finance reports
 */
export function financeAdminGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'FINANCE_ADMIN'];
  
  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: 'Finance Admin access required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'FINANCE_ADMIN',
  };
}

// ============================================================================
// Combined Guards (Shared Access)
// ============================================================================

/**
 * Operations or Compliance Guard
 * For resources shared between Operations and Compliance admins
 * Allowed: SUPER_ADMIN, OPERATIONS_ADMIN, COMPLIANCE_ADMIN
 */
export function operationsOrComplianceGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN'];
  
  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: 'Operations or Compliance Admin access required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * Operations or Finance Guard
 * For resources shared between Operations and Finance admins
 * Allowed: SUPER_ADMIN, OPERATIONS_ADMIN, FINANCE_ADMIN
 */
export function operationsOrFinanceGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'];
  
  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: 'Operations or Finance Admin access required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * Compliance or Finance Guard
 * For resources shared between Compliance and Finance admins
 * Allowed: SUPER_ADMIN, COMPLIANCE_ADMIN, FINANCE_ADMIN
 */
export function complianceOrFinanceGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];
  
  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: 'Compliance or Finance Admin access required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * All Admins Guard
 * Any admin role can access (read-only for some resources)
 * Allowed: SUPER_ADMIN, OPERATIONS_ADMIN, COMPLIANCE_ADMIN, FINANCE_ADMIN, ADMIN
 */
export function allAdminsGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  if (!isAdminRole(authResult.user!.role)) {
    return {
      success: false,
      error: 'Admin access required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

// ============================================================================
// Resource-Specific Guards
// ============================================================================

/**
 * Task Management Guard
 * Operations and Super Admin can manage tasks
 */
export function taskManagementGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const permission = hasPermission(authResult.user!.role, 'tasks', 'manage');
  
  if (!permission.allowed) {
    return {
      success: false,
      error: permission.reason || 'Task management permission required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * Rider Verification Guard
 * Compliance and Super Admin can approve/reject riders
 */
export function riderVerificationGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const permission = hasPermission(authResult.user!.role, 'riders', 'approve');
  
  if (!permission.allowed) {
    return {
      success: false,
      error: permission.reason || 'Rider verification permission required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * Document Verification Guard
 * Compliance and Super Admin can approve/reject documents
 */
export function documentVerificationGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const permission = hasPermission(authResult.user!.role, 'documents', 'approve');
  
  if (!permission.allowed) {
    return {
      success: false,
      error: permission.reason || 'Document verification permission required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * Financial Operations Guard
 * Finance and Super Admin can manage financial operations
 */
export function financialOperationsGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const permission = hasPermission(authResult.user!.role, 'payments', 'manage');
  
  if (!permission.allowed) {
    return {
      success: false,
      error: permission.reason || 'Financial operations permission required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * Settlement Management Guard
 * Finance and Super Admin can manage settlements
 */
export function settlementManagementGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const permission = hasPermission(authResult.user!.role, 'settlements', 'manage');
  
  if (!permission.allowed) {
    return {
      success: false,
      error: permission.reason || 'Settlement management permission required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * Audit Log Access Guard
 * Compliance, Finance, and Super Admin can access audit logs
 */
export function auditLogAccessGuard(req: NextRequest): GuardResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const permission = hasPermission(authResult.user!.role, 'audit_logs', 'read');
  
  if (!permission.allowed) {
    return {
      success: false,
      error: permission.reason || 'Audit log access permission required',
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: authResult.user,
    adminRole: authResult.user!.role as GuardResult['adminRole'],
  };
}

/**
 * System Configuration Guard
 * Only Super Admin can manage system configuration
 */
export function systemConfigGuard(req: NextRequest): GuardResult {
  return superAdminGuard(req);
}

// ============================================================================
// Wrapper Functions for API Routes
// ============================================================================

/**
 * Wrap handler with guard function
 */
export function withGuard(
  guard: GuardFunction,
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: CombinedGuardOptions
) {
  return async (req: NextRequest, context?: unknown) => {
    const guardResult = guard(req);
    
    if (!guardResult.success) {
      // Log failed access attempt
      if (options?.logAccess !== false) {
        const user = getAuthUser(req);
        const logEntry: AccessLogEntry = {
          userId: user?.userId || 'unknown',
          userRole: user?.role || 'CLIENT',
          action: options?.action || 'read',
          resource: options?.resource || 'system_config',
          allowed: false,
          reason: guardResult.error,
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          timestamp: new Date(),
        };
        
        await logAccessAttempt(logEntry);
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: guardResult.error,
          statusCode: guardResult.statusCode
        },
        { status: guardResult.statusCode || 403 }
      );
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = guardResult.user!;
    
    return handler(req as AuthenticatedRequest, context);
  };
}

/**
 * Wrap handler with Super Admin guard
 */
export function withSuperAdmin(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: CombinedGuardOptions
) {
  return withGuard(superAdminGuard, handler, options);
}

/**
 * Wrap handler with Operations Admin guard
 */
export function withOperationsAdmin(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: CombinedGuardOptions
) {
  return withGuard(operationsAdminGuard, handler, options);
}

/**
 * Wrap handler with Compliance Admin guard
 */
export function withComplianceAdmin(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: CombinedGuardOptions
) {
  return withGuard(complianceAdminGuard, handler, options);
}

/**
 * Wrap handler with Finance Admin guard
 */
export function withFinanceAdmin(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: CombinedGuardOptions
) {
  return withGuard(financeAdminGuard, handler, options);
}

/**
 * Wrap handler with All Admins guard
 */
export function withAnyAdmin(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: CombinedGuardOptions
) {
  return withGuard(allAdminsGuard, handler, options);
}

// ============================================================================
// Permission Check Helpers
// ============================================================================

/**
 * Check if user has specific permission and return boolean
 * Useful for conditional logic in handlers
 */
export function checkPermission(
  req: NextRequest,
  resource: Resource,
  action: Action
): { allowed: boolean; user?: AuthenticatedRequest['user'] } {
  const user = getAuthUser(req);
  
  if (!user) {
    return { allowed: false };
  }

  const result = hasPermission(user.role, resource, action);
  
  return {
    allowed: result.allowed,
    user,
  };
}

/**
 * Assert permission or throw error
 * Use in server-side code that expects permission
 */
export function assertPermission(
  req: NextRequest,
  resource: Resource,
  action: Action
): AuthenticatedRequest['user'] {
  const user = getAuthUser(req);
  
  if (!user) {
    throw new Error('Authentication required');
  }

  const result = hasPermission(user.role, resource, action);
  
  if (!result.allowed) {
    throw new Error(result.reason || 'Permission denied');
  }

  return user;
}

/**
 * Get user's admin role type
 * Returns null if not an admin
 */
export function getAdminRole(role: UserRole): GuardResult['adminRole'] | null {
  if (!isAdminRole(role)) {
    return null;
  }
  
  return role as GuardResult['adminRole'];
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create permission denied response
 */
export function permissionDeniedResponse(
  message: string = 'Permission denied',
  requiredRoles?: UserRole[]
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      requiredRoles,
    },
    { status: 403 }
  );
}

/**
 * Create admin required response
 */
export function adminRequiredResponse(message: string = 'Admin access required'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 403 }
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  unauthorizedResponse,
  forbiddenResponse,
};
