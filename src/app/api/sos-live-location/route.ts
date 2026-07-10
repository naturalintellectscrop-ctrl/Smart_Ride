import { NextRequest, NextResponse } from 'next/server';
import { db, resetRLSContext } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { isAdmin, JWTPayload } from '@/lib/auth/jwt';
import { z } from 'zod';

// GET /api/sos-live-location - Get live location updates for an SOS alert
// SECURITY: Admins or the alert's owner only
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult as JWTPayload;
  const userIsAdmin = isAdmin(user.role);

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

    const alert = await db.sOSAlert.findUnique({
      where: { id: sosAlertId },
      select: { userId: true, status: true, createdAt: true },
    });
    // 404 (not 403) for foreign alerts so non-admins can't probe alert IDs
    if (!alert || (!userIsAdmin && alert.userId !== user.userId)) {
      return NextResponse.json({ success: false, error: 'SOS alert not found' },
        { status: 404 }
      );
    }

    const locationUpdates = await db.sOSLocationUpdate.findMany({
      where: { sosAlertId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      alert: { status: alert.status, triggeredAt: alert.createdAt },
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
// SECURITY: Admins or the alert's owner only
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult as JWTPayload;
  const userIsAdmin = isAdmin(user.role);

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
    if (!sosAlertId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ success: false, error: 'SOS Alert ID and location are required' },
        { status: 400 }
      );
    }

    // Check if alert exists, belongs to the caller, and is still active
    const alert = await db.sOSAlert.findUnique({
      where: { id: sosAlertId },
      select: { userId: true, status: true },
    });

    if (!alert || (!userIsAdmin && alert.userId !== user.userId)) {
      return NextResponse.json({ success: false, error: 'SOS alert not found' },
        { status: 404 }
      );
    }

    if (alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM') {
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
        accuracy: accuracy ?? null,
        speed: speed ?? null,
        heading: heading ?? null,
        batteryLevel: batteryLevel ?? null,
      },
    });

    // Update the alert's last known location
    await db.sOSAlert.update({
      where: { id: sosAlertId },
      data: { latitude, longitude },
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
