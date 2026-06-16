/**
 * Chat Send Message API
 * POST /api/chat/[conversationId]/send - Send a message in a conversation
 *
 * SECURITY: Rate limited to prevent message spam
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse, forbiddenResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// Zod schema for message validation
const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  type: z.enum(['TEXT', 'IMAGE', 'LOCATION', 'SYSTEM']).default('TEXT'),
  metadata: z.any().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  // Rate limiting — 60 requests per minute to prevent message spam
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.standard);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.standard);
  }

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

  // Parse and validate request body
  let body: z.infer<typeof sendMessageSchema>;
  try {
    const rawBody = await request.json();
    body = sendMessageSchema.parse(rawBody);
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      return errorResponse(validationError.errors.map((e) => e.message).join(', '));
    }
    return errorResponse('Invalid request body');
  }

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

    // Verify conversation is active
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || !conversation.isActive) {
      return errorResponse('Conversation is not active', 400);
    }

    // Create the message
    const message = await db.message.create({
      data: {
        conversationId,
        senderId: decoded.userId,
        content: body.content,
        type: body.type,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
        isRead: false,
      },
    });

    // Update conversation's updatedAt timestamp
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Format message for response
    const formattedMessage = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      isRead: message.isRead,
      readAt: message.readAt?.toISOString() || null,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      createdAt: message.createdAt.toISOString(),
    };

    // Create audit log
    await createAuditLog({
      action: 'MESSAGE_SENT',
      entityType: 'Message',
      entityId: message.id,
      actorType: 'USER',
      actorId: decoded.userId,
      userId: decoded.userId,
      description: `Message sent in conversation ${conversationId}`,
      newValues: { content: body.content, type: body.type },
      source: 'MOBILE_APP',
    });

    // Broadcast message to other participant(s) via realtime
    try {
      const { broadcastToUser } = await import('@/lib/realtime-server');

      // Fetch all participants in the conversation
      const participants = await db.conversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      });

      // Broadcast to every participant except the sender
      for (const p of participants) {
        if (p.userId !== decoded.userId) {
          await broadcastToUser(p.userId, 'chat:message', {
            id: message.id,
            conversationId,
            senderId: decoded.userId,
            content: message.content,
            type: message.type,
            createdAt: message.createdAt.toISOString(),
          });
        }
      }
    } catch (e) {
      console.warn('[CHAT] Failed to broadcast message:', e);
    }

    return successResponse({ message: formattedMessage }, 'Message sent', 201);
  } catch (error) {
    console.error('[CHAT] Error sending message:', error);
    return serverErrorResponse('Failed to send message');
  } finally {
    await resetRLSContext();
  }
}
