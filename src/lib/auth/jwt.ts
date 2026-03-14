import jwt from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

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

  return jwt.sign(payload, JWT_SECRET, { 
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
    JWT_SECRET,
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
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'smart-ride',
      audience: 'smart-ride-api',
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'smart-ride',
      audience: 'smart-ride-api',
    }) as { userId: string; type: string };
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return { userId: decoded.userId };
  } catch (error) {
    console.error('Refresh token verification failed:', error instanceof Error ? error.message : 'Unknown error');
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
