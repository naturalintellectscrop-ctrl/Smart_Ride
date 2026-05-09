/**
 * GET /api/auth/sessions - List all active sessions
 * DELETE /api/auth/sessions - Revoke all other sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSessions, revokeAllSessions, revokeSession } from '@/lib/auth/session-service';
import { getAuthUser } from '@/lib/auth/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { z } from 'zod';

// GET - List all sessions
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get current session ID from header (optional)
    const currentSessionId = request.headers.get('x-session-id') || undefined;

    const sessions = await getUserSessions(user.userId, currentSessionId);

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('[SESSIONS] GET error:', error);
    return serverErrorResponse('Failed to get sessions');
  }
}

// DELETE - Revoke sessions
const revokeSchema = z.object({
  sessionId: z.string().optional(), // If provided, revoke specific session. Otherwise, revoke all others.
});

export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json().catch(() => ({}));
    const { sessionId } = revokeSchema.parse(body);

    if (sessionId) {
      // Revoke specific session
      const result = await revokeSession(sessionId, 'User logout');
      
      if (!result.success) {
        return errorResponse('Failed to revoke session');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } else {
      // Revoke all other sessions
      const currentSessionId = request.headers.get('x-session-id') || undefined;
      const result = await revokeAllSessions(user.userId, currentSessionId);
      
      return NextResponse.json({
        success: true,
        message: `Logged out from ${result.revokedCount} other devices`,
        revokedCount: result.revokedCount,
      });
    }
  } catch (error) {
    console.error('[SESSIONS] DELETE error:', error);
    return serverErrorResponse('Failed to revoke sessions');
  }
}
