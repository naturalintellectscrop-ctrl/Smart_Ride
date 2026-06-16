import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { isLocalStorage, getLocalStorageProvider, getS3StorageProvider } from '@/lib/storage';

// Serve uploaded files
// For local storage: read from filesystem and serve
// For S3 storage: redirect to the S3 URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Require authentication for file access
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { path: pathSegments } = await params;
    const key = pathSegments.join('/');

    if (isLocalStorage()) {
      // Local storage: serve file from filesystem
      const localProvider = getLocalStorageProvider();
      if (!localProvider) {
        return NextResponse.json({ success: false, error: 'Storage not configured' }, { status: 500 });
      }

      const fileBuffer = await localProvider.readFile(key);
      if (!fileBuffer) {
        return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
      }

      // Determine content type from extension
      const extension = path.extname(key).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
      };
      const contentType = contentTypes[extension] || 'application/octet-stream';

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, max-age=0',
      };

      if (contentType === 'application/pdf') {
        headers['Content-Disposition'] = `attachment; filename="${path.basename(key)}"`;
      }

      return new NextResponse(fileBuffer, { headers });
    } else {
      // S3 storage: redirect to the S3 URL (or presigned URL for private buckets)
      const s3Provider = getS3StorageProvider();
      if (!s3Provider) {
        return NextResponse.json({ success: false, error: 'Storage not configured' }, { status: 500 });
      }

      // Use presigned URL for secure access (1 hour expiry)
      const presignedUrl = await s3Provider.getPresignedUrl(key, 3600);
      return NextResponse.redirect(presignedUrl);
    }
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ success: false, error: 'Failed to serve file' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}
