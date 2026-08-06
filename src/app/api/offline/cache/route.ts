// ============================================
// SMART RIDE - OFFLINE CACHE API
// ============================================
// Returns critical data for offline caching
// Optimized for Uganda's weak internet
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TaskStatus } from '@prisma/client';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { CacheManager } from '@/lib/offline/cache-manager';
import { authGuard } from '@/lib/auth/guards';
import { redactPerson, redactBusiness } from '@/lib/privacy/public-contact';

// GET /api/offline/cache - Get all critical data for offline caching
export async function GET(request: NextRequest) {
  try {
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await setRLSContext({ userId: user.userId, role: user.role });

    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope') || 'minimal'; // minimal, standard, full
    const riderId = searchParams.get('riderId');

    const cachedData: Record<string, unknown> = {
      cachedAt: new Date().toISOString(),
      scope,
      userId: user.id,
    };

    // Minimal: Just user profile and active tasks
    // phone is not carried on the JWT — read it from the User record.
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });
    cachedData.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: profile?.phone ?? null,
      role: user.role,
    };

    if (scope === 'minimal' || scope === 'standard' || scope === 'full') {
      // Get user's active tasks
      const activeStatuses: TaskStatus[] = [
        'CREATED', 'REQUESTED', 'SEARCHING', 'MATCHING',
        'ASSIGNED', 'ACCEPTED', 'ARRIVING', 'ARRIVED',
        'PICKED_UP', 'IN_PROGRESS', 'IN_TRANSIT', 'DELIVERING',
      ];

      const activeTasks = await db.task.findMany({
        where: {
          OR: [
            { clientId: user.id, status: { in: activeStatuses } },
            ...(riderId ? [{ riderId, status: { in: activeStatuses } }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: scope === 'minimal' ? 5 : 20,
      });

      cachedData.activeTasks = activeTasks;
    }

    if (scope === 'standard' || scope === 'full') {
      // Get pricing configuration
      const pricingConfigs = await db.pricingConfig.findMany();
      cachedData.pricing = pricingConfigs;

      // Get recent orders
      const recentOrders = await db.order.findMany({
        where: { clientId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: true,
          merchant: {
            // PRIVACY: no merchant phone exposed to the customer.
            select: { id: true, name: true, address: true },
          },
        },
      });
      cachedData.recentOrders = recentOrders;

      // Get rider data if applicable
      if (riderId) {
        const rider = await db.rider.findUnique({
          where: { id: riderId },
          include: {
            vehicle: true,
          },
        });
        // PRIVACY: cache first name only, never the rider's phone/email.
        redactPerson(rider as Record<string, unknown> | null, 'fullName');
        cachedData.rider = rider;

        // Cache it
        await CacheManager.cacheRiderData(riderId);
      }
    }

    if (scope === 'full') {
      // Get nearby merchants
      const lat = parseFloat(searchParams.get('lat') || '0');
      const lng = parseFloat(searchParams.get('lng') || '0');
      
      if (lat && lng) {
        const merchants = await db.merchant.findMany({
          where: {
            isOpen: true,
            status: 'APPROVED',
          },
          include: {
            menuItems: {
              where: { isAvailable: true },
              take: 10,
            },
          },
          take: 50,
        });
        // PRIVACY: no merchant phone/email/banking in the customer cache.
        for (const m of merchants) redactBusiness(m as Record<string, unknown>);
        cachedData.nearbyMerchants = merchants;
      }

      // Get system config
      const configs = await db.systemConfig.findMany();
      cachedData.systemConfig = configs.reduce((acc: Record<string, string>, c) => {
        acc[c.key] = c.value;
        return acc;
      }, {});

      // Get notifications
      const notifications = await db.notification.findMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      cachedData.unreadNotifications = notifications;
    }

    // Set cache headers
    const maxAge = scope === 'minimal' ? 300 : scope === 'standard' ? 600 : 900;
    
    return NextResponse.json({
      success: true,
      data: cachedData,
      meta: {
        cachedAt: new Date().toISOString(),
        maxAge,
        scope,
      },
    }, {
      headers: {
        'Cache-Control': `private, max-age=${maxAge}`,
      },
    });
  } catch (error: unknown) {
    console.error('Offline cache error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
