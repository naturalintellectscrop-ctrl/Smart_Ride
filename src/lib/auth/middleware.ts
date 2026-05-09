import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from './jwt';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Authentication middleware for API routes
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: {
    requiredRoles?: UserRole[];
    allowUnauthenticated?: boolean;
  }
) {
  return async (req: NextRequest, context?: unknown) => {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      if (options?.allowUnauthenticated) {
        return handler(req as AuthenticatedRequest, context);
      }
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check role requirements
    if (options?.requiredRoles && options.requiredRoles.length > 0) {
      if (!options.requiredRoles.includes(payload.role)) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = payload;
    
    return handler(req as AuthenticatedRequest, context);
  };
}

/**
 * Check if request has valid authentication
 */
export function getAuthUser(req: NextRequest): JWTPayload | null {
  const authHeader = req.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) return null;
  
  return verifyAccessToken(token);
}

/**
 * Require authentication - throws if not authenticated
 */
export function requireAuth(req: NextRequest): JWTPayload {
  const user = getAuthUser(req);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Require specific role - throws if not authorized
 */
export function requireRole(req: NextRequest, roles: UserRole[]): JWTPayload {
  const user = requireAuth(req);
  if (!roles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Admin-only middleware
 */
export const adminOnly = (roles: UserRole[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN']) => {
  return roles;
};
