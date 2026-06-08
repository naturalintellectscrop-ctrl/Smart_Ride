/**
 * Rider Onboarding API
 * POST /api/riders/onboarding - Register a new rider with documents and vehicle info
 */

import { NextRequest, NextResponse } from 'next/server';
import { RiderOnboardingService } from '@/lib/rider/rider-onboarding.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rider = await RiderOnboardingService.registerRider(body);

    return NextResponse.json(
      {
        success: true,
        rider: {
          id: rider.id,
          fullName: rider.fullName,
          phone: rider.phone,
          riderRole: rider.riderRole,
          status: rider.status,
          createdAt: rider.createdAt,
        },
        message: 'Rider registration submitted. Awaiting approval.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Rider onboarding error:', error);
    const isClientError = error instanceof Error && (
      error.message.includes('required') ||
      error.message.includes('Invalid') ||
      error.message.includes('already exists') ||
      error.message.includes('already has')
    );
    const status = isClientError ? 400 : 500;
    return NextResponse.json(
      { success: false, error: isClientError ? 'Invalid registration data' : 'An internal error occurred' },
      { status }
    );
  }
}
