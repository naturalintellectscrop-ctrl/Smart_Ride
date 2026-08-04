/**
 * Rider Onboarding API
 * GET  /api/riders/onboarding - Get current onboarding state for the authenticated user
 * PUT  /api/riders/onboarding - Save a step's data (draft persistence) for the authenticated user
 * POST /api/riders/onboarding - Register a new rider with documents and vehicle info
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';
import { RiderOnboardingService } from '@/lib/rider/rider-onboarding.service';

/**
 * GET /api/riders/onboarding
 * Returns the rider's current onboarding state.
 * If a rider record exists, returns its status and stored document/vehicle info.
 * Otherwise returns an empty draft state.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as JWTPayload;

  await setServiceRoleContext();
  try {
    const rider = await db.rider.findUnique({
      where: { userId: user.userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        physicalAddress: true,
        riderRole: true,
        status: true,
        vehicleType: true,
        facePhotoUrl: true,
        nationalIdFrontUrl: true,
        nationalIdBackUrl: true,
        driverLicenseUrl: true,
        vehiclePhotoUrl: true,
        createdAt: true,
        updatedAt: true,
        verifiedAt: true,
        verificationNotes: true,
      },
    });

    if (!rider) {
      return NextResponse.json({
        success: true,
        onboarding: {
          status: 'NOT_STARTED',
          currentStep: 1,
          steps: [],
        },
      });
    }

    // Determine the onboarding step from rider status
    let currentStep = 4; // default to review step
    if (rider.status === 'PENDING_APPROVAL') {
      currentStep = 4;
    } else if (!rider.facePhotoUrl && !rider.nationalIdFrontUrl) {
      currentStep = 2;
    }

    // Reconstruct the documents/vehicle state from the rider record
    // Explicit element type: the literal below would otherwise infer a union
    // of just the personal/documents shapes, rejecting the vehicle step push.
    const steps: { step: string; data: Record<string, string> }[] = [
      {
        step: 'personal',
        data: {
          fullName: rider.fullName || '',
          phone: rider.phone || '',
          email: rider.email || '',
          address: rider.physicalAddress || '',
        },
      },
      {
        step: 'documents',
        data: {
          photoUrl: rider.facePhotoUrl || '',
          nationalIdFront: rider.nationalIdFrontUrl || '',
          nationalIdBack: rider.nationalIdBackUrl || '',
          licensePhoto: rider.driverLicenseUrl || '',
          vehiclePhoto: rider.vehiclePhotoUrl || '',
          licenseNumber: '',
          licenseExpiry: '',
        },
      },
    ];

    // Include vehicle info if available
    const vehicle = await db.vehicle.findUnique({
      where: { riderId: rider.id },
      select: {
        make: true,
        model: true,
        year: true,
        color: true,
        plateNumber: true,
      },
    }).catch(() => null);

    if (vehicle) {
      steps.push({
        step: 'vehicle',
        data: {
          vehicleType: rider.vehicleType || '',
          make: vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year ? String(vehicle.year) : '',
          color: vehicle.color || '',
          plateNumber: vehicle.plateNumber || '',
        },
      });
    }

    return NextResponse.json({
      success: true,
      onboarding: {
        id: rider.id,
        status: rider.status,
        currentStep,
        steps,
        riderRole: rider.riderRole,
        verifiedAt: rider.verifiedAt,
        verificationNotes: rider.verificationNotes,
      },
    });
  } catch (error) {
    console.error('Error fetching onboarding state:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load onboarding state' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

/**
 * PUT /api/riders/onboarding
 * Persist a single step's data as draft. Updates the rider record if it exists,
 * otherwise returns success (drafts are kept client-side until final submission).
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as JWTPayload;

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { step, ...data } = body;

    // Try to find an existing rider record (created during earlier partial submission)
    const rider = await db.rider.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });

    if (!rider) {
      // No rider record yet — accept the draft and return success
      return NextResponse.json({
        success: true,
        message: 'Draft saved',
        step,
        data,
      });
    }

    // Persist document URLs to the rider record when the documents step is saved
    if (step === 'documents') {
      await db.rider.update({
        where: { id: rider.id },
        data: {
          facePhotoUrl: data.photoUrl || data.facePhotoUrl || null,
          nationalIdFrontUrl: data.nationalIdFront || data.nationalIdFrontUrl || null,
          nationalIdBackUrl: data.nationalIdBack || data.nationalIdBackUrl || null,
          driverLicenseUrl: data.licensePhoto || data.driverLicenseUrl || null,
          vehiclePhotoUrl: data.vehiclePhoto || data.vehiclePhotoUrl || null,
        },
      });
    } else if (step === 'personal') {
      await db.rider.update({
        where: { id: rider.id },
        data: {
          fullName: data.fullName || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          physicalAddress: data.address || data.physicalAddress || undefined,
        },
      });
    } else if (step === 'vehicle') {
      // Update or create the vehicle record
      const existingVehicle = await db.vehicle.findUnique({
        where: { riderId: rider.id },
        select: { id: true },
      }).catch(() => null);

      const vehicleData = {
        make: data.make || 'Unknown',
        model: data.model || 'Unknown',
        year: data.year ? Number(data.year) : null,
        color: data.color || 'Unknown',
        plateNumber: data.plateNumber || 'PENDING',
      };

      if (existingVehicle) {
        await db.vehicle.update({
          where: { id: existingVehicle.id },
          data: vehicleData,
        });
      } else {
        await db.vehicle.create({
          data: {
            riderId: rider.id,
            ...vehicleData,
          },
        });
      }

      // Persist vehicleType on rider if provided
      if (data.vehicleType) {
        await db.rider.update({
          where: { id: rider.id },
          data: { vehicleType: data.vehicleType as any },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Step saved',
      step,
    });
  } catch (error) {
    console.error('Error saving onboarding step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save step' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

/**
 * POST /api/riders/onboarding - Register a new rider with documents and vehicle info
 */
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
