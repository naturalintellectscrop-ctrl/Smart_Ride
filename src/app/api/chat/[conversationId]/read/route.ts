/**
 * Chat Mark Messages Read API
 * POST /api/chat/[conversationId]/read - Mark all unread messages as read
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse, forbiddenResponse } from '@/lib/api/response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  // Verify auth
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return unauthorizedResponse('Authentication required');
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return unauthorizedResponse('Invalid or expired token');
  }

  const { conversationId } = await params;

  await setServiceRoleContext();
  try {
    // Verify user is a participant in this conversation
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: decoded.userId,
        },
      },
    });

    if (!participant) {
      return forbiddenResponse('You are not a participant in this conversation');
    }

    // Mark all unread messages where senderId !== current user as read
    const result = await db.message.updateMany({
      where: {
        conversationId,
        senderId: { not: decoded.userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Also update the participant's lastReadAt
    await db.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: decoded.userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return successResponse({ markedRead: result.count });
  } catch (error) {
    console.error('[CHAT] Error marking messages as read:', error);
    return serverErrorResponse('Failed to mark messages as read');
  } finally {
    await resetRLSContext();
  }
}
