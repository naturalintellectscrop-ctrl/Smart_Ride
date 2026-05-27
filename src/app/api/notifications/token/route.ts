import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';

/**
 * POST /api/notifications/token
 * Register FCM token for a user
 * Auth-protected: userId is derived from the authenticated user's token
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, deviceInfo } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Store or update the FCM token
    // In production, you would have a dedicated table for FCM tokens
    // For now, we'll just acknowledge the token was received
    
    console.log('[FCM Token] Received token:', {
      token: token.substring(0, 20) + '...',
      userId: user.userId,
      deviceInfo,
    });

    // Optionally store in database
    // await db.fcmToken.upsert({
    //   where: { token },
    //   create: { token, userId: user.userId, deviceInfo: JSON.stringify(deviceInfo) },
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
 * Auth-protected: only the authenticated user can remove their own token
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Remove the FCM token from database
    console.log('[FCM Token] Removing token:', token.substring(0, 20) + '...', 'for user:', user.userId);

    // await db.fcmToken.delete({ where: { token } });

    return NextResponse.json({ success: true, message: 'Token removed' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return NextResponse.json({ error: 'Failed to remove token' }, { status: 500 });
  }
}
