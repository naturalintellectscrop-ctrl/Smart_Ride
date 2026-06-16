/**
 * API Endpoint: Get Call Session Details
 *
 * GET /api/calls/[sessionId]
 *
 * Returns the details of a specific call session.
 * Only participants of the call can view its details.
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

export async function GET(
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

    const callSession = await db.callSession.findUnique({
      where: { id: sessionId },
      include: {
        caller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            phone: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            phone: true,
          },
        },
        task: {
          select: {
            id: true,
            taskNumber: true,
            taskType: true,
            status: true,
          },
        },
      },
    });

    if (!callSession) {
      return notFoundResponse('Call session');
    }

    // Verify the user is part of this call
    if (decoded.userId !== callSession.callerId && decoded.userId !== callSession.recipientId) {
      // Also allow admins to view
      const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(decoded.role);
      if (!isAdmin) {
        return errorResponse('You are not authorized to view this call', 403);
      }
    }

    // Format the response
    const formattedDuration = callSession.duration
      ? `${Math.floor(callSession.duration / 60)}m ${callSession.duration % 60}s`
      : null;

    return successResponse({
      id: callSession.id,
      channelId: callSession.channelId,
      status: callSession.status,
      caller: callSession.caller,
      recipient: callSession.recipient,
      task: callSession.task,
      startedAt: callSession.startedAt,
      endedAt: callSession.endedAt,
      duration: callSession.duration,
      formattedDuration,
      createdAt: callSession.createdAt,
      // Agora App ID for client-side SDK initialization (if reconnecting)
      agoraAppId: process.env.AGORA_APP_ID || '',
    });
  } catch (error) {
    console.error('Error fetching call session:', error);
    return serverErrorResponse('Failed to fetch call session');
  } finally {
    await resetRLSContext();
  }
}
