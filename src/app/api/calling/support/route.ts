/**
 * API Endpoint: Call Support
 * 
 * POST /api/calling/support
 * 
 * Initiate a call to Smart Ride support team.
 * This ensures users can always reach support - no dead ends.
 */

import { NextRequest, NextResponse } from 'next/server';
import { callSupport } from '@/lib/calling/masked-calling-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { userId, userType, reason } = body;

    if (!userId || !userType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: userId, userType' 
        },
        { status: 400 }
      );
    }

    // Validate user type
    const validTypes = ['CLIENT', 'RIDER', 'MERCHANT'];
    if (!validTypes.includes(userType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid user type. Must be one of: CLIENT, RIDER, MERCHANT' 
        },
        { status: 400 }
      );
    }

    // Initiate support call
    const result = await callSupport(userId, userType, reason);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to connect to support' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connecting you to Smart Ride Support...',
      session: {
        id: result.session?.id,
        status: result.session?.status,
      },
    });
  } catch (error) {
    console.error('Error calling support:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
