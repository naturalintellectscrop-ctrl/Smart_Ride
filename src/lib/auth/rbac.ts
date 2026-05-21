/**
 * RBAC (Role-Based Access Control) Middleware
 * Production-grade permission system for Smart Ride admin operations
 * 
 * This module provides:
 * - Permission definitions for each admin role
 * - Resource-based access control
 * - Action-based permissions (create, read, update, delete, approve, reject)
 * - Middleware functions for API routes
 * - Audit logging for access attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireAuth, AuthResult, getAuthUser } from './guards';
import { db } from '@/lib/db';

// ============================================================================
// Types
// ============================================================================

/**
 * Actions that can be performed on resources
 */
export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'reject' | 'manage' | 'export' | 'assign' | 'dispatch';

/**
 * Resources that can be accessed
 */
export type Resource = 
  | 'tasks'
  | 'riders'
  | 'documents'
  | 'verification'
  | 'dispatch'
  | 'analytics'
  | 'payments'
  | 'wallets'
  | 'settlements'
  | 'commissions'
  | 'finance_reports'
  | 'users'
  | 'merchants'
  | 'orders'
  | 'health_orders'
  | 'prescriptions'
  | 'sos_alerts'
  | 'audit_logs'
  | 'system_config'
  | 'pricing_config'
  | 'disputes'
  | 'notifications';

/**
 * Permission check result
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiredRoles?: UserRole[];
}

/**
 * Permission definition for a role
 */
export interface RolePermissions {
  role: UserRole;
  resources: Record<Resource, Action[]>;
}

/**
 * Access log entry for audit
 */
