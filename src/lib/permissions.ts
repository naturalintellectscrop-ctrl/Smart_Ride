// Role-Based Access Control (RBAC) Configuration
// Defines what each admin role can access in the dashboard

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATIONS_ADMIN' | 'COMPLIANCE_ADMIN' | 'FINANCE_ADMIN';

export type Permission = 
  | 'dashboard'
  | 'monitoring'
  | 'dispatch'
  | 'marketplace'
  | 'reputation'
  | 'pricing'
  | 'routes'
  | 'sos'
  | 'fraud'
  | 'users'
  | 'riders'
  | 'merchants'
  | 'merchantFinance'
  | 'health'
  | 'pharmacyFinance'
  | 'orders'
  | 'tasks'
  | 'payments'
  | 'audit'
  | 'settings';

export interface RolePermissions {
  canView: Permission[];
  canEdit: Permission[];
  canDelete: Permission[];
  canManageAdmins: boolean;
  canChangePasswords: boolean;
  canApproveEntities: boolean;
  canAccessFinance: boolean;
  canConfigureSystem: boolean;
}

// Define permissions for each role
export const rolePermissions: Record<AdminRole, RolePermissions> = {
  SUPER_ADMIN: {
    canView: [
      'dashboard', 'monitoring', 'dispatch', 'marketplace', 'reputation', 'pricing', 'routes', 'sos', 'fraud',
      'users', 'riders', 'merchants', 'merchantFinance', 'health', 'pharmacyFinance',
      'orders', 'tasks', 'payments', 'audit', 'settings'
    ],
    canEdit: [
      'dashboard', 'monitoring', 'dispatch', 'marketplace', 'reputation', 'pricing', 'routes', 'sos', 'fraud',
      'users', 'riders', 'merchants', 'merchantFinance', 'health', 'pharmacyFinance',
      'orders', 'tasks', 'payments', 'settings'
    ],
    canDelete: ['riders', 'merchants', 'health', 'orders', 'tasks'],
    canManageAdmins: true,
    canChangePasswords: true,
    canApproveEntities: true,
    canAccessFinance: true,
    canConfigureSystem: true,
  },
  
  ADMIN: {
    canView: [
      'dashboard', 'monitoring', 'dispatch', 'marketplace', 'reputation', 'pricing', 'routes', 'sos', 'fraud',
      'users', 'riders', 'merchants', 'merchantFinance', 'health', 'pharmacyFinance',
      'orders', 'tasks', 'payments', 'audit', 'settings'
    ],
    canEdit: [
      'monitoring', 'dispatch', 'marketplace', 'routes', 'sos',
      'riders', 'merchants', 'health',
      'orders', 'tasks', 'settings'
    ],
    canDelete: ['orders', 'tasks'],
    canManageAdmins: false,
    canChangePasswords: false,
    canApproveEntities: true,
    canAccessFinance: true,
    canConfigureSystem: false,
  },
  
  OPERATIONS_ADMIN: {
    canView: [
      'dashboard', 'monitoring', 'dispatch', 'marketplace', 'reputation', 'routes', 'sos',
      'riders', 'orders', 'tasks', 'settings'
    ],
    canEdit: [
      'monitoring', 'dispatch', 'marketplace', 'routes', 'sos',
      'riders', 'orders', 'tasks', 'settings'
    ],
    canDelete: ['orders', 'tasks'],
    canManageAdmins: false,
    canChangePasswords: false,
    canApproveEntities: true,
    canAccessFinance: false,
    canConfigureSystem: false,
  },
  
  COMPLIANCE_ADMIN: {
    canView: [
      'dashboard', 'sos', 'fraud',
      'riders', 'merchants', 'health',
      'orders', 'tasks', 'audit', 'settings'
    ],
    canEdit: [
      'riders', 'merchants', 'health',
      'settings'
    ],
    canDelete: [],
    canManageAdmins: false,
    canChangePasswords: false,
    canApproveEntities: true,
    canAccessFinance: false,
    canConfigureSystem: false,
  },
  
  FINANCE_ADMIN: {
    canView: [
      'dashboard', 'marketplace', 'pricing',
      'merchants', 'merchantFinance', 'health', 'pharmacyFinance',
      'orders', 'tasks', 'payments', 'settings'
    ],
    canEdit: [
      'marketplace', 'pricing', 'merchantFinance', 'pharmacyFinance', 'payments', 'settings'
    ],
    canDelete: [],
    canManageAdmins: false,
    canChangePasswords: false,
    canApproveEntities: false,
    canAccessFinance: true,
    canConfigureSystem: false,
  },
};

// Helper functions
export function canView(role: string, permission: Permission): boolean {
  const rolePerms = rolePermissions[role as AdminRole];
  if (!rolePerms) return false;
  return rolePerms.canView.includes(permission);
}

export function canEdit(role: string, permission: Permission): boolean {
  const rolePerms = rolePermissions[role as AdminRole];
  if (!rolePerms) return false;
  return rolePerms.canEdit.includes(permission);
}

export function canDelete(role: string, permission: Permission): boolean {
  const rolePerms = rolePermissions[role as AdminRole];
  if (!rolePerms) return false;
  return rolePerms.canDelete.includes(permission);
}

export function canManageAdmins(role: string): boolean {
  const rolePerms = rolePermissions[role as AdminRole];
  if (!rolePerms) return false;
  return rolePerms.canManageAdmins;
}

export function canChangePasswords(role: string): boolean {
  const rolePerms = rolePermissions[role as AdminRole];
  if (!rolePerms) return false;
  return rolePerms.canChangePasswords;
}

export function canApproveEntities(role: string): boolean {
  const rolePerms = rolePermissions[role as AdminRole];
  if (!rolePerms) return false;
  return rolePerms.canApproveEntities;
}

export function canAccessFinance(role: string): boolean {
  const rolePerms = rolePermissions[role as AdminRole];
  if (!rolePerms) return false;
  return rolePerms.canAccessFinance;
}

export function canConfigureSystem(role: string): boolean {
  const rolePerms = rolePermissions[role as AdminRole];
  if (!rolePerms) return false;
  return rolePerms.canConfigureSystem;
}

// Get role display name
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Admin';
    case 'ADMIN': return 'Admin';
    case 'OPERATIONS_ADMIN': return 'Operations Admin';
    case 'COMPLIANCE_ADMIN': return 'Compliance Admin';
    case 'FINANCE_ADMIN': return 'Finance Admin';
    default: return role;
  }
}

// Get role description
export function getRoleDescription(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': 
      return 'Full system access including user management, configuration, and all operations';
    case 'ADMIN': 
      return 'Broad access to most features except admin management and system configuration';
    case 'OPERATIONS_ADMIN': 
      return 'Manage daily operations: dispatch, monitoring, riders, orders, and SOS responses';
    case 'COMPLIANCE_ADMIN': 
      return 'Oversee compliance: fraud detection, audit logs, and entity verification';
    case 'FINANCE_ADMIN': 
      return 'Manage financial operations: payments, pricing, and financial reports';
    default: 
      return 'No description available';
  }
}
