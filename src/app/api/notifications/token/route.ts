import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db';

/**
 * POST /api/notifications/token
 * Register Expo push token for a user
 * Auth-protected: userId is derived from the authenticated user's token
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, deviceInfo } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    console.log('[ExpoPushToken] Received token:', {
      token: token.substring(0, 20) + '...',
      userId: user.userId,
      deviceInfo,
    });

    await db.expoPushToken.upsert({
      where: { token },
      create: {
        token,
        userId: user.userId,
        platform: deviceInfo?.platform || null,
        deviceId: deviceInfo?.deviceId || null,
      },
      update: {
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'Token registered' });
  } catch (error) {
    console.error('Error registering push token:', error);
    return NextResponse.json({ success: false, error: 'Failed to register token' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/token
 * Deactivate Expo push token
 * Auth-protected: only the authenticated user can deactivate their own token
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    console.log('[ExpoPushToken] Deactivating token:', token.substring(0, 20) + '...', 'for user:', user.userId);

    await db.expoPushToken.updateMany({
      where: { token, userId: user.userId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Token removed' });
  } catch (error) {
    console.error('Error removing push token:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove token' }, { status: 500 });
  }
}
