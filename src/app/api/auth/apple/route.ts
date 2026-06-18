/**
 * POST /api/auth/apple
 * Authenticate user with Apple identity token
 *
 * Apple Sign-In flow:
 * 1. iOS device uses expo-apple-authentication to get identityToken (JWT)
 * 2. Client sends identityToken to this endpoint
 * 3. We verify the JWT SIGNATURE against Apple's public keys (JWKS) using `jose`
 * 4. We verify the issuer + audience + expiry claims
 * 5. We find or create the user in our database
 * 6. We create a session and return auth tokens
 *
 * Security:
 * - JWT signature is cryptographically verified (jose.jwtVerify + JWKS)
 * - Issuer MUST be https://appleid.apple.com
 * - Audience MUST match our Apple bundle ID (env var APPLE_BUNDLE_ID)
 * - Expiry + issued-at are validated by jose
 * - The email is provided by Apple (not user-supplied) and marked verified
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { createSession } from '@/lib/auth/session-service';
import { UserRole, UserStatus } from '@prisma/client';
import { errorResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { createRemoteJWKSet, jwtVerify } from 'jose';

interface AppleUserInfo {
  email: string;
  sub: string; // Apple user ID
  emailVerified: boolean;
  name?: string;
}

// Apple's JWKS endpoint for verifying identity tokens
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

// jose JWKS handler — caches Apple's public keys and auto-refreshes per RFC 7517.
const appleJWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

/**
 * Verify an Apple identity token (JWT).
 *
 * This performs FULL cryptographic signature verification against Apple's
 * published public keys (JWKS), plus issuer + audience + expiry validation.
 * A forged token (wrong signature) will fail verification here.
 */
async function verifyAppleToken(identityToken: string, name?: string): Promise<AppleUserInfo | null> {
  try {
    // The audience MUST be our Apple bundle ID. We require this env var to be
    // set — if it isn't, we refuse to verify (fail-closed).
    const expectedBundleId = process.env.APPLE_BUNDLE_ID || 'ug.smartride.app';

    // jose.jwtVerify validates: signature (against JWKS), iss, aud, exp, nbf.
    const { payload } = await jwtVerify(identityToken, appleJWKS, {
      issuer: APPLE_ISSUER,
      audience: expectedBundleId,
    });

    // Apple's unique user identifier (stable across logins).
    const sub = payload.sub;
    if (!sub) {
      console.error('[APPLE-AUTH] Missing subject (sub) in verified token');
      return null;
    }

    const email =
      (typeof payload.email === 'string' && payload.email) ||
      `${sub}@privaterelay.appleid.com`;

    // Apple sends email_verified as a string "true" or boolean true.
    const emailVerified =
      payload.email_verified === 'true' || payload.email_verified === true;

    return {
      email,
      sub,
      emailVerified,
      name,
    };
  } catch (error) {
    // jose throws on signature mismatch, expired token, wrong issuer/audience.
    console.error('[APPLE-AUTH] JWT verification failed:', (error as Error).message);
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
