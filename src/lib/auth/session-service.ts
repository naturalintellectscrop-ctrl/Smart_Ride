/**
 * Session Service - Production Session Management
 * Handles multi-device sessions with secure token storage
 */

import { db } from '@/lib/db';
import { hash, compare } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { generateTokenPair, verifyRefreshToken } from './jwt';

// ============================================
// TYPES
// ============================================

export interface CreateSessionData {
  userId: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'ios' | 'android' | 'web';
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastAccessedAt: Date;
  isCurrent: boolean;
}

// ============================================
// CONFIGURATION
// ============================================

const SESSION_CONFIG = {
  accessTokenExpirySeconds: 15 * 60, // 15 minutes
  refreshTokenExpiryDays: 30, // 30 days
  maxSessionsPerUser: 10, // Limit concurrent sessions
};

// ============================================
// SESSION SERVICE
// ============================================

/**
 * Generate a secure refresh token
 */
function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Create a new session
 */
export async function createSession(data: CreateSessionData): Promise<SessionResult> {
  try {
    const { userId, deviceId, deviceName, deviceType, ipAddress, userAgent } = data;

    // Check session limit
    const existingSessions = await db.session.count({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingSessions >= SESSION_CONFIG.maxSessionsPerUser) {
      // Revoke oldest session
      const oldestSession = await db.session.findFirst({
        where: {
          userId,
          revoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastAccessedAt: 'asc' },
      });

      if (oldestSession) {
        await revokeSession(oldestSession.id, 'Session limit reached');
      }
    }

    // Generate tokens
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = await hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + SESSION_CONFIG.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);

    // Get user for access token generation
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Generate access token using JWT
    const tokens = generateTokenPair(user);
    const accessToken = tokens.accessToken;
    const expiresIn = tokens.expiresIn;

    // Create session
    await db.session.create({
      data: {
        userId,
        refreshTokenHash,
        deviceId,
        deviceName,
        deviceType,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Update user's last login
    await db.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    console.log(`[SESSION] Created for user ${userId} on ${deviceName || 'unknown device'}`);

    return {
      success: true,
      accessToken,
      refreshToken, // Return raw refresh token (only time it's exposed)
      expiresIn,
    };
  } catch (error) {
    console.error('[SESSION] Create error:', error);
    return { success: false, error: 'Failed to create session' };
  }
}

/**
 * Validate refresh token and create new access token
 */
export async function refreshSession(
  refreshToken: string,
  deviceId?: string
): Promise<SessionResult> {
  try {
    // Find active sessions
    const sessions = await db.session.findMany({
      where: {
        revoked: false,
        expiresAt: { gt: new Date() },
        ...(deviceId && { deviceId }),
      },
      include: { user: true },
    });

    // Find matching session by comparing hash
    let matchedSession = null;
    for (const session of sessions) {
      const isValid = await compare(refreshToken, session.refreshTokenHash);
      if (isValid) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }

    // Generate new tokens
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = await hash(newRefreshToken, 10);
    
    const tokens = generateTokenPair(matchedSession.user);

    // Update session with new refresh token
    await db.session.update({
      where: { id: matchedSession.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_CONFIG.refreshTokenExpiryDays * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`[SESSION] Refreshed for user ${matchedSession.userId}`);

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: newRefreshToken,
      expiresIn: tokens.expiresIn,
    };
  } catch (error) {
    console.error('[SESSION] Refresh error:', error);
    return { success: false, error: 'Failed to refresh session' };
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string, reason?: string): Promise<{ success: boolean }> {
  try {
    await db.session.update({
      where: { id: sessionId },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason || 'User logout',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[SESSION] Revoke error:', error);
    return { success: false };
  }
}

/**
 * Revoke all sessions for a user (except current)
 */
export async function revokeAllSessions(
  userId: string,
  currentSessionId?: string
): Promise<{ success: boolean; revokedCount: number }> {
  try {
    const result = await db.session.updateMany({
      where: {
        userId,
        revoked: false,
        ...(currentSessionId && { id: { not: currentSessionId } }),
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'Logged out from other devices',
      },
    });

    console.log(`[SESSION] Revoked ${result.count} sessions for user ${userId}`);

    return { success: true, revokedCount: result.count };
  } catch (error) {
    console.error('[SESSION] Revoke all error:', error);
    return { success: false, revokedCount: 0 };
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(
  userId: string,
  currentSessionId?: string
): Promise<SessionInfo[]> {
  try {
    const sessions = await db.session.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastAccessedAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      isCurrent: session.id === currentSessionId,
    }));
  } catch (error) {
    console.error('[SESSION] Get sessions error:', error);
    return [];
  }
}

/**
 * Clean up expired sessions (run as cron job)
 */
export async function cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
  try {
    const result = await db.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true, revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Keep revoked for 7 days
        ],
      },
    });

    console.log(`[SESSION] Cleanup: deleted ${result.count} sessions`);
    return { deletedCount: result.count };
  } catch (error) {
    console.error('[SESSION] Cleanup error:', error);
    return { deletedCount: 0 };
  }
}

/**
 * Validate session exists and is active
 */
export async function validateSession(sessionId: string): Promise<boolean> {
  try {
    const session = await db.session.findFirst({
      where: {
        id: sessionId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    return !!session;
  } catch (error) {
    console.error('[SESSION] Validate error:', error);
    return false;
  }
}
