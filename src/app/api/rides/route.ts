import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    await setRLSContext({ userId: payload.userId, role: payload.role });

    // Use Task model for rides (RIDE type tasks)
    const rides = await db.task.findMany({
      where: {
        clientId: payload.userId,
        type: { in: ['RIDE_BODA', 'RIDE_CAR', 'RIDE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ success: true, data: rides });
  } catch (error) {
    console.error('Rides GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rides' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    await setRLSContext({ userId: payload.userId, role: payload.role });

    const body = await req.json();
    const {
      type = 'RIDE_BODA',
      pickupAddress,
      pickupLat,
      pickupLng,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      fare,
      distance,
      duration,
      paymentMethod = 'CASH',
    } = body;

    if (!pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { success: false, error: 'Pickup and dropoff locations are required' },
        { status: 400 }
      );
    }

    // Create a ride task using the Task model
    const ride = await db.task.create({
      data: {
        clientId: payload.userId,
        type,
        status: 'PENDING',
        pickupAddress,
        pickupLat: pickupLat || 0.3476,
        pickupLng: pickupLng || 32.5825,
        dropoffAddress,
        dropoffLat: dropoffLat || 0.3576,
        dropoffLng: dropoffLng || 32.5925,
        fare: fare || 0,
        distance: distance || 0,
        duration: duration || 0,
        paymentMethod,
      },
    });

    return NextResponse.json({ success: true, data: ride }, { status: 201 });
  } catch (error) {
    console.error('Rides POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create ride' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
