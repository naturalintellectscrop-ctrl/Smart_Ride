/**
 * Chat Conversations API
 * GET /api/chat/conversations - Get all conversations for the authenticated user
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response';

export async function GET(request: NextRequest) {
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

  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Build where clause for user's conversations
    const whereClause = {
      participants: {
        some: { userId: decoded.userId },
      },
      isActive: true,
    };

    // Cursor-based pagination: if cursor provided, filter by updatedAt < cursor
    const cursorFilter = cursor
      ? { updatedAt: { lt: new Date(cursor) } }
      : {};

    // Fetch conversations
    const conversations = await db.conversation.findMany({
      where: {
        ...whereClause,
        ...cursorFilter,
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        task: {
          select: { id: true, taskNumber: true, taskType: true, status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1, // Take one extra to determine nextCursor
    });

    // Determine if there's a next page
    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, limit) : conversations;

    // Get conversation IDs for unread count batch query
    const conversationIds = items.map((conv) => conv.id);

    // Batch unread count query
    const unreadCounts = conversationIds.length > 0
      ? await db.message.groupBy({
          by: ['conversationId'],
          where: {
            conversationId: { in: conversationIds },
            senderId: { not: decoded.userId },
            isRead: false,
          },
          _count: true,
        })
      : [];

    const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count]));

    // Format conversations for the client
    const formattedConversations = items.map((conv) => {
      // Find the other participant (not the current user)
      const otherParticipant = conv.participants.find((p) => p.userId !== decoded.userId);
      const otherUser = otherParticipant?.user || null;
      const lastMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        type: conv.type,
        taskId: conv.taskId,
        taskNumber: conv.task?.taskNumber || null,
        taskType: conv.task?.taskType || null,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              name: otherUser.name,
              avatarUrl: otherUser.avatarUrl,
              role: otherUser.role,
            }
          : null,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              type: lastMessage.type,
              createdAt: lastMessage.createdAt.toISOString(),
              senderId: lastMessage.senderId,
            }
          : null,
        unreadCount: unreadMap.get(conv.id) || 0,
        updatedAt: conv.updatedAt.toISOString(),
        createdAt: conv.createdAt.toISOString(),
      };
    });

    // Build nextCursor from last item's updatedAt
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].updatedAt.toISOString()
      : null;

    return successResponse({
      conversations: formattedConversations,
      nextCursor,
    });
  } catch (error) {
    console.error('[CHAT] Error fetching conversations:', error);
    return serverErrorResponse('Failed to fetch conversations');
  } finally {
    await resetRLSContext();
  }
}
