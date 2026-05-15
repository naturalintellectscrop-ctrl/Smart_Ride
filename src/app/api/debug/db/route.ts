/**
 * GET /api/debug/db
 * Tests database connectivity - for debugging only
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get the database host from the URL (hide password)
    const dbUrl = process.env.DATABASE_URL || 'not set';
    const hostMatch = dbUrl.match(/@([^:]+):/);
    const host = hostMatch ? hostMatch[1] : 'unknown';
    
    // Try a simple query
    const result = await db.$queryRaw`SELECT 1 as test`;
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully',
      host: host,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const dbUrl = process.env.DATABASE_URL || 'not set';
    const hostMatch = dbUrl.match(/@([^:]+):/);
    const host = hostMatch ? hostMatch[1] : 'unknown';
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      host: host,
      hint: host.includes('rlwy') 
        ? 'Still using OLD Railway URL - need to redeploy Vercel'
        : host.includes('render') 
          ? 'Using Render URL but connection failed - check if DB is running'
          : 'Unknown host',
    }, { status: 500 });
  }
}
