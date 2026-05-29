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
  } catch (error) {
    console.error('Rider onboarding error:', error);
    const message = error instanceof Error ? error.message : 'Failed to register rider';
    const status =
      message.includes('required') ||
      message.includes('Invalid') ||
      message.includes('already exists') ||
      message.includes('already has')
        ? 400
        : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
