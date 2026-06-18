/**
 * API Endpoint: End a Call Session
 *
 * PATCH /api/calls/[sessionId]/end
 *
 * Ends an active call session by setting its status to "ended",
 * recording the end time and duration, and broadcasting the
 * call:ended event to both participants via realtime.
 *
 * SECURITY: Requires authentication. Only the caller or recipient
 *           of the call can end it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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

  const { sessionId } = await params;

  await setServiceRoleContext();
  try {
    // Find the call session
    const callSession = await db.callSession.findUnique({
      where: { id: sessionId },
    });

    if (!callSession) {
      return errorResponse('Call session not found', 404);
    }

    // Verify the user is a participant in this call
    if (callSession.callerId !== decoded.userId && callSession.recipientId !== decoded.userId) {
      return forbiddenResponse('You are not a participant in this call');
    }

    // Check if the call is already ended
    if (callSession.status === 'ended') {
      return errorResponse('Call has already ended', 400);
    }

    // Calculate duration if the call was connected
    const now = new Date();
    let duration = 0;
    if (callSession.startedAt) {
      duration = Math.round((now.getTime() - callSession.startedAt.getTime()) / 1000);
    }

    // Update the call session
    const updatedSession = await db.callSession.update({
      where: { id: sessionId },
      data: {
        status: 'ended',
        endedAt: now,
        duration,
      },
    });

    // Create audit log
    await createAuditLog({
      action: 'CALL_ENDED',
      entityType: EntityTypes.USER,
      entityId: sessionId,
      actorType: 'USER',
      actorId: decoded.userId,
      userId: decoded.userId,
      description: `Call session ${sessionId} ended by ${decoded.name || decoded.userId}`,
      source: 'MOBILE_APP',
    });

    // Broadcast call:ended to both participants via realtime
    try {
      const { broadcastToUser } = await import('@/lib/realtime-server');

      await broadcastToUser(callSession.callerId, 'call:ended', {
        sessionId: callSession.id,
        duration,
        endedBy: decoded.userId,
      });

      await broadcastToUser(callSession.recipientId, 'call:ended', {
        sessionId: callSession.id,
        duration,
        endedBy: decoded.userId,
      });
    } catch (e) {
      console.warn('[CALLS] Failed to broadcast call ended:', e);
    }

    return successResponse({
      sessionId: updatedSession.id,
      status: updatedSession.status,
      endedAt: updatedSession.endedAt?.toISOString(),
      duration: updatedSession.duration,
    }, 'Call ended successfully');
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse('Validation error');
    }
    console.error('[CALLS] Error ending call:', error);
    return serverErrorResponse('Failed to end call');
  } finally {
    await resetRLSContext();
  }
}
