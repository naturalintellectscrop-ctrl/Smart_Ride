/**
 * Chat Messages API
 * GET /api/chat/[conversationId]/messages - Get messages for a conversation
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse, forbiddenResponse, notFoundResponse } from '@/lib/api/response';
import { decryptField } from '@/lib/crypto/field-encryption';

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Build where clause
    const cursorFilter = cursor
      ? { createdAt: { lt: new Date(cursor) } }
      : {};

    // Fetch messages ordered by createdAt DESC (newest first)
    const messages = await db.message.findMany({
      where: {
        conversationId,
        ...cursorFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Take one extra to determine nextCursor
    });

    // Determine if there's a next page
    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    // Format messages for the client
    const formattedMessages = items.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: decryptField(msg.content),
      type: msg.type,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      isRead: msg.isRead,
      readAt: msg.readAt?.toISOString() || null,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      createdAt: msg.createdAt.toISOString(),
    }));

    // Build nextCursor from last item's createdAt
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return successResponse({
      messages: formattedMessages,
      nextCursor,
    });
  } catch (error) {
    console.error('[CHAT] Error fetching messages:', error);
    return serverErrorResponse('Failed to fetch messages');
  } finally {
    await resetRLSContext();
  }
}
