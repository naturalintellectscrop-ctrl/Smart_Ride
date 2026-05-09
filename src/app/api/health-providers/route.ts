/**
 * Health Providers API
 * GET /api/health-providers - List all health providers (public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch health providers (for admin dashboard and public listing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where: any = {};
    
    // Filter by verification status
    if (status) {
      where.verificationStatus = status;
    }
    
    // Filter by provider type
    if (type) {
      where.providerType = type;
    }
    
    // Search by name or address
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { ownerFullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const providers = await db.healthProvider.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        providerType: true,
        address: true,
        city: true,
        district: true,
        latitude: true,
        longitude: true,
        verificationStatus: true,
        isOpenNow: true,
        totalOrders: true,
        rating: true,
        supportsPrescription: true,
        supportsOTC: true,
        supportsDelivery: true,
        supportsPickup: true,
        ownerFullName: true,
        ownerPhone: true,
        createdAt: true,
      },
    });

    const total = await db.healthProvider.count({ where });

    return NextResponse.json({
      providers,
      total,
      hasMore: offset + providers.length < total,
    });
  } catch (error) {
    console.error('Error fetching health providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health providers' },
      { status: 500 }
    );
  }
}
