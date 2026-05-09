import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/notifications/token
 * Register FCM token for a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId, deviceInfo } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Store or update the FCM token
    // In production, you would have a dedicated table for FCM tokens
    // For now, we'll just acknowledge the token was received
    
    console.log('[FCM Token] Received token:', {
      token: token.substring(0, 20) + '...',
      userId,
      deviceInfo,
    });

    // Optionally store in database
    // await db.fcmToken.upsert({
    //   where: { token },
    //   create: { token, userId, deviceInfo: JSON.stringify(deviceInfo) },
    //   update: { lastUsedAt: new Date() },
    // });

    return NextResponse.json({ success: true, message: 'Token registered' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/token
 * Remove FCM token
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Remove the FCM token from database
    console.log('[FCM Token] Removing token:', token.substring(0, 20) + '...');

    // await db.fcmToken.delete({ where: { token } });

    return NextResponse.json({ success: true, message: 'Token removed' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return NextResponse.json({ error: 'Failed to remove token' }, { status: 500 });
  }
}
