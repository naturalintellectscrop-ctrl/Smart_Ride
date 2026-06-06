/**
 * GET /api/health/startup
 * Startup probe - checks that critical environment variables are set
 * Used by Kubernetes to determine if the application has started correctly
 * NEVER exposes the VALUES of environment variables, only boolean presence
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    JWT_SECRET: !!process.env.JWT_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  const allPresent = Object.values(checks).every(Boolean);

  if (allPresent) {
    return NextResponse.json({
      status: 'started',
      timestamp: new Date().toISOString(),
      checks,
    });
  }

  return NextResponse.json(
    {
      status: 'not_started',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: 503 }
  );
}