export interface AccessLogEntry {
  userId: string;
  userRole: UserRole;
  action: Action;
  resource: Resource;
  resourceId?: string;
  allowed: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// ============================================================================
// Permission Matrix
// ============================================================================

/**
 * Complete permission matrix for all admin roles
 * Each role has specific actions they can perform on each resource
 */
export const PERMISSION_MATRIX: Record<UserRole, Record<Resource, Action[]>> = {
  // Super Admin - Full access to everything
  SUPER_ADMIN: {
    tasks: ['create', 'read', 'update', 'delete', 'assign', 'dispatch'],
    riders: ['create', 'read', 'update', 'delete', 'approve', 'reject'],
    documents: ['read', 'approve', 'reject'],
    verification: ['read', 'approve', 'reject', 'manage'],
    dispatch: ['read', 'update', 'manage'],
    analytics: ['read', 'export'],
    payments: ['create', 'read', 'update', 'delete', 'approve', 'reject'],
    wallets: ['create', 'read', 'update', 'delete'],
    settlements: ['create', 'read', 'update', 'delete', 'approve'],
    commissions: ['create', 'read', 'update', 'delete'],
    finance_reports: ['read', 'export'],
    users: ['create', 'read', 'update', 'delete', 'approve', 'reject'],
    merchants: ['create', 'read', 'update', 'delete', 'approve', 'reject'],
    orders: ['create', 'read', 'update', 'delete', 'assign'],
    health_orders: ['create', 'read', 'update', 'delete', 'approve'],
    prescriptions: ['read', 'approve', 'reject'],
    sos_alerts: ['read', 'update', 'manage'],
    audit_logs: ['read', 'export'],
    system_config: ['read', 'update', 'manage'],
    pricing_config: ['create', 'read', 'update', 'delete'],
    disputes: ['read', 'update', 'manage', 'approve', 'reject'],
    notifications: ['create', 'read', 'update', 'delete'],
  },

  // Operations Admin - Task management, rider management, dispatch operations
  OPERATIONS_ADMIN: {
    tasks: ['create', 'read', 'update', 'assign', 'dispatch'],
    riders: ['read', 'update'],
    documents: ['read'],
    verification: ['read'],
    dispatch: ['read', 'update', 'manage'],
    analytics: ['read', 'export'],
    payments: ['read'],
    wallets: ['read'],
    settlements: ['read'],
    commissions: ['read'],
    finance_reports: [],
    users: ['read'],
    merchants: ['read', 'update'],
    orders: ['read', 'update', 'assign'],
    health_orders: ['read', 'update'],
    prescriptions: ['read'],
    sos_alerts: ['read', 'update', 'manage'],
    audit_logs: ['read'],
    system_config: ['read'],
    pricing_config: ['read'],
    disputes: ['read', 'update'],
    notifications: ['create', 'read'],
  },

  // Compliance Admin - Verification, document review, compliance checks
  COMPLIANCE_ADMIN: {
    tasks: ['read'],
    riders: ['read', 'approve', 'reject'],
    documents: ['read', 'approve', 'reject'],
    verification: ['read', 'approve', 'reject', 'manage'],
    dispatch: ['read'],
    analytics: ['read'],
    payments: ['read'],
    wallets: ['read'],
    settlements: ['read'],
    commissions: ['read'],
    finance_reports: [],
    users: ['read', 'update', 'approve', 'reject'],
    merchants: ['read', 'approve', 'reject'],
    orders: ['read'],
    health_orders: ['read', 'approve'],
    prescriptions: ['read', 'approve', 'reject'],
    sos_alerts: ['read'],
    audit_logs: ['read', 'export'],
    system_config: ['read'],
    pricing_config: ['read'],
    disputes: ['read', 'manage'],
    notifications: ['read'],
  },

  // Finance Admin - Financial operations, settlements, payouts, commission management
  FINANCE_ADMIN: {
    tasks: ['read'],
    riders: ['read'],
    documents: ['read'],
    verification: ['read'],
    dispatch: ['read'],
    analytics: ['read'],
    payments: ['create', 'read', 'update', 'approve', 'reject'],
    wallets: ['create', 'read', 'update'],
    settlements: ['create', 'read', 'update', 'approve'],
    commissions: ['create', 'read', 'update'],
    finance_reports: ['read', 'export'],
    users: ['read'],
    merchants: ['read'],
    orders: ['read'],
    health_orders: ['read'],
    prescriptions: ['read'],
    sos_alerts: ['read'],
    audit_logs: ['read', 'export'],
    system_config: ['read'],
    pricing_config: ['read'],
    disputes: ['read', 'manage'],
    notifications: ['read'],
  },

  // Non-admin roles have minimal permissions (handled separately)
  ADMIN: {
    tasks: ['create', 'read', 'update', 'delete'],
    riders: ['read', 'update'],
    documents: ['read'],
    verification: ['read'],
    dispatch: ['read'],
    analytics: ['read'],
    payments: ['read'],
    wallets: ['read'],
    settlements: ['read'],
    commissions: ['read'],
    finance_reports: [],
    users: ['read'],
    merchants: ['read'],
    orders: ['read'],
    health_orders: ['read'],
    prescriptions: ['read'],
    sos_alerts: ['read'],
    audit_logs: ['read'],
    system_config: ['read'],
    pricing_config: ['read'],
    disputes: ['read'],
    notifications: ['read'],
  },

  // Non-admin roles have no permissions on admin resources
  CLIENT: createEmptyPermissions(),
  RIDER: createEmptyPermissions(),
  MERCHANT: createEmptyPermissions(),
  PHARMACIST: createEmptyPermissions(),
};

/**
 * Create an empty permissions object for non-admin roles
 */
function createEmptyPermissions(): Record<Resource, Action[]> {
  return {
    tasks: [],
    riders: [],
    documents: [],
    verification: [],
    dispatch: [],
    analytics: [],
    payments: [],
    wallets: [],
    settlements: [],
    commissions: [],
    finance_reports: [],
    users: [],
    merchants: [],
    orders: [],
    health_orders: [],
    prescriptions: [],
    sos_alerts: [],
    audit_logs: [],
    system_config: [],
    pricing_config: [],
    disputes: [],
    notifications: [],
  };
}

// ============================================================================
// Core Permission Functions
// ============================================================================

/**
 * Check if a role has permission to perform an action on a resource
 */
export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action
): PermissionResult {
  // Super admin always has access
  if (role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  // Get permissions for the role
  const rolePermissions = PERMISSION_MATRIX[role];
  
  if (!rolePermissions) {
    return { 
      allowed: false, 
      reason: `No permissions defined for role: ${role}` 
    };
  }

  // Get allowed actions for the resource
  const allowedActions = rolePermissions[resource];
  
  if (!allowedActions || allowedActions.length === 0) {
    return { 
      allowed: false, 
      reason: `No access to resource: ${resource}`,
      requiredRoles: getRolesWithPermission(resource, action)
    };
  }

  // Check if the action is allowed
  if (allowedActions.includes(action)) {
    return { allowed: true };
  }

  // 'manage' action includes create, read, update, delete
  if (action !== 'manage' && allowedActions.includes('manage')) {
    return { allowed: true };
  }

  return { 
    allowed: false, 
    reason: `Action '${action}' not permitted on resource '${resource}'`,
    requiredRoles: getRolesWithPermission(resource, action)
  };
}

/**
 * Get all roles that have a specific permission
 */
export function getRolesWithPermission(resource: Resource, action: Action): UserRole[] {
  const roles: UserRole[] = [];
  
  for (const [role, permissions] of Object.entries(PERMISSION_MATRIX)) {
    const resourcePermissions = permissions[resource];
    if (resourcePermissions && (resourcePermissions.includes(action) || resourcePermissions.includes('manage'))) {
      roles.push(role as UserRole);
    }
  }
  
  return roles;
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: UserRole): Record<Resource, Action[]> {
  const permissions = PERMISSION_MATRIX[role];
  return permissions || createEmptyPermissions();
}

/**
 * Check if user is an admin (any admin type)
 */
export function isAdminRole(role: UserRole): boolean {
  const adminRoles: UserRole[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];
  return adminRoles.includes(role);
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Require permission for API route
 * Returns AuthResult with permission check
 */
export function requirePermission(
  req: NextRequest,
  resource: Resource,
  action: Action
): AuthResult & { permissionResult?: PermissionResult } {
  // First check authentication
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  // Check permission
  const permissionResult = hasPermission(authResult.user!.role, resource, action);
  
  if (!permissionResult.allowed) {
    return {
      success: false,
      error: permissionResult.reason || 'Insufficient permissions',
      statusCode: 403,
      permissionResult,
    };
  }

  return {
    success: true,
    user: authResult.user,
    permissionResult,
  };
}

/**
 * Require any admin role
 */
export function requireAnyAdmin(req: NextRequest): AuthResult {
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

  return authResult;
}

/**
 * Require specific admin roles
 */
export function requireAdminRoles(
  req: NextRequest,
  allowedRoles: UserRole[]
): AuthResult {
  const authResult = requireAuth(req);
  
  if (!authResult.success) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: `Requires one of: ${allowedRoles.join(', ')}`,
      statusCode: 403,
    };
  }

  return authResult;
}

