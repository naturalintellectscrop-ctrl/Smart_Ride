/**
 * API Endpoint: Get Call Status
 * 
 * GET /api/calling/status/[sessionId]
 * 
 * Returns the current status of an active call session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCallStatus, endCall } from '@/lib/calling/masked-calling-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await getCallStatus(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Call session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        callerType: session.callerType,
        calleeType: session.calleeType,
        proxyNumber: session.proxyNumber,
        duration: session.duration,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error getting call status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const result = await endCall(sessionId);

    return NextResponse.json({
      success: result.success,
    });
  } catch (error) {
    console.error('Error ending call:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
