/**
 * Fare Estimate API
 * GET /api/tasks/fare-estimate?distanceKm=5.2&durationMin=12
 *
 * Returns estimated fares for ALL ride types using the identical
 * calculatePricing() function used at task creation time.
 * This guarantees the figure shown to the user before booking
 * matches what gets stored on the task.
 *
 * No authentication required — this is a read-only calculation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { calculatePricingAsync } from '@/lib/api/pricing';
import { getSlaMinutes } from '@/lib/api/sla';
import { TaskType } from '@prisma/client';

const RIDE_TASK_TYPES: TaskType[] = ['SMART_BODA_RIDE', 'SMART_CAR_RIDE'];

export async function GET(request: NextRequest) {
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.search);
  if (!rateResult.success) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const distanceKm  = parseFloat(searchParams.get('distanceKm')  || '0');
  const durationMin = parseInt(searchParams.get('durationMin') || '0', 10);
  const rawLat = searchParams.get('pickupLatitude');
  const rawLng = searchParams.get('pickupLongitude');
  const pickupLatitude = rawLat !== null ? parseFloat(rawLat) : null;
  const pickupLongitude = rawLng !== null ? parseFloat(rawLng) : null;

  if (!distanceKm || distanceKm <= 0) {
    return NextResponse.json(
      { success: false, error: 'distanceKm must be a positive number' },
      { status: 400 },
    );
  }

  const isNightTime = (() => {
    const h = new Date().getHours();
    return h >= 22 || h < 6;
  })();

  const isPeakHours = (() => {
    const h = new Date().getHours();
    return (h >= 7 && h <= 9) || (h >= 17 && h <= 19);
  })();

  const estimates: Record<string, {
    totalAmount: number;
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    waitingCharge: number;
    serviceFee: number;
    surcharges: number;
    minimumApplied: boolean;
    // Surge is disclosed alongside the total so the client can explain the
    // price rather than merely display it. 1 / 0 / null when not surging.
    surgeMultiplier: number;
    surgeAmount: number;
    surgeReason: string | null;
  }> = {};

  for (const taskType of RIDE_TASK_TYPES) {
    const breakdown = await calculatePricingAsync({
      taskType,
      distanceKm,
      durationMinutes: durationMin,
      isNightTime,
      isPeakHours,
      // Optional: when the caller sends a pickup, the estimate includes surge
      // so the quoted price matches what task creation will charge.
      pickupLatitude,
      pickupLongitude,
    });

    // Detect whether minimum fare was the deciding factor. rawTotal mirrors the
    // full computed fare (every line the breakdown charges) so we only flag
    // "minimum applied" when the floor actually lifted the price.
    const rawTotal =
      breakdown.baseFare +
      breakdown.distanceFare +
      breakdown.timeFare +
      breakdown.waitingCharge +
      breakdown.nightSurcharge +
      breakdown.peakSurcharge +
      breakdown.serviceFee;

    // Compare the PRE-surge total against rawTotal. Surge is added on top of a
    // fare that has already cleared the floor, so including it here would
    // report "minimum fare applied" on every surging trip.
    const preSurgeTotal = breakdown.totalAmount - (breakdown.surgeAmount ?? 0);

    estimates[taskType] = {
      totalAmount: breakdown.totalAmount,
      baseFare: breakdown.baseFare,
      distanceFare: breakdown.distanceFare,
      timeFare: breakdown.timeFare,
      waitingCharge: breakdown.waitingCharge,
      serviceFee: breakdown.serviceFee,
      surcharges: breakdown.nightSurcharge + breakdown.peakSurcharge,
      minimumApplied: preSurgeTotal > rawTotal,
      // Surge is disclosed, not buried in the total — a rider who sees a
      // higher price with no explanation assumes they are being cheated.
      surgeMultiplier: breakdown.surgeMultiplier ?? 1,
      surgeAmount: breakdown.surgeAmount ?? 0,
      surgeReason: breakdown.surgeReason ?? null,
    };
  }

  // SLA targets per ride type (admin-configurable via SLAConfig).
  const sla: Record<string, number> = {};
  for (const taskType of RIDE_TASK_TYPES) {
    sla[taskType] = await getSlaMinutes(taskType);
  }

  return NextResponse.json({
    success: true,
    data: {
      estimates,
      sla,
      distanceKm,
      durationMin,
      isNightTime,
      isPeakHours,
    },
  });
}
