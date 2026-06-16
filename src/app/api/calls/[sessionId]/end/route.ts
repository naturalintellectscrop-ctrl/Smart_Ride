/**
 * API Endpoint: End an In-App Call Session
 *
 * POST /api/calls/[sessionId]/end
 *
 * Ends an active call session:
 * - Updates the call record with end time and duration
 * - Sets status to 'ended' or 'missed' (if never connected)
 * - Notifies the other party via socket
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

export async function POST(
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

  await setServiceRoleContext();
  try {
    const { sessionId } = await params;

    // Find the call session
    const callSession = await db.callSession.findUnique({
      where: { id: sessionId },
      include: {
        caller: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
    });

    if (!callSession) {
      return notFoundResponse('Call session');
    }

    // Verify the user is part of this call
    if (decoded.userId !== callSession.callerId && decoded.userId !== callSession.recipientId) {
      return errorResponse('You are not authorized to end this call', 403);
    }

    // Check if already ended
    if (callSession.status === 'ended' || callSession.status === 'missed') {
      return successResponse({
        sessionId: callSession.id,
        status: callSession.status,
        duration: callSession.duration,
      }, 'Call already ended');
    }

    const now = new Date();
    let duration: number | null = null;
    let newStatus: string;

    if (callSession.startedAt) {
      // Call was connected at some point - calculate duration
      duration = Math.floor((now.getTime() - callSession.startedAt.getTime()) / 1000);
      newStatus = 'ended';
    } else {
      // Call was never connected (ringing but never answered)
      newStatus = 'missed';
    }

    // Update the call session
    const updatedSession = await db.callSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
        endedAt: now,
        duration,
      },
    });

    // Audit log
    await createAuditLog({
      action: 'CALL_ENDED',
      entityType: EntityTypes.USER,
      entityId: sessionId,
      actorType: 'USER',
      actorId: decoded.userId,
      userId: decoded.userId,
      taskId: callSession.taskId || undefined,
      description: `Call ${newStatus}: ${callSession.caller.name} → ${callSession.recipient.name} (${duration !== null ? `${duration}s` : 'never connected'})`,
      source: 'MOBILE_APP',
      newValues: {
        status: newStatus,
        duration,
        endedAt: now.toISOString(),
      },
    });

    // Return the ended session details
    // The caller's client should notify the other party via Socket.io
    // that the call has ended
    return successResponse({
      sessionId: updatedSession.id,
      channelId: updatedSession.channelId,
      status: updatedSession.status,
      duration: updatedSession.duration,
      endedAt: updatedSession.endedAt,
      // Include recipient info for push notification
      otherPartyId: decoded.userId === callSession.callerId
        ? callSession.recipientId
        : callSession.callerId,
    }, `Call ${newStatus}`);
  } catch (error) {
    console.error('Error ending call:', error);
    return serverErrorResponse('Failed to end call');
  } finally {
    await resetRLSContext();
  }
}
