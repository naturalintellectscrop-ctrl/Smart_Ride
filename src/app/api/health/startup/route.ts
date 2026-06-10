/**
 * GET /api/health/startup
 * Startup probe - checks that critical environment variables are set
 * and reports feature availability status.
 * Used by Kubernetes to determine if the application has started correctly.
 * NEVER exposes the VALUES of environment variables, only boolean presence.
 */

import { NextResponse } from 'next/server';
import { getEnvStatus } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    JWT_SECRET: !!process.env.JWT_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  const allPresent = Object.values(checks).every(Boolean);

  // Include feature availability info from env validation
  const features = getEnvStatus();

  if (allPresent) {
    return NextResponse.json({
      status: 'started',
      timestamp: new Date().toISOString(),
      checks,
      features,
    });
  }

  return NextResponse.json(
    {
      status: 'not_started',
      timestamp: new Date().toISOString(),
      checks,
      features,
    },
    { status: 503 }
  );
}
