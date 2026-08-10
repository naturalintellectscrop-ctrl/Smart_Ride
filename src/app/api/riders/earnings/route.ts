/**
 * GET /api/riders/earnings
 * Returns earnings breakdown for the authenticated rider
 * Supports period filter: today, week, month, lifetime
 *
 * Calculates earnings from completed tasks using actual riderEarnings
 * and platformCommission fields.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { toNumber } from '@/lib/decimal-utils';

// Commission rates by service type
const COMMISSION_RATES: Record<string, { riderPercent: number; platformPercent: number }> = {
  SMART_BODA_RIDE: { riderPercent: 85, platformPercent: 15 },
  SMART_CAR_RIDE: { riderPercent: 80, platformPercent: 20 },
  FOOD_DELIVERY: { riderPercent: 85, platformPercent: 15 },
  SHOPPING: { riderPercent: 88, platformPercent: 12 },
  ITEM_DELIVERY: { riderPercent: 90, platformPercent: 10 },
  SMART_HEALTH_DELIVERY: { riderPercent: 85, platformPercent: 15 },
};

interface PeriodEarnings {
  totalEarnings: number;
  totalCommission: number;
  totalRevenue: number;
  tripCount: number;
  rides: number;
  deliveries: number;
  health: number;
}

function calcEarnings(tasks: { riderEarnings: number | null; platformCommission: number | null; totalAmount: number | null; taskType: string }[]): PeriodEarnings {
  const totalEarnings = tasks.reduce((sum, t) => sum + toNumber(t.riderEarnings), 0);
  const totalCommission = tasks.reduce((sum, t) => sum + toNumber(t.platformCommission), 0);
  const totalRevenue = tasks.reduce((sum, t) => sum + toNumber(t.totalAmount), 0);
  const rides = tasks.filter(t => t.taskType === 'SMART_BODA_RIDE' || t.taskType === 'SMART_CAR_RIDE').length;
  const deliveries = tasks.filter(t => t.taskType === 'FOOD_DELIVERY' || t.taskType === 'SHOPPING' || t.taskType === 'ITEM_DELIVERY').length;
  const health = tasks.filter(t => t.taskType === 'SMART_HEALTH_DELIVERY').length;
  return { totalEarnings, totalCommission, totalRevenue, tripCount: tasks.length, rides, deliveries, health };
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // This route established NO RLS context at all, so it ran against whatever
    // session state the pooled connection happened to be left in by the
    // previous request. Under a leftover smart_ride_api role the rider's own
    // tasks are invisible — there is no rider SELECT policy on Task — so every
    // period, including lifetime, came back 0 and the app's earnings card read
    // "UGX 0 · 0 trips today" for a rider who had completed trips that day.
    // Reading a rider's own completed tasks is a system read: elevate, then
    // scope strictly by the rider resolved from the caller's own token below.
    await setServiceRoleContext();

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';

    // Get rider profile
    const rider = await db.rider.findFirst({
      where: { userId },
    });

    if (!rider) {
      return errorResponse('Rider profile not found', 404);
    }

    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Base where clause for completed tasks by this rider
    const whereBase = {
      riderId: rider.id,
      status: 'COMPLETED' as const,
    };

    // Query all periods in parallel
    const [todayTasks, weekTasks, monthTasks, allTasks] = await Promise.all([
      db.task.findMany({
        where: { ...whereBase, completedAt: { gte: todayStart } },
        select: { totalAmount: true, platformCommission: true, riderEarnings: true, taskType: true, completedAt: true },
      }),
      db.task.findMany({
        where: { ...whereBase, completedAt: { gte: weekStart } },
        select: { totalAmount: true, platformCommission: true, riderEarnings: true, taskType: true, completedAt: true },
      }),
      db.task.findMany({
        where: { ...whereBase, completedAt: { gte: monthStart } },
        select: { totalAmount: true, platformCommission: true, riderEarnings: true, taskType: true, completedAt: true },
      }),
      db.task.findMany({
        where: whereBase,
        select: { totalAmount: true, platformCommission: true, riderEarnings: true, taskType: true, completedAt: true },
      }),
    ]);

    // Calculate earnings by period - map Decimal fields to numbers
    const mapTasks = (tasks: { totalAmount: any; platformCommission: any; riderEarnings: any; taskType: any; completedAt: any }[]) =>
      tasks.map(t => ({
        totalAmount: toNumber(t.totalAmount),
        platformCommission: toNumber(t.platformCommission),
        riderEarnings: toNumber(t.riderEarnings),
        taskType: t.taskType as string,
        completedAt: t.completedAt,
      }));
    const today = calcEarnings(mapTasks(todayTasks));
    const week = calcEarnings(mapTasks(weekTasks));
    const month = calcEarnings(mapTasks(monthTasks));
    const lifetime = calcEarnings(mapTasks(allTasks));

    // Get wallet balance. Must be the same wallet /riders/withdraw debits —
    // reading a RIDER-owned wallet while the withdrawal debited a USER-owned
    // one meant the screen showed a balance nobody could withdraw (BE-003).
    const wallet = await db.wallet.findUnique({
      where: { ownerId_ownerType: { ownerId: rider.userId, ownerType: 'USER' } },
    });

    // Determine the active period earnings for quick access
    let activePeriod: PeriodEarnings;
    switch (period) {
      case 'week':
        activePeriod = week;
        break;
      case 'month':
        activePeriod = month;
        break;
      case 'lifetime':
        activePeriod = lifetime;
        break;
      default:
        activePeriod = today;
    }

    return successResponse({
      earnings: {
        today,
        week,
        month,
        lifetime,
      },
      activePeriod,
      wallet: {
        balance: wallet?.balance || 0,
        pendingBalance: wallet?.pendingBalance || 0,
        totalDeposited: wallet?.totalDeposited || 0,
        totalWithdrawn: wallet?.totalWithdrawn || 0,
      },
      rider: {
        totalEarnings: toNumber(rider.totalEarnings),
        totalTrips: rider.totalTrips,
        completedTrips: rider.completedTrips,
        cancelledTrips: rider.cancelledTrips,
        rating: rider.rating,
      },
      commissionRates: COMMISSION_RATES,
      period,
    });
  } catch (error) {
    console.error('Error fetching rider earnings:', error);
    return serverErrorResponse('Failed to fetch rider earnings');
  } finally {
    await resetRLSContext();
  }
}
