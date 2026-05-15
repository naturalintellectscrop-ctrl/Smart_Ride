import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const parts = authHeader.split(' ')[1].split('_');
    const userId = parts[1];

    const rides = await db.ride.findMany({
      where: { clientId: userId },
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

    const parts = authHeader.split(' ')[1].split('_');
    const userId = parts[1];

    const body = await req.json();
    const {
      type = 'BODA',
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

    const ride = await db.ride.create({
      data: {
        clientId: userId,
        type,
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
  }
}
