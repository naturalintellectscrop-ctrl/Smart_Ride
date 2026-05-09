/**
 * Messaging API
 * GET /api/messages - Get all conversations for a user
 * POST /api/messages - Create a new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';

// GET - Fetch all conversations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    // If conversationId is provided, get specific conversation with messages
    if (conversationId) {
      const conversation = await db.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: { userId: decoded.userId }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true, role: true }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 100,
          },
          task: {
            select: { id: true, taskNumber: true, taskType: true, status: true }
          }
        }
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Mark messages as read
      await db.message.updateMany({
        where: {
          conversationId,
          senderId: { not: decoded.userId },
          isRead: false
        },
        data: { isRead: true }
      });

      return NextResponse.json({ conversation });
    }

    // Get all conversations for the user
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: { userId: decoded.userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true, role: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        task: {
          select: { id: true, taskNumber: true, taskType: true, status: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Calculate unread counts
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: decoded.userId },
            isRead: false
          }
        });
        return { ...conv, unreadCount };
      })
    );

    return NextResponse.json({ conversations: conversationsWithUnread });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST - Create a new conversation or send a message
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, taskId, message, conversationId, conversationType } = body;

    // If conversationId is provided, send message to existing conversation
    if (conversationId && message) {
      const conversation = await db.conversation.findFirst({
        where: {
          id: conversationId,
          participants: { some: { userId: decoded.userId } }
        }
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Create message
      const newMessage = await db.message.create({
        data: {
          conversationId,
          senderId: decoded.userId,
          content: message,
          type: 'TEXT',
          isRead: false,
        }
      });

      // Update conversation timestamp
      await db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

      return NextResponse.json({ success: true, message: newMessage });
    }

    // Create new conversation
    if (recipientId && message) {
      // Check if conversation already exists between these users for this task
      const existingConv = await db.conversation.findFirst({
        where: {
          taskId: taskId || null,
          participants: {
            every: {
              userId: { in: [decoded.userId, recipientId] }
            }
          }
        }
      });

      if (existingConv) {
        // Add message to existing conversation
        const newMessage = await db.message.create({
          data: {
            conversationId: existingConv.id,
            senderId: decoded.userId,
            content: message,
            type: 'TEXT',
            isRead: false,
          }
        });

        await db.conversation.update({
          where: { id: existingConv.id },
          data: { updatedAt: new Date() }
        });

        return NextResponse.json({ success: true, conversation: existingConv, message: newMessage });
      }

      // Create new conversation with participants
      const conversation = await db.conversation.create({
        data: {
          type: conversationType || 'DIRECT',
          taskId: taskId || null,
          participants: {
            create: [
              { userId: decoded.userId },
              { userId: recipientId }
            ]
          },
          messages: {
            create: {
              senderId: decoded.userId,
              content: message,
              type: 'TEXT',
              isRead: false,
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true, role: true }
              }
            }
          },
          messages: true
        }
      });

      return NextResponse.json({ success: true, conversation });
    }

    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

// PATCH - Mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    // Mark all messages in conversation as read
    await db.message.updateMany({
      where: {
        conversationId,
        senderId: { not: decoded.userId },
        isRead: false
      },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
