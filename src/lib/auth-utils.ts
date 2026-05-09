/**
 * Authentication utilities for API routes
 * 
 * Provides reusable functions for verifying authentication in API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload, isAdmin, hasRole } from './auth/jwt';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';

export interface AuthResult {
  success: true;
  user: JWTPayload;
  userId: string;
}

export interface AuthError {
  success: false;
  error: string;
  statusCode: number;
}

/**
 * Verify authentication from request
 * 
 * Checks both Authorization header and cookies for token
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);
  
  // Fall back to cookie if no header token
  if (!token) {
    token = request.cookies.get('accessToken')?.value;
  }
  
  if (!token) {
    return {
      success: false,
      error: 'Authentication required',
      statusCode: 401,
    };
  }
  
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return {
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401,
    };
  }
  
  return {
    success: true,
    user: payload,
    userId: payload.userId,
  };
}

/**
 * Verify user exists and is active
 */
export async function verifyActiveUser(userId: string): Promise<{ success: true; user: { id: string; role: UserRole; status: string } } | { success: false; error: string }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    if (user.status !== 'ACTIVE') {
      return { success: false, error: 'User account is not active' };
    }
    
    return { success: true, user };
  } catch {
    return { success: false, error: 'Failed to verify user' };
  }
}

/**
 * Require authentication - returns error response if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<JWTPayload | NextResponse> {
  const authResult = await verifyAuth(request);
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  
  // Verify user is active
  const userResult = await verifyActiveUser(authResult.userId);
  if (!userResult.success) {
    return NextResponse.json(
      { error: userResult.error },
      { status: 401 }
    );
  }
  
  return authResult.user;
}

/**
 * Require admin role - returns error response if not admin
 */
export async function requireAdmin(request: NextRequest): Promise<JWTPayload | NextResponse> {
  const user = await requireAuth(request);
  
  if (user instanceof NextResponse) {
    return user;
  }
  
  if (!isAdmin(user.role)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }
  
  return user;
}

/**
 * Require specific role - returns error response if role doesn't match
 */
export async function requireRole(
  request: NextRequest, 
  allowedRoles: UserRole[]
): Promise<JWTPayload | NextResponse> {
  const user = await requireAuth(request);
  
  if (user instanceof NextResponse) {
    return user;
  }
  
  if (!hasRole(user.role, allowedRoles)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  return user;
}

/**
 * Require resource ownership or admin role
 * User can access if they own the resource or are an admin
 */
export async function requireOwnershipOrAdmin(
  request: NextRequest,
  resourceUserId: string
): Promise<JWTPayload | NextResponse> {
  const user = await requireAuth(request);
  
  if (user instanceof NextResponse) {
    return user;
  }
  
  // Allow if user owns the resource
  if (user.userId === resourceUserId) {
    return user;
  }
  
  // Allow if user is admin
  if (isAdmin(user.role)) {
    return user;
  }
  
  return NextResponse.json(
    { error: 'Access denied' },
    { status: 403 }
  );
}

/**
 * Get optional auth - returns user if authenticated, null otherwise
 */
export async function getOptionalAuth(request: NextRequest): Promise<JWTPayload | null> {
  const authResult = await verifyAuth(request);
  
  if (!authResult.success) {
    return null;
  }
  
  return authResult.user;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message: string = 'Access denied'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Create not found response
 */
export function notFoundResponse(message: string = 'Resource not found'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}
