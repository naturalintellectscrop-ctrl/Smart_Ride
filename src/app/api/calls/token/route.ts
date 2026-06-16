/**
 * API Endpoint: Generate Agora RTC Token
 *
 * POST /api/calls/token
 *
 * Generates an Agora RTC token for joining a call channel.
 * For production, use the `agora-token` npm package.
 * For MVP, we generate a simple token or use Agora's temporary token mechanism.
 *
 * Request body:
 * - channelName: The Agora channel name to join
 * - userId: (optional) The user ID for the token, defaults to caller from auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/api/response';
import { z } from 'zod';

const tokenSchema = z.object({
  channelName: z.string().min(1, 'Channel name is required'),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return unauthorizedResponse('Authentication required');
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return unauthorizedResponse('Invalid or expired token');
  }

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validatedData = tokenSchema.parse(body);

    // Verify the call session exists for this channel
    const callSession = await db.callSession.findUnique({
      where: { channelId: validatedData.channelName },
    });

    if (!callSession) {
      return errorResponse('Call session not found for this channel', 404);
    }

    // Verify the requesting user is part of this call
    const userId = validatedData.userId || decoded.userId;
    if (userId !== callSession.callerId && userId !== callSession.recipientId) {
      return errorResponse('You are not authorized to join this call', 403);
    }

    const agoraAppId = process.env.AGORA_APP_ID || '';
    const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE || '';

    // Check if Agora is configured
    if (!agoraAppId) {
      // Agora not configured - return a mock token for development
      // In production, this should fail with a proper error
      return successResponse({
        token: `dev-token-${validatedData.channelName}-${userId}`,
        channelId: validatedData.channelName,
        appId: '',
        userId,
        uid: Math.floor(Math.random() * 1000000),
        // Indicate that Agora is not configured
        isAgoraConfigured: false,
        // Fallback: use phone dialer
        fallbackMode: true,
      }, 'Agora not configured - using fallback mode');
    }

    // For production: Generate real Agora token
    // When agora-token package is installed, use:
    //
    // import { RtcTokenBuilder, RtcRole } from 'agora-token';
    // const agoraToken = RtcTokenBuilder.buildTokenWithUid(
    //   agoraAppId,
    //   agoraAppCertificate,
    //   validatedData.channelName,
    //   0, // uid = 0 means Agora assigns a uid
    //   RtcRole.PUBLISHER,
    //   Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    // );

    // For now, try to dynamically import agora-token if available
    let agoraToken: string | null = null;
    let uid = 0;

    try {
      const agoraTokenLib = await import('agora-token');
      const { RtcTokenBuilder, RtcRole } = agoraTokenLib;

      if (agoraAppCertificate) {
        uid = Math.floor(Math.random() * 1000000);
        agoraToken = RtcTokenBuilder.buildTokenWithUid(
          agoraAppId,
          agoraAppCertificate,
          validatedData.channelName,
          uid,
          RtcRole.PUBLISHER,
          Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        );
      }
    } catch {
      // agora-token package not installed, use dev token
      console.log('[CALLS] agora-token package not available, using development token');
    }

    if (agoraToken) {
      return successResponse({
        token: agoraToken,
        channelId: validatedData.channelName,
        appId: agoraAppId,
        userId,
        uid,
        isAgoraConfigured: true,
        fallbackMode: false,
      }, 'Agora token generated successfully');
    }

    // Fallback: Agora token generation not available
    return successResponse({
      token: `dev-token-${validatedData.channelName}-${userId}`,
      channelId: validatedData.channelName,
      appId: agoraAppId,
      userId,
      uid: 0,
      isAgoraConfigured: !!agoraAppCertificate,
      fallbackMode: !agoraAppCertificate,
    }, 'Development token generated - configure Agora for production');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.issues[0]?.message || 'Validation error');
    }
    console.error('Error generating call token:', error);
    return serverErrorResponse('Failed to generate call token');
  } finally {
    await resetRLSContext();
  }
}
