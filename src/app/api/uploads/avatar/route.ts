import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';
import { getStorageProvider } from '@/lib/storage';
import { db } from '@/lib/db';

// POST /api/uploads/avatar - Upload user avatar
export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult as JWTPayload;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for avatars)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Validate file type (only images)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Determine extension from content type
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[file.type] || 'jpg';

    // Storage key: avatars/{userId}.{ext}
    const key = `avatars/${user.userId}.${ext}`;

    // Upload using storage provider
    const storage = getStorageProvider();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const avatarUrl = await storage.upload(key, buffer, file.type);

    // Update user's avatarUrl in database
    await db.user.update({
      where: { id: user.userId },
      data: { avatarUrl },
    });

    return NextResponse.json({
      success: true,
      avatarUrl,
      key,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload avatar' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