// ============================================================================
// Access Logging for Audit
// ============================================================================

/**
 * Log access attempt for audit purposes
 */
export async function logAccessAttempt(entry: AccessLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.userId,
        actorType: 'ADMIN',
        action: `${entry.action}:${entry.resource}`,
        entityType: entry.resource,
        entityId: entry.resourceId || 'N/A',
        description: entry.reason || (entry.allowed ? 'Access granted' : 'Access denied'),
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log access attempt:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Create access log entry from request
 */
export function createAccessLogEntry(
  req: NextRequest,
  action: Action,
  resource: Resource,
  resourceId: string | undefined,
  allowed: boolean,
  reason?: string
): AccessLogEntry | null {
  const user = getAuthUser(req);
  
  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    userRole: user.role,
    action,
    resource,
    resourceId,
    allowed,
    reason,
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    timestamp: new Date(),
  };
}

// ============================================================================
// Wrapper Functions for API Routes
// ============================================================================

/**
 * Wrap API handler with permission check
 */
export function withPermission(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  resource: Resource,
  action: Action,
  options?: {
    logAccess?: boolean;
    resourceIdParam?: string; // Parameter name for resource ID in context
  }
) {
  return async (req: NextRequest, context?: unknown) => {
    const permissionResult = requirePermission(req, resource, action);
    
    if (!permissionResult.success) {
      // Log failed access attempt
      if (options?.logAccess !== false) {
        const resourceId = options?.resourceIdParam 
          ? (context as Record<string, { params: Record<string, string> }>)?.params?.[options.resourceIdParam]
          : undefined;
        
        const logEntry = createAccessLogEntry(
          req,
          action,
          resource,
          resourceId,
          false,
          permissionResult.error
        );
        
        if (logEntry) {
          await logAccessAttempt(logEntry);
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: permissionResult.error,
          requiredRoles: permissionResult.permissionResult?.requiredRoles
        },
        { status: permissionResult.statusCode || 403 }
      );
    }

    // Execute handler
    const response = await handler(req, context);

    // Log successful access
    if (options?.logAccess !== false) {
      const resourceId = options?.resourceIdParam 
        ? (context as Record<string, { params: Record<string, string> }>)?.params?.[options.resourceIdParam]
        : undefined;
      
      const logEntry = createAccessLogEntry(req, action, resource, resourceId, true);
      
      if (logEntry) {
        await logAccessAttempt(logEntry);
      }
    }

    return response;
  };
}

