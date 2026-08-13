import jwt from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';

// Re-exported: lib/db-rls imports UserRole from this module.
export type { UserRole };

// Get JWT secret - MUST be set in environment for production
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    // Development only - this will be logged as a warning
    console.warn('WARNING: Using development JWT secret. Set JWT_SECRET for production.');
    return 'dev-jwt-secret-not-for-production-use';
  }
  return secret;
};

// Typed as jsonwebtoken's StringValue: a plain `string` does not satisfy
// the SignOptions.expiresIn overload in v9.
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'];

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate access token for authenticated user
 */
export function generateAccessToken(user: Pick<User, 'id' | 'email' | 'role' | 'name'>): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(payload, getJwtSecret(), { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'smart-ride',
    audience: 'smart-ride-api',
  });
}

/**
 * Generate refresh token for token refresh flow
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    getJwtSecret(),
    { 
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'smart-ride',
      audience: 'smart-ride-api',
    }
  );
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(user: Pick<User, 'id' | 'email' | 'role' | 'name'>): TokenPair {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);
  
  // Calculate expiration time in seconds
  const decoded = jwt.decode(accessToken) as { exp: number };
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'smart-ride',
      audience: 'smart-ride-api',
    }) as JWTPayload;
    
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'smart-ride',
      audience: 'smart-ride-api',
    }) as { userId: string; type: string };
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Is this user a work-performing provider — someone who takes dispatch offers?
 *
 * UserRole has BOTH `RIDER` and `DRIVER`, and the app's own registration
 * screen creates each of them: "Smart Boda" signs up as RIDER, "Smart Car"
 * signs up as DRIVER. Five routes gated on `role !== 'RIDER'` alone, so a
 * driver who registered through the supported path could not see offers,
 * accept a task, decline one, accept a dispatch, or withdraw their earnings —
 * every one returned 403 "Only riders can …".
 *
 * The distinction the routes actually care about is provider vs. customer, not
 * two-wheels vs. four. Which VEHICLE someone drives is `Rider.riderRole`, and
 * that is where dispatch eligibility is already decided.
 */
export function isProvider(role: UserRole): boolean {
  return role === 'RIDER' || role === 'DRIVER';
}

/**
 * Check if user is admin (any admin type)
 */
export function isAdmin(role: UserRole): boolean {
  const adminRoles: UserRole[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];
  return adminRoles.includes(role);
}

/**
 * Check if user has specific admin permission
 */
export function hasAdminPermission(role: UserRole, permission: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    CLIENT: [],
    RIDER: [],
    // DRIVER was missing from this Record<UserRole, string[]>, so
    // permissions['DRIVER'] was undefined. Non-admin roles hold no admin
    // permissions, which is the correct value — it just had to be present.
    DRIVER: [],
    MERCHANT: [],
    PHARMACIST: [],
    ADMIN: ['read', 'write', 'delete'],
    SUPER_ADMIN: ['read', 'write', 'delete', 'manage_admins', 'manage_settings', 'view_audit_logs'],
    OPERATIONS_ADMIN: ['read', 'write', 'manage_tasks', 'manage_riders', 'view_reports'],
    COMPLIANCE_ADMIN: ['read', 'verify_documents', 'suspend_users', 'view_audit_logs'],
    FINANCE_ADMIN: ['read', 'manage_payments', 'view_financial_reports', 'process_payouts'],
  };
  
  return permissions[role]?.includes(permission) ?? false;
}
