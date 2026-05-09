import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Serve uploaded files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = path.join(process.cwd(), 'uploads', ...pathSegments);

    // Security check - ensure the path is within uploads folder
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if file exists
    if (!existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get file info
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    // Determine content type
    const extension = path.extname(resolvedPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    const contentType = contentTypes[extension] || 'application/octet-stream';

    // Read and return file
    const fileBuffer = await readFile(resolvedPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
