import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

/**
 * POST /api/notifications/register-token
 * Register Expo push token for a user (alternative endpoint).
 * Auth-protected: userId is derived from the authenticated user's token.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validated = schema.parse(body);

    // Upsert the push token - update if exists, create if not
    // Uses the existing ExpoPushToken model
    await db.expoPushToken.upsert({
      where: { token: validated.token },
      create: {
        token: validated.token,
        userId: user.userId,
        platform: validated.platform || 'android',
        isActive: true,
      },
      update: {
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: { registered: true } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Error registering push token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register push token' },
      { status: 500 }
    );
  }
}
