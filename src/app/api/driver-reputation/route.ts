import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TrustTier } from '@prisma/client';

// GET /api/driver-reputation - Get all driver reputations with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tier = searchParams.get('tier') as TrustTier | null;
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const isSuspended = searchParams.get('isSuspended');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (tier) {
      where.trustTier = tier;
    }
    
    if (minScore || maxScore) {
      where.trustScore = {
        ...(minScore && { gte: parseFloat(minScore) }),
        ...(maxScore && { lte: parseFloat(maxScore) }),
      };
    }
    
    if (isSuspended !== null) {
      where.isSuspended = isSuspended === 'true';
    }
    
    if (search) {
      where.rider = {
        OR: [
          { fullName: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    const [reputations, total] = await Promise.all([
      db.driverReputation.findMany({
        where,
        include: {
          rider: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              riderRole: true,
              status: true,
              isOnline: true,
              currentLatitude: true,
              currentLongitude: true,
              rating: true,
              totalTrips: true,
              completedTrips: true,
            },
          },
        },
        orderBy: { trustScore: 'desc' },
        skip,
        take: limit,
      }),
      db.driverReputation.count({ where }),
    ]);

    // Calculate summary statistics
    const stats = await db.driverReputation.aggregate({
      _avg: {
        trustScore: true,
        averageRating: true,
        completionRate: true,
        acceptanceRate: true,
        safetyScore: true,
        fraudRiskScore: true,
      },
      _count: {
        _all: true,
      },
    });

    // Count by tier
    const tierCounts = await db.driverReputation.groupBy({
      by: ['trustTier'],
      _count: {
        trustTier: true,
      },
    });

    const tierDistribution = {
      PLATINUM: 0,
      GOLD: 0,
      SILVER: 0,
      WARNING: 0,
      SUSPENDED: 0,
    };
    
    tierCounts.forEach((item) => {
      tierDistribution[item.trustTier] = item._count.trustTier;
    });

    return NextResponse.json({
      success: true,
      data: reputations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        averageTrustScore: stats._avg.trustScore || 0,
        averageRating: stats._avg.averageRating || 0,
        averageCompletionRate: stats._avg.completionRate || 0,
        averageAcceptanceRate: stats._avg.acceptanceRate || 0,
        averageSafetyScore: stats._avg.safetyScore || 0,
        averageFraudRiskScore: stats._avg.fraudRiskScore || 0,
        totalDrivers: stats._count._all,
        tierDistribution,
      },
    });
  } catch (error) {
    console.error('Error fetching driver reputations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch driver reputations' },
      { status: 500 }
    );
  }
}
