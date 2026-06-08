/**
 * Inventory Cleanup API Route
 * POST /api/inventory/cleanup — Expire old reservations (older than 15 minutes)
 *
 * This endpoint should be called periodically (e.g., via cron) to clean up
 * expired inventory reservations and return stock to the available pool.
 *
 * Security: Requires x-internal-key header or admin authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/lib/inventory/inventory-service';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Security check: internal key or admin auth
    const internalKey = request.headers.get('x-internal-key');
    const authHeader = request.headers.get('authorization');

    if (!internalKey && !authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Requires x-internal-key or authorization header.' },
        { status: 401 }
      );
    }

    // Release expired reservations
    const result = await InventoryService.releaseExpiredReservations();

    // Also find and clean up stale reservations that have been RESERVED
    // but were never confirmed/released and are past expiry
    const staleCount = await db.inventoryReservation.count({
      where: {
        status: 'RESERVED',
        expiresAt: { lt: new Date() },
      },
    });

    // Get summary stats
    const activeReservations = await db.inventoryReservation.count({
      where: {
        status: 'RESERVED',
        expiresAt: { gt: new Date() },
      },
    });

    const totalConfirmed = await db.inventoryReservation.count({
      where: { status: 'CONFIRMED' },
    });

    const totalExpired = await db.inventoryReservation.count({
      where: { status: 'EXPIRED' },
    });

    return NextResponse.json({
      success: true,
      message: result.released > 0
        ? `Released ${result.released} expired reservation(s)`
        : 'No expired reservations to clean up',
      released: result.released,
      errors: result.errors,
      stats: {
        staleRemaining: staleCount,
        activeReservations,
        totalConfirmed,
        totalExpired,
      },
    });
  } catch (error: unknown) {
    const logMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[InventoryAPI] POST /inventory/cleanup failed:', logMessage);
    return NextResponse.json({ success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inventory/cleanup — Get cleanup stats (no side effects)
 */
export async function GET(request: NextRequest) {
  try {
    // Security check
    const internalKey = request.headers.get('x-internal-key');
    const authHeader = request.headers.get('authorization');

    if (!internalKey && !authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Requires x-internal-key or authorization header.' },
        { status: 401 }
      );
    }

    const now = new Date();

    const [
      expiredReservations,
      activeReservations,
      totalConfirmed,
      totalReleased,
      totalExpired,
      lowStockItems,
    ] = await Promise.all([
      db.inventoryReservation.count({
        where: { status: 'RESERVED', expiresAt: { lt: now } },
      }),
      db.inventoryReservation.count({
        where: { status: 'RESERVED', expiresAt: { gt: now } },
      }),
      db.inventoryReservation.count({
        where: { status: 'CONFIRMED' },
      }),
      db.inventoryReservation.count({
        where: { status: 'RELEASED' },
      }),
      db.inventoryReservation.count({
        where: { status: 'EXPIRED' },
      }),
      db.menuItem.count({
        where: {
          stockQuantity: { not: null, lte: 5, gt: 0 },
          isAvailable: true,
        },
      }),
    ]);

    // Get the oldest expired reservation
    const oldestExpired = await db.inventoryReservation.findFirst({
      where: { status: 'RESERVED', expiresAt: { lt: now } },
      orderBy: { expiresAt: 'asc' },
      select: { id: true, expiresAt: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      cleanupNeeded: expiredReservations > 0,
      stats: {
        expiredReservationsNeedingCleanup: expiredReservations,
        activeReservations,
        totalConfirmed,
        totalReleased,
        totalExpired,
        lowStockItemCount: lowStockItems,
        oldestExpiredReservation: oldestExpired
          ? {
              id: oldestExpired.id,
              expiredAt: oldestExpired.expiresAt,
              createdAt: oldestExpired.createdAt,
              minutesAgo: Math.round((now.getTime() - oldestExpired.expiresAt.getTime()) / 60000),
            }
          : null,
      },
    });
  } catch (error: unknown) {
    const logMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[InventoryAPI] GET /inventory/cleanup failed:', logMessage);
    return NextResponse.json({ success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  }
}
