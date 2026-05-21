/**
 * RBAC API Route
 * Endpoints for checking user permissions and access rights
 * 
 * GET  /api/admin/rbac - Get current user's permissions
 * POST /api/admin/rbac - Verify access for specific resource/action
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { 
  getAuthUser,
  unauthorizedResponse,
} from '@/lib/auth/guards';
import {
  hasPermission,
  getRolePermissions,
  getRolesWithPermission,
  isAdminRole,
  getPermissionSummary,
  Action,
  Resource,
  PERMISSION_MATRIX,
} from '@/lib/auth/rbac';
import {
  getAdminRole,
} from '@/lib/auth/admin-guards';

// ============================================================================
// Types
// ============================================================================

interface PermissionCheckRequest {
  resource: Resource;
  action: Action;
  resourceId?: string;
}

interface PermissionsResponse {
  success: boolean;
  data?: {
    role: UserRole;
    isAdmin: boolean;
    adminType?: 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'COMPLIANCE_ADMIN' | 'FINANCE_ADMIN' | 'ADMIN';
    permissions: Record<Resource, Action[]>;
    summary: {
      canManageOperations: boolean;
      canManageCompliance: boolean;
      canManageFinances: boolean;
      canManageSystem: boolean;
      canViewReports: boolean;
      canAccessAuditLogs: boolean;
    };
  };
  error?: string;
}

interface VerifyAccessResponse {
  success: boolean;
  data?: {
    allowed: boolean;
    reason?: string;
    requiredRoles?: UserRole[];
    userRole: UserRole;
  };
  error?: string;
}

// ============================================================================
// GET - Get Current User's Permissions
// ============================================================================

/**
 * GET /api/admin/rbac
 * Returns the current user's permissions and role information
 * 
 * Response:
 * - role: User's current role
 * - isAdmin: Whether user has any admin role
 * - adminType: Specific admin type if applicable
 * - permissions: All permissions for the user's role
 * - summary: Permission summary for UI display
 */
export async function GET(req: NextRequest): Promise<NextResponse<PermissionsResponse>> {
  // Check authentication
  const user = getAuthUser(req);
  
  if (!user) {
    return unauthorizedResponse('Authentication required');
  }

  try {
    const isAdmin = isAdminRole(user.role);
    const adminType = getAdminRole(user.role);
    const permissions = getRolePermissions(user.role);
    const summary = getPermissionSummary(user.role);

    return NextResponse.json({
      success: true,
      data: {
        role: user.role,
        isAdmin,
        adminType: adminType || undefined,
        permissions,
        summary,
      },
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Verify Access for Specific Resource/Action
// ============================================================================

/**
 * POST /api/admin/rbac
 * Verifies if the current user has access to a specific resource and action
 * 
 * Request body:
 * - resource: The resource to check access for
 * - action: The action to verify
 * - resourceId: Optional specific resource ID
 * 
 * Response:
 * - allowed: Whether access is permitted
 * - reason: Explanation if access is denied
 * - requiredRoles: Roles that would have access
 */
export async function POST(req: NextRequest): Promise<NextResponse<VerifyAccessResponse>> {
  // Check authentication
  const user = getAuthUser(req);
  
  if (!user) {
    return unauthorizedResponse('Authentication required');
  }

  try {
    const body = await req.json() as PermissionCheckRequest;
    
    // Validate request
    if (!body.resource || !body.action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Resource and action are required' 
        },
        { status: 400 }
      );
    }

    // Validate resource
    const validResources: Resource[] = [
      'tasks', 'riders', 'documents', 'verification', 'dispatch', 'analytics',
      'payments', 'wallets', 'settlements', 'commissions', 'finance_reports',
      'users', 'merchants', 'orders', 'health_orders', 'prescriptions',
      'sos_alerts', 'audit_logs', 'system_config', 'pricing_config',
      'disputes', 'notifications'
    ];
    
    if (!validResources.includes(body.resource)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid resource: ${body.resource}. Valid resources: ${validResources.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate action
    const validActions: Action[] = [
      'create', 'read', 'update', 'delete', 'approve', 'reject', 
      'manage', 'export', 'assign', 'dispatch'
    ];
    
    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid action: ${body.action}. Valid actions: ${validActions.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Check permission
    const result = hasPermission(user.role, body.resource, body.action);
    const requiredRoles = getRolesWithPermission(body.resource, body.action);

    return NextResponse.json({
      success: true,
      data: {
        allowed: result.allowed,
        reason: result.reason,
        requiredRoles: result.allowed ? undefined : requiredRoles,
        userRole: user.role,
      },
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check permissions' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Endpoints
// ============================================================================

/**
 * GET /api/admin/rbac/resources
 * Returns list of all available resources
 * (Handled via query parameter)
 */
export async function OPTIONS(): Promise<NextResponse> {
  const resources: Resource[] = [
    'tasks', 'riders', 'documents', 'verification', 'dispatch', 'analytics',
    'payments', 'wallets', 'settlements', 'commissions', 'finance_reports',
    'users', 'merchants', 'orders', 'health_orders', 'prescriptions',
    'sos_alerts', 'audit_logs', 'system_config', 'pricing_config',
    'disputes', 'notifications'
  ];

  const actions: Action[] = [
    'create', 'read', 'update', 'delete', 'approve', 'reject', 
    'manage', 'export', 'assign', 'dispatch'
  ];

  const adminRoles: UserRole[] = [
    'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN', 'ADMIN'
  ];

  return NextResponse.json({
    success: true,
    data: {
      resources,
      actions,
      adminRoles,
      permissionMatrix: PERMISSION_MATRIX,
    },
  });
}
