// ============================================
// SMART RIDE MOBILE - ROLE ROUTING HELPER
// ============================================
// Single source of truth for mapping a user role to its home route.
//
// Every screen that needs to route a user based on their role MUST use
// getHomeRouteForRole() instead of inlining a switch/if-chain. This
// guarantees that all roles are perfectly aligned to their routes across
// the entire app and prevents drift when new roles are added.
//
// Authoritative role → route mapping (kept in sync with the backend
// UserRole enum in prisma/schema.prisma):
//
//   CLIENT      → /(tabs)              (main app: rides, orders, wallet…)
//   RIDER       → /driver              (boda / bike / scooter dashboard)
//   DRIVER      → /driver              (professional driver dashboard)
//   MERCHANT    → /merchant            (dashboard; the approval gate sends
//                                       unregistered merchants to onboarding)
//   PHARMACIST  → /pharmacist          (medicine catalog & prescriptions)
//   (none)      → /auth/role-selection (let the user choose)
//
// Admin roles (ADMIN, SUPER_ADMIN, *_ADMIN) are not selectable from the
// mobile role-selection screen; if encountered they fall through to the
// role-selection screen which the user can skip to reach the client tabs.
// ============================================

import { router } from 'expo-router';

/**
 * Returns the home route for a given user role.
 * If the role is missing or unrecognized, returns the role-selection route
 * so the user can pick a role.
 */
export function getHomeRouteForRole(role?: string | null): string {
  switch (role) {
    case 'CLIENT':
      return '/(tabs)';
    case 'RIDER':
    case 'DRIVER':
      // Expo Router: app/driver/index.tsx is reached at "/driver", NOT
      // "/driver/index" (that path is unmatched → "Unmatched Route" screen).
      return '/driver';
    case 'MERCHANT':
      // Was '/merchant/register', so EVERY merchant login rendered the
      // registration form and a network round-trip before redirecting to the
      // dashboard — the returning merchant, i.e. the common case, always saw a
      // form shell flash first. The dashboard's useProviderApprovalGate already
      // redirects to onboarding when no merchant profile exists, so landing
      // here is safe and the flash only happens for genuinely new merchants.
      return '/merchant';
    case 'PHARMACIST':
      return '/pharmacist';
    default:
      // No role set, or an admin role not meant for the mobile app flow.
      return '/auth/role-selection';
  }
}

/**
 * Navigates the user to their role's home route using router.replace().
 * Use this for auto-login flows (returning users) and after the user has
 * confirmed a role on the role-selection screen.
 *
 * For MANUAL logins (Google/Apple/email/OTP) where you want the user to
 * always confirm their role first, call router.replace('/auth/role-selection')
 * directly instead of this helper.
 */
export function navigateToRoleHome(role?: string | null): void {
  router.replace(getHomeRouteForRole(role) as any);
}
