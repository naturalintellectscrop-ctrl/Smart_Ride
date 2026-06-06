/**
 * GET /api/health
 * Liveness probe - checks if the server is up and responding
 * Used by Kubernetes/load balancers to determine if the pod is alive
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