/**
 * Wrap API handler with admin-only access
 */
export function withAdminAccess(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  options?: {
    allowedRoles?: UserRole[];
    logAccess?: boolean;
  }
) {
  return async (req: NextRequest, context?: unknown) => {
    const authResult = options?.allowedRoles
      ? requireAdminRoles(req, options.allowedRoles)
      : requireAnyAdmin(req);
    
    if (!authResult.success) {
      // Log failed access attempt
      if (options?.logAccess !== false) {
        const user = getAuthUser(req);
        const logEntry: AccessLogEntry = {
          userId: user?.userId || 'unknown',
          userRole: user?.role || 'CLIENT',
          action: 'read',
          resource: 'system_config',
          allowed: false,
          reason: authResult.error,
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          timestamp: new Date(),
        };
        
        await logAccessAttempt(logEntry);
      }
      
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 403 }
      );
    }

    return handler(req, context);
  };
}

// ============================================================================
// Resource-Specific Permission Helpers
// ============================================================================

/**
 * Check if user can manage tasks
 */
export function canManageTasks(role: UserRole): boolean {
  return hasPermission(role, 'tasks', 'manage').allowed;
}

/**
 * Check if user can approve/reject riders
 */
export function canApproveRiders(role: UserRole): boolean {
  return hasPermission(role, 'riders', 'approve').allowed || 
         hasPermission(role, 'riders', 'reject').allowed;
}

/**
 * Check if user can manage financial operations
 */
export function canManageFinances(role: UserRole): boolean {
  return hasPermission(role, 'payments', 'manage').allowed ||
         hasPermission(role, 'settlements', 'manage').allowed ||
         hasPermission(role, 'commissions', 'manage').allowed;
}

/**
 * Check if user can view financial reports
 */
export function canViewFinancialReports(role: UserRole): boolean {
  return hasPermission(role, 'finance_reports', 'read').allowed;
}

/**
 * Check if user can verify documents
 */
export function canVerifyDocuments(role: UserRole): boolean {
  return hasPermission(role, 'documents', 'approve').allowed ||
         hasPermission(role, 'documents', 'reject').allowed;
}

/**
 * Check if user can manage dispatch operations
 */
export function canManageDispatch(role: UserRole): boolean {
  return hasPermission(role, 'dispatch', 'manage').allowed;
}

/**
 * Check if user can access audit logs
 */
export function canAccessAuditLogs(role: UserRole): boolean {
  return hasPermission(role, 'audit_logs', 'read').allowed;
}

/**
 * Check if user can manage system configuration
 */
export function canManageSystemConfig(role: UserRole): boolean {
  return hasPermission(role, 'system_config', 'manage').allowed;
}

// ============================================================================
// Permission Summary for UI
// ============================================================================

/**
 * Get a summary of permissions for display in admin UI
 */
export function getPermissionSummary(role: UserRole): {
  canManageOperations: boolean;
  canManageCompliance: boolean;
  canManageFinances: boolean;
  canManageSystem: boolean;
  canViewReports: boolean;
  canAccessAuditLogs: boolean;
} {
  return {
    canManageOperations: canManageTasks(role) || canManageDispatch(role),
    canManageCompliance: canApproveRiders(role) || canVerifyDocuments(role),
    canManageFinances: canManageFinances(role),
    canManageSystem: canManageSystemConfig(role),
    canViewReports: canViewFinancialReports(role) || hasPermission(role, 'analytics', 'read').allowed,
    canAccessAuditLogs: canAccessAuditLogs(role),
  };
}
