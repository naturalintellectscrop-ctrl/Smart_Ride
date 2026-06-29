import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';
import { getStorageProvider } from '@/lib/storage';

// POST /api/uploads/documents - Upload a document
export async function POST(request: NextRequest) {
  // Require authentication for uploads
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult as JWTPayload;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string || 'general';
    const documentType = formData.get('documentType') as string || 'document';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', // some clients send image/jpg for .jpg files
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Only images and PDFs are allowed.' },
        { status: 400 }
      );
    }

    // Generate unique filename and storage key
    const extension = file.name.split('.').pop() || 'bin';
    const filename = `${documentType}_${randomUUID()}.${extension}`;

    // Create key path: {type}/{year}/{month}/{filename}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const key = `${type}/${year}/${month}/${filename}`;

    // Upload using storage provider
    const storage = getStorageProvider();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const url = await storage.upload(key, buffer, file.type);

    return NextResponse.json({
      success: true,
      url,
      key,
      filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
