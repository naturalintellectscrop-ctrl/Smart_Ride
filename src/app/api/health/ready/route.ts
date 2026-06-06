/**
 * GET /api/health/ready
 * Readiness probe - checks if the application is ready to accept traffic
 * Tests DB connectivity to ensure the app can serve requests
 * Used by Kubernetes/load balancers to determine if the pod should receive traffic
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      db: 'connected',
    });
  } catch {
    return NextResponse.json(
      {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        db: 'error',
      },
      { status: 503 }
    );
  }
}
