import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

// Get secret key for JWT verification
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return new TextEncoder().encode('dev-secret-key-not-for-production');
  }
  return new TextEncoder().encode(secret);
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-session')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Verify token
    const { payload } = await jwtVerify(token, getSecretKey());

    // Get fresh user data (only essential fields)
    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
