/**
 * API Endpoint: Initiate a Masked Call
 *
 * POST /api/calling/initiate
 *
 * This endpoint creates a new masked call session between two parties
 * without exposing their real phone numbers.
 *
 * SECURITY: Requires authentication. The callerId is derived from the JWT —
 * NOT accepted from the request body. The caller can only initiate a call
 * as themselves. Task participation is verified by the calling service
 * (validateTaskParticipants) before the call is connected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiateCall, CallRequest } from '@/lib/calling/masked-calling-service';
import { verifyAccessToken } from '@/lib/auth/jwt';

// Map JWT user roles to the caller types accepted by the calling service.
const ROLE_TO_CALLER_TYPE: Record<string, 'CLIENT' | 'RIDER' | 'MERCHANT' | 'SUPPORT'> = {
  CLIENT: 'CLIENT',
  RIDER: 'RIDER',
  MERCHANT: 'MERCHANT',
  PHARMACIST: 'MERCHANT',
  ADMIN: 'SUPPORT',
  SUPER_ADMIN: 'SUPPORT',
  OPERATIONS_ADMIN: 'SUPPORT',
  COMPLIANCE_ADMIN: 'SUPPORT',
  FINANCE_ADMIN: 'SUPPORT',
};

export async function POST(request: NextRequest) {
  // SECURITY: Require authentication BEFORE processing the request.
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Validate required callee fields. callerId/callerType come from the JWT.
    const { calleeId, calleeType, taskId, taskType, recordCall } = body;

    if (!calleeId || !calleeType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: calleeId, calleeType',
        },
        { status: 400 }
      );
    }

    // Validate callee type
    const validTypes = ['CLIENT', 'RIDER', 'MERCHANT', 'SUPPORT'];
    if (!validTypes.includes(calleeType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid calleeType. Must be one of: CLIENT, RIDER, MERCHANT, SUPPORT',
        },
        { status: 400 }
      );
    }

    // Derive caller identity from the JWT — never trust the request body.
    const callerId = decoded.userId;
    const callerType = ROLE_TO_CALLER_TYPE[decoded.role] || 'CLIENT';

    // Create call request. callerPhone is optional (the masked-calling service
    // uses a proxy number; the real phone is never shared).
    const callRequest: CallRequest = {
      callerId,
      callerType,
      callerPhone: body.callerPhone || '',
      calleeId,
      calleeType,
      calleePhone: body.calleePhone || '',
      taskId,
      taskType,
      recordCall: recordCall ?? true,
    };

    // Initiate the call (the service verifies task participation when taskId
    // is provided and rejects if either party is not a task participant).
    const result = await initiateCall(callRequest);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to initiate call',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: result.session?.id,
        status: result.session?.status,
        proxyNumber: result.proxyNumber,
        createdAt: result.session?.createdAt,
        expiresAt: result.session?.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error in call initiation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
