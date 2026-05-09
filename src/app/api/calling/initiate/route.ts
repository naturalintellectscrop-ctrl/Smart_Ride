/**
 * API Endpoint: Initiate a Masked Call
 * 
 * POST /api/calling/initiate
 * 
 * This endpoint creates a new masked call session between two parties
 * without exposing their real phone numbers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiateCall, CallRequest } from '@/lib/calling/masked-calling-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const {
      callerId,
      callerType,
      callerPhone,
      calleeId,
      calleeType,
      calleePhone,
      taskId,
      taskType,
      recordCall,
    } = body;

    if (!callerId || !callerType || !calleeId || !calleeType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: callerId, callerType, calleeId, calleeType' 
        },
        { status: 400 }
      );
    }

    // Validate caller and callee types
    const validTypes = ['CLIENT', 'RIDER', 'MERCHANT', 'SUPPORT'];
    if (!validTypes.includes(callerType) || !validTypes.includes(calleeType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid user type. Must be one of: CLIENT, RIDER, MERCHANT, SUPPORT' 
        },
        { status: 400 }
      );
    }

    // Create call request
    const callRequest: CallRequest = {
      callerId,
      callerType,
      callerPhone: callerPhone || '',
      calleeId,
      calleeType,
      calleePhone: calleePhone || '',
      taskId,
      taskType,
      recordCall: recordCall ?? true,
    };

    // Initiate the call
    const result = await initiateCall(callRequest);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to initiate call' 
        },
        { status: 500 }
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
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
