/**
 * Access Configuration Index
 * Central export for all access-related configurations
 */

export * from './mobile-access';
export * from './admin-access';

/**
 * Determine which interface to show based on user role
 */
export function getUserInterface(role: string): 'mobile' | 'admin' | 'unknown' {
  // Mobile app roles
  if (['CLIENT', 'RIDER', 'MERCHANT', 'HEALTH_PROVIDER'].includes(role)) {
    return 'mobile';
  }
  
  // Admin roles
  if (['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'].includes(role)) {
    return 'admin';
  }
  
  return 'unknown';
}

/**
 * Check if authentication should be via phone (mobile) or email (admin)
 */
export function getAuthMethod(role: string): 'PHONE' | 'EMAIL' {
  const interfaceType = getUserInterface(role);
  return interfaceType === 'mobile' ? 'PHONE' : 'EMAIL';
}
