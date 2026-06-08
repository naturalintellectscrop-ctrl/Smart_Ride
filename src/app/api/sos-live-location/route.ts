import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { z } from 'zod';

// GET /api/sos-live-location - Get live location updates for an SOS alert
export async function GET(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);

    const sosGetQuerySchema = z.object({
      sosAlertId: z.string().min(1),
      limit: z.coerce.number().int().positive().max(1000).default(100),
    });

    const queryParams = {
      sosAlertId: searchParams.get('sosAlertId') || '',
      limit: searchParams.get('limit') || '100',
    };
    const parsed = sosGetQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { sosAlertId, limit } = parsed.data;

    const locationUpdates = await db.sOSLocationUpdate.findMany({
      where: { sosAlertId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get the alert status
    const alert = await db.sOSAlert.findUnique({
      where: { id: sosAlertId },
      select: { status: true, severity: true, triggeredAt: true },
    });

    return NextResponse.json({
      alert,
      locationUpdates: locationUpdates.reverse(), // Return in chronological order
    });
  } catch (error) {
    console.error('Error fetching location updates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch location updates' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST /api/sos-live-location - Add new location update during SOS
export async function POST(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const body = await request.json();
    const {
      sosAlertId,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      batteryLevel,
    } = body;

    // Validate required fields
    if (!sosAlertId || !latitude || !longitude) {
      return NextResponse.json({ success: false, error: 'SOS Alert ID and location are required' },
        { status: 400 }
      );
    }

    // Check if alert is still active
    const alert = await db.sOSAlert.findUnique({
      where: { id: sosAlertId },
    });

    if (!alert) {
      return NextResponse.json({ success: false, error: 'SOS alert not found' },
        { status: 404 }
      );
    }

    if (alert.status === 'RESOLVED' || alert.status === 'CANCELLED' || alert.status === 'FALSE_ALARM') {
      return NextResponse.json({ success: false, error: 'SOS alert is no longer active' },
        { status: 400 }
      );
    }

    // Create location update
    const locationUpdate = await db.sOSLocationUpdate.create({
      data: {
        sosAlertId,
        latitude,
        longitude,
        accuracy: accuracy || null,
        speed: speed || null,
        heading: heading || null,
        batteryLevel: batteryLevel || null,
      },
    });

    // Update the alert's last known location
    await db.sOSAlert.update({
      where: { id: sosAlertId },
      data: {
        latitude,
        longitude,
        accuracy: accuracy || null,
      },
    });

    return NextResponse.json({
      success: true,
      locationUpdate,
    });
  } catch (error) {
    console.error('Error creating location update:', error);
    return NextResponse.json({ success: false, error: 'Failed to create location update' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
