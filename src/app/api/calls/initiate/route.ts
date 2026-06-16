/**
 * API Endpoint: Initiate an In-App Internet Call
 *
 * POST /api/calls/initiate
 *
 * Creates a new in-app VoIP call session between two parties using
 * Agora.io (or similar) for real-time audio. Returns a session ID
 * and channel info for the caller to join the audio channel.
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
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { z } from 'zod';
import crypto from 'crypto';

const initiateCallSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  recipientType: z.enum(['CLIENT', 'RIDER', 'MERCHANT', 'SUPPORT']),
  taskId: z.string().optional(),
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
    const validatedData = initiateCallSchema.parse(body);

    // Verify recipient exists
    const recipient = await db.user.findUnique({
      where: { id: validatedData.recipientId },
      select: { id: true, name: true, status: true },
    });

    if (!recipient) {
      return errorResponse('Recipient not found', 404);
    }

    if (recipient.status !== 'ACTIVE') {
      return errorResponse('Recipient is not available for calls');
    }

    // Check for any existing active calls between these users
    const existingCall = await db.callSession.findFirst({
      where: {
        OR: [
          {
            callerId: decoded.userId,
            recipientId: validatedData.recipientId,
            status: { in: ['ringing', 'connected'] },
          },
          {
            callerId: validatedData.recipientId,
            recipientId: decoded.userId,
            status: { in: ['ringing', 'connected'] },
          },
        ],
      },
    });

    if (existingCall) {
      return errorResponse('An active call already exists between these users');
    }

    // Generate a unique Agora channel name
    const channelId = `smart-ride-${crypto.randomBytes(8).toString('hex')}-${Date.now()}`;

    // Create the call session
    const callSession = await db.callSession.create({
      data: {
        channelId,
        callerId: decoded.userId,
        recipientId: validatedData.recipientId,
        taskId: validatedData.taskId || null,
        status: 'ringing',
      },
      include: {
        caller: {
          select: { id: true, name: true, avatarUrl: true },
        },
        recipient: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      action: 'CALL_INITIATED',
      entityType: EntityTypes.USER,
      entityId: callSession.id,
      actorType: 'USER',
      actorId: decoded.userId,
      userId: decoded.userId,
      taskId: validatedData.taskId,
      description: `Call initiated by ${decoded.name} to ${recipient.name}`,
      source: 'MOBILE_APP',
    });

    // Return session info and channel details
    // The caller will use the channelId to request an Agora token
    // and then join the Agora channel for audio
    return successResponse({
      sessionId: callSession.id,
      channelId: callSession.channelId,
      status: callSession.status,
      caller: callSession.caller,
      recipient: callSession.recipient,
      createdAt: callSession.createdAt,
      // Agora App ID for client-side SDK initialization
      agoraAppId: process.env.AGORA_APP_ID || '',
    }, 'Call initiated successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.issues[0]?.message || 'Validation error');
    }
    console.error('Error initiating call:', error);
    return serverErrorResponse('Failed to initiate call');
  } finally {
    await resetRLSContext();
  }
}
