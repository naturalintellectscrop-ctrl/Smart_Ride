// Auth library exports
//
// `middleware` and `guards` both define requireAuth/requireRole/withAuth/
// getAuthUser/AuthenticatedRequest with INCOMPATIBLE contracts:
//   guards.requireAuth     → AuthResult { success, user, error, statusCode }
//   middleware.requireAuth → JWTPayload, and throws on failure
// Re-exporting both with `export *` made those names ambiguous. Routes
// standardise on `guards`, so it owns the shared names here; the
// middleware variants stay reachable via explicit aliases. Import the
// throwing variants directly from '@/lib/auth/middleware' if you need them.
export * from './jwt';
export * from './password';
export * from './guards';
export {
  withAuth as withAuthMiddleware,
  getAuthUser as getAuthUserOrNull,
  requireAuth as requireAuthOrThrow,
  requireRole as requireRoleOrThrow,
  type AuthenticatedRequest as AuthenticatedRequestWithUser,
} from './middleware';
