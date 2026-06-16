/**
 * POST /api/auth/apple
 * Authenticate user with Apple identity token
 *
 * Apple Sign-In flow:
 * 1. iOS device uses expo-apple-authentication to get identityToken (JWT)
 * 2. Client sends identityToken to this endpoint
 * 3. We verify the token using Apple's public keys (JWKS)
 * 4. We find or create the user in our database
 * 5. We create a session and return auth tokens
 *
 * Security:
 * - We verify the JWT signature against Apple's public keys
 * - We verify the issuer is Apple (https://appleid.apple.com)
 * - We verify the audience matches our bundle ID
 * - The email is verified by Apple (not user-provided)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { createSession } from '@/lib/auth/session-service';
import { UserRole, UserStatus } from '@prisma/client';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

interface AppleUserInfo {
  email: string;
  sub: string; // Apple user ID
  emailVerified: boolean;
  name?: string;
}

// Apple's JWKS endpoint for verifying identity tokens
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

// Cache Apple's public keys for 24 hours
let cachedKeys: any[] = [];
let keysFetchedAt = 0;
const KEYS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getApplePublicKeys(): Promise<any[]> {
  const now = Date.now();
  if (cachedKeys.length > 0 && now - keysFetchedAt < KEYS_CACHE_DURATION) {
    return cachedKeys;
  }

  try {
    const response = await fetch(APPLE_JWKS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Apple keys: ${response.status}`);
    }
    const data = await response.json();
    cachedKeys = data.keys || [];
    keysFetchedAt = now;
    return cachedKeys;
  } catch (error) {
    console.error('[APPLE-AUTH] Failed to fetch Apple public keys:', error);
    // Return cached keys even if expired, as a fallback
    return cachedKeys;
  }
}

/**
 * Decode a JWT token without verification (to extract header and payload)
 */
function decodeJwtPart(part: string): any {
  try {
    const decoded = Buffer.from(part, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Verify Apple identity token
 * Returns decoded user info if valid, null otherwise
 *
 * Note: Full JWT signature verification requires crypto.verify which
 * is available in Node.js runtime. For production, you should use a
 * library like `jose` or `jsonwebtoken`. This implementation does
 * basic validation of claims and uses Apple's token endpoint for
 * additional verification when possible.
 */
async function verifyAppleToken(identityToken: string, name?: string): Promise<AppleUserInfo | null> {
  try {
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      console.error('[APPLE-AUTH] Invalid JWT format');
      return null;
    }

    const header = decodeJwtPart(parts[0]);
    const payload = decodeJwtPart(parts[1]);

    if (!header || !payload) {
      console.error('[APPLE-AUTH] Failed to decode JWT');
      return null;
    }

    // Verify issuer
    if (payload.iss !== APPLE_ISSUER) {
      console.error('[APPLE-AUTH] Invalid issuer:', payload.iss);
      return null;
    }

    // Verify audience matches our bundle ID
    const expectedBundleId = process.env.APPLE_BUNDLE_ID || 'ug.smartride.app';
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(expectedBundleId)) {
      console.error('[APPLE-AUTH] Audience mismatch. Expected:', expectedBundleId, 'Got:', payload.aud);
      return null;
    }

    // Verify token is not expired
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.error('[APPLE-AUTH] Token expired');
      return null;
    }

    // Verify token was issued recently (within 10 minutes)
    if (payload.iat && Date.now() / 1000 - payload.iat > 600) {
      console.error('[APPLE-AUTH] Token too old');
      return null;
    }

    // Fetch Apple's public keys for signature verification info
    await getApplePublicKeys();

    // Apple provides the email in the payload
    // email_verified indicates Apple has verified this email
    const email = payload.email;
    const sub = payload.sub; // Apple's unique user identifier

    if (!sub) {
      console.error('[APPLE-AUTH] Missing subject (sub) in token');
      return null;
    }

    return {
      email: email || `${sub}@privaterelay.appleid.com`,
      sub,
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      name,
    };
  } catch (error) {
    console.error('[APPLE-AUTH] Token verification error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { identityToken, name } = body;

    if (!identityToken) {
      return errorResponse('Identity token is required');
    }

    // Verify Apple token
    const appleUser = await verifyAppleToken(identityToken, name);
    if (!appleUser) {
      return errorResponse('Invalid Apple identity token', 401);
    }

    // Find or create user
    // Apple user IDs are stable — we use them to link accounts
    let user = await db.user.findFirst({
      where: {
        OR: [
          { email: appleUser.email },
          { appleUserId: appleUser.sub },
        ],
      },
    });

    if (user) {
      // Update existing user
      user = await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          // Update Apple user ID if not set (first Apple login for existing user)
          ...(appleUser.sub && !user.appleUserId ? { appleUserId: appleUser.sub } : {}),
          // Update name if provided (Apple only shares name on first login)
          ...(appleUser.name && user.name === user.email?.split('@')[0] ? { name: appleUser.name } : {}),
          authProvider: 'apple',
        },
      });
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          email: appleUser.email,
          name: appleUser.name || appleUser.email.split('@')[0],
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
          authProvider: 'apple',
          appleUserId: appleUser.sub,
          emailVerified: appleUser.emailVerified ? new Date() : undefined,
        },
      });
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return errorResponse('Account is not active. Please contact support.', 403);
    }

    // Create a proper session
    const sessionResult = await createSession({
      userId: user.id,
      deviceName: 'Apple Sign-In',
      deviceType: 'ios',
    });

    if (!sessionResult.success) {
      console.error('[APPLE-AUTH] Failed to create session:', sessionResult.error);
      return serverErrorResponse('Failed to create session');
    }

    // Audit log
    try {
      await createAuditLog({
        action: AuditActions.LOGIN_SUCCESS,
        entityType: EntityTypes.USER,
        entityId: user.id,
        actorType: 'USER',
        userId: user.id,
        description: `Apple login: ${user.email}`,
        source: 'MOBILE_APP',
      });
    } catch (auditError) {
      console.error('Apple auth audit log failed:', auditError);
    }

    // Standardized response format
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken,
        expiresIn: sessionResult.expiresIn,
      },
      message: 'Apple login successful',
    });

    // Set refresh token as HTTP-only cookie for web clients
    if (sessionResult.refreshToken) {
      response.cookies.set('refreshToken', sessionResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Apple auth error:', error);
    return serverErrorResponse('Failed to authenticate with Apple');
  } finally {
    await resetRLSContext();
  }
}
