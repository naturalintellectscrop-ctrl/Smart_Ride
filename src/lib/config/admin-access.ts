/**
 * Admin Dashboard Access Configuration
 * Separate configuration for admin.smartride.com
 */

// Admin Dashboard Configuration
export const ADMIN_DASHBOARD_CONFIG = {
  // Admin domain
  domain: 'admin.smartride.com',
  
  // Local development admin path
  localPath: '/admin',
  
  // Authentication method for admin dashboard
  authMethod: 'EMAIL_PASSWORD' as const,
  
  // Admin roles with permissions
  adminRoles: [
    {
      id: 'SUPER_ADMIN',
      title: 'Super Admin',
      description: 'Full system access and configuration',
      permissions: ['all'],
      color: 'purple',
    },
    {
      id: 'ADMIN',
      title: 'Admin',
      description: 'Standard administrative access',
      permissions: ['read', 'write', 'delete'],
      color: 'blue',
    },
    {
      id: 'OPERATIONS_ADMIN',
      title: 'Operations Admin',
      description: 'Manage daily operations, tasks, and riders',
      permissions: ['read', 'write', 'manage_tasks', 'manage_riders', 'view_reports'],
      color: 'orange',
    },
    {
      id: 'COMPLIANCE_ADMIN',
      title: 'Compliance Admin',
      description: 'Verify documents and ensure regulatory compliance',
      permissions: ['read', 'verify_documents', 'suspend_users', 'view_audit_logs'],
      color: 'teal',
    },
    {
      id: 'FINANCE_ADMIN',
      title: 'Finance Admin',
      description: 'Manage payments, payouts, and financial reports',
      permissions: ['read', 'manage_payments', 'view_financial_reports', 'process_payouts'],
      color: 'green',
    },
  ],
  
  // Admin login page title
  loginTitle: 'Smart Ride Admin',
  
  // Session timeout in minutes
  sessionTimeout: 30,
};

/**
 * Admin permission types
 */
export type AdminPermission = 
  | 'all'
  | 'read'
  | 'write'
  | 'delete'
  | 'manage_tasks'
  | 'manage_riders'
  | 'view_reports'
  | 'verify_documents'
  | 'suspend_users'
  | 'view_audit_logs'
  | 'manage_payments'
  | 'view_financial_reports'
  | 'process_payouts';

/**
 * Check if admin has specific permission
 */
export function hasAdminPermission(role: string, permission: AdminPermission): boolean {
  const roleConfig = ADMIN_DASHBOARD_CONFIG.adminRoles.find(r => r.id === role);
  if (!roleConfig) return false;
  
  if (roleConfig.permissions.includes('all')) return true;
  return roleConfig.permissions.includes(permission);
}

/**
 * Get admin role info
 */
export function getAdminRoleInfo(roleId: string) {
  return ADMIN_DASHBOARD_CONFIG.adminRoles.find(r => r.id === roleId);
}

/**
 * Check if request is from admin domain
 */
export function isAdminDomain(request: Request): boolean {
  const host = request.headers.get('host') || '';
  return host.includes('admin.smartride.com') || host.includes('admin.localhost');
}

/**
 * Get admin dashboard URL
 */
export function getAdminDashboardUrl(isLocal: boolean = false): string {
  if (isLocal) {
    return '/admin';
  }
  return `https://${ADMIN_DASHBOARD_CONFIG.domain}`;
}
