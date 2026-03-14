/**
 * Mobile Application Access Configuration
 * Defines roles and authentication for the public mobile app
 */

// Mobile App User Roles - These are the ONLY roles available in the mobile app
export type MobileUserRole = 'CLIENT' | 'RIDER' | 'MERCHANT' | 'HEALTH_PROVIDER';

// Admin Roles - These are NEVER shown in the mobile app
export type AdminRole = 'ADMIN' | 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'COMPLIANCE_ADMIN' | 'FINANCE_ADMIN';

// All system roles (for backend use)
export type SystemRole = MobileUserRole | AdminRole;

// Mobile app authentication configuration
export const MOBILE_APP_CONFIG = {
  // App name shown in stores
  appName: 'Smart Ride',
  
  // Authentication method for mobile app
  authMethod: 'PHONE_NUMBER' as const,
  
  // Available roles in mobile app (NO ADMIN ROLES)
  availableRoles: [
    {
      id: 'CLIENT',
      title: 'Customer',
      subtitle: 'Request Services',
      description: 'Order rides, food, groceries, and more.',
      icon: 'User',
      color: 'emerald',
    },
    {
      id: 'RIDER',
      title: 'Rider/Driver',
      subtitle: 'Earn Money',
      description: 'Accept delivery and ride requests. Earn money on your own schedule.',
      icon: 'Bike',
      color: 'orange',
    },
    {
      id: 'MERCHANT',
      title: 'Merchant',
      subtitle: 'Grow Business',
      description: 'List your products and services. Reach more customers.',
      icon: 'Store',
      color: 'blue',
    },
    {
      id: 'HEALTH_PROVIDER',
      title: 'Health Provider',
      subtitle: 'Healthcare Provider',
      description: 'Dispense medicines, verify prescriptions, serve your community.',
      icon: 'Heart',
      color: 'rose',
    },
  ],
  
  // Admin roles - NEVER shown in mobile app
  adminRoles: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'] as const,
  
  // Mobile app store links
  storeLinks: {
    playStore: 'https://play.google.com/store/apps/details?id=com.smartride.app',
    appStore: '#', // Coming soon
  },
};

/**
 * Check if a role is a mobile app role
 */
export function isMobileRole(role: string): role is MobileUserRole {
  return MOBILE_APP_CONFIG.availableRoles.some(r => r.id === role);
}

/**
 * Check if a role is an admin role
 */
export function isAdminRole(role: string): role is AdminRole {
  return MOBILE_APP_CONFIG.adminRoles.includes(role as AdminRole);
}

/**
 * Check if user should be redirected to admin dashboard
 */
export function shouldRedirectToAdmin(role: string): boolean {
  return isAdminRole(role);
}

/**
 * Get role display info for mobile app
 */
export function getMobileRoleInfo(roleId: string) {
  return MOBILE_APP_CONFIG.availableRoles.find(r => r.id === roleId);
}
