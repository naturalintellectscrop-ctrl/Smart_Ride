/**
 * Smart Ride — Marketplace Scheduler
 *
 * The marketplace intelligence engine had no trigger. ZoneMetric and
 * SurgeRecord were only ever written when an admin manually POSTed
 * /api/marketplace/surge, which meant heat maps, demand/supply forecasting,
 * peak-hour detection and automatic surge were all inert — the columns and
 * the maths existed, but no data ever flowed into them.
 *
 * This service is that trigger. It samples every active zone on a fixed
 * cadence and lets the balance engine decide what to do:
 *
 *   sampleZones()   observe supply/demand -> write a ZoneMetric bucket
 *                   -> start/extend/end surge via shouldStartSurge/shouldEndSurge
 *   forecast()      project next-bucket demand/supply from recent history
 *
 * DECISIONS ARE THE ENGINE'S. This module only observes, persists and applies
 * — every threshold lives in balance-engine/types so surge behaviour stays in
 * one place.
 */

import { db } from '@/lib/db';
import {
  calculateDemandSupplyRatio,
  getBalanceStatus,
  calculateSurgeMultiplier,
  shouldStartSurge,
  shouldEndSurge,
  DEFAULT_SURGE_CONFIG,
} from './balance-engine';
import { toNumber } from '@/lib/decimal-utils';
import type { BalanceStatus as EngineBalanceStatus } from './types';
import { BalanceStatus, TaskStatus } from '@prisma/client';

/** Task states that mean a rider is actively occupied. */
const BUSY_STATES: TaskStatus[] = [
  'ASSIGNED', 'ACCEPTED', 'ARRIVING', 'ARRIVED',
  'PICKED_UP', 'IN_PROGRESS', 'IN_TRANSIT', 'DELIVERING',
];

/** Task states that represent unmet demand — a request with no rider yet. */
const DEMAND_STATES: TaskStatus[] = ['CREATED', 'REQUESTED', 'SEARCHING', 'MATCHING'];

/** How far back a sample looks for demand. Matches the sampling cadence. */
const SAMPLE_WINDOW_MINUTES = 5;

/** Buckets are aligned to the top of the hour for a stable time series. */
function currentBucket(now = new Date()): Date {
  const b = new Date(now);
  b.setMinutes(0, 0, 0);
  return b;
}

/** Rough bounding-box radius check; good enough for zone attribution. */
function withinZone(
  lat: number | null,
  lng: number | null,
  zone: { centerLatitude: number; centerLongitude: number; radiusKm: number }
): boolean {
  if (lat == null || lng == null) return false;
  const dLat = (lat - zone.centerLatitude) * 111; // km per degree latitude
  const dLng =
    (lng - zone.centerLongitude) * 111 * Math.cos((zone.centerLatitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng) <= zone.radiusKm;
}

/** Peak hours in Kampala: morning and evening commutes. */
function isPeakHour(d: Date): boolean {
  const h = d.getHours();
  return (h >= 7 && h < 10) || (h >= 17 && h < 20);
}

/** Map the engine's status union onto the Prisma enum. */
function toPrismaBalanceStatus(s: EngineBalanceStatus): BalanceStatus {
  return s as BalanceStatus;
}

export interface ZoneSampleResult {
  zoneId: string;
  zoneCode: string;
  activeDrivers: number;
  availableDrivers: number;
  demandCount: number;
  ratio: number;
  balanceStatus: BalanceStatus;
  surgeMultiplier: number;
  surgeStarted: boolean;
  surgeEnded: boolean;
}

export class MarketplaceScheduler {
  /**
   * Sample every active zone: observe supply and demand, persist a metric
   * bucket, and start/end surge where the engine says it is warranted.
   *
   * Idempotent per (zone, hour bucket) — re-running within the same hour
   * updates that bucket rather than creating duplicates, so a retried cron
   * run cannot inflate the series.
   */
  static async sampleZones(now = new Date()): Promise<ZoneSampleResult[]> {
    const zones = await db.geographicZone.findMany({ where: { isActive: true } });
    if (zones.length === 0) return [];

    const bucket = currentBucket(now);
    const since = new Date(now.getTime() - SAMPLE_WINDOW_MINUTES * 60_000);

    // Pull the working set once rather than per-zone.
    const [onlineRiders, recentTasks] = await Promise.all([
      db.rider.findMany({
        where: { isOnline: true, status: 'APPROVED' },
        select: { id: true, currentLatitude: true, currentLongitude: true },
      }),
      db.task.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          riderId: true,
          status: true,
          pickupLatitude: true,
          pickupLongitude: true,
          totalAmount: true,
          createdAt: true,
          acceptedAt: true,
        },
      }),
    ]);

    const busyRiderIds = new Set(
      recentTasks.filter(t => t.riderId && BUSY_STATES.includes(t.status)).map(t => t.riderId!)
    );

    const results: ZoneSampleResult[] = [];

    for (const zone of zones) {
      const zoneRiders = onlineRiders.filter(r =>
        withinZone(r.currentLatitude, r.currentLongitude, zone)
      );
      const activeDrivers = zoneRiders.length;
      const busyDrivers = zoneRiders.filter(r => busyRiderIds.has(r.id)).length;
      const availableDrivers = Math.max(0, activeDrivers - busyDrivers);

      const zoneTasks = recentTasks.filter(t =>
        withinZone(t.pickupLatitude, t.pickupLongitude, zone)
      );
      const demandCount = zoneTasks.length;
      const unfulfilled = zoneTasks.filter(t => DEMAND_STATES.includes(t.status)).length;
      const completed = zoneTasks.filter(t => t.status === 'COMPLETED').length;
      const cancelled = zoneTasks.filter(t => t.status === 'CANCELLED').length;
      const accepted = zoneTasks.filter(t => t.acceptedAt).length;

      const ratio = calculateDemandSupplyRatio(demandCount, availableDrivers);
      const engineStatus = getBalanceStatus(ratio);
      const balanceStatus = toPrismaBalanceStatus(engineStatus);

      // Ask the engine whether surge should change.
      const openSurge = await db.surgeRecord.findFirst({
        where: { zoneId: zone.id, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
      });
      const surgeActive = !!openSurge;

      let surgeMultiplier = openSurge?.multiplier ?? 1;
      let surgeStarted = false;
      let surgeEnded = false;

      if (shouldStartSurge(ratio, surgeActive, DEFAULT_SURGE_CONFIG)) {
        surgeMultiplier = calculateSurgeMultiplier(ratio, DEFAULT_SURGE_CONFIG);
        try {
          await db.surgeRecord.create({
            data: {
              zoneId: zone.id,
              // Unique while ACTIVE — the DB, not this read-then-write, is
              // what guarantees one surge per zone under concurrent runs.
              activeKey: zone.id,
              status: 'ACTIVE',
              multiplier: surgeMultiplier,
              startMultiplier: surgeMultiplier,
              peakMultiplier: surgeMultiplier,
              avgMultiplier: surgeMultiplier,
              triggerRatio: ratio,
              triggerReason: `Automatic: demand/supply ${ratio.toFixed(2)} (${engineStatus})`,
              driversBefore: availableDrivers,
              demandBefore: demandCount,
            },
          });
          surgeStarted = true;
        } catch (err) {
          // P2002 = another run opened this surge first. That is the guard
          // working, not an error: the zone is surging, which is the outcome
          // we wanted. Anything else is real.
          const code = (err as { code?: string }).code;
          if (code !== 'P2002') throw err;
          surgeStarted = false;
        }
      } else if (surgeActive && shouldEndSurge(ratio, DEFAULT_SURGE_CONFIG)) {
        const durationMinutes = Math.max(
          1,
          Math.round((now.getTime() - openSurge!.startedAt.getTime()) / 60_000)
        );
        await db.surgeRecord.update({
          where: { id: openSurge!.id },
          data: {
            status: 'ENDED',
            // Release the guard so a future surge can open in this zone.
            activeKey: null,
            endedAt: now,
            durationMinutes,
            endReason: `Automatic: demand/supply fell to ${ratio.toFixed(2)}`,
            driversAfter: availableDrivers,
            demandAfter: demandCount,
            avgMultiplier: (openSurge!.startMultiplier + openSurge!.multiplier) / 2,
          },
        });
        surgeMultiplier = 1;
        surgeEnded = true;
      } else if (surgeActive) {
        // Surge continues — track the peak and keep the multiplier current.
        const next = calculateSurgeMultiplier(ratio, DEFAULT_SURGE_CONFIG);
        await db.surgeRecord.update({
          where: { id: openSurge!.id },
          data: {
            multiplier: next,
            peakMultiplier: Math.max(openSurge!.peakMultiplier, next),
            ridesDuringSurge: { increment: completed },
          },
        });
        surgeMultiplier = next;
      }

      const avgFare =
        zoneTasks.length > 0
          ? zoneTasks.reduce((s, t) => s + toNumber(t.totalAmount), 0) / zoneTasks.length
          : 0;

      await db.zoneMetric.upsert({
        where: { zoneId_timeBucket: { zoneId: zone.id, timeBucket: bucket } },
        create: {
          zoneId: zone.id,
          timeBucket: bucket,
          activeDrivers,
          busyDrivers,
          availableDrivers,
          demandCount,
          rideRequests: demandCount,
          uniqueRequesters: new Set(zoneTasks.map(t => t.id)).size,
          completedRides: completed,
          cancelledRides: cancelled,
          unfulfilledDemand: unfulfilled,
          demandSupplyRatio: ratio,
          balanceStatus,
          surgeActive: surgeStarted || (surgeActive && !surgeEnded),
          surgeMultiplier,
          cancellationRate: demandCount > 0 ? cancelled / demandCount : 0,
          driverAcceptanceRate: demandCount > 0 ? accepted / demandCount : 0,
          avgFare,
          isPeakHour: isPeakHour(now),
        },
        update: {
          activeDrivers,
          busyDrivers,
          availableDrivers,
          demandCount,
          rideRequests: demandCount,
          completedRides: completed,
          cancelledRides: cancelled,
          unfulfilledDemand: unfulfilled,
          demandSupplyRatio: ratio,
          balanceStatus,
          surgeActive: surgeStarted || (surgeActive && !surgeEnded),
          surgeMultiplier,
          cancellationRate: demandCount > 0 ? cancelled / demandCount : 0,
          driverAcceptanceRate: demandCount > 0 ? accepted / demandCount : 0,
          avgFare,
          isPeakHour: isPeakHour(now),
        },
      });

      results.push({
        zoneId: zone.id,
        zoneCode: zone.code,
        activeDrivers,
        availableDrivers,
        demandCount,
        ratio,
        balanceStatus,
        surgeMultiplier,
        surgeStarted,
        surgeEnded,
      });
    }

    return results;
  }

  /**
   * Project next-bucket demand and supply for each zone from its recent
   * history, and write the projection onto the CURRENT bucket so the heat map
   * and driver-positioning surfaces have something to read.
   *
   * Deliberately simple: an hour-of-day weighted average over the trailing
   * window. It is a real forecast from real history, not a placeholder — and
   * it can be swapped for a stronger model without changing callers.
   */
  static async forecast(now = new Date(), lookbackDays = 14): Promise<number> {
    const zones = await db.geographicZone.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    if (zones.length === 0) return 0;

    const since = new Date(now.getTime() - lookbackDays * 24 * 60 * 60_000);
    const nextHour = (now.getHours() + 1) % 24;
    const bucket = currentBucket(now);
    let written = 0;

    for (const zone of zones) {
      const history = await db.zoneMetric.findMany({
        where: { zoneId: zone.id, timeBucket: { gte: since } },
        select: { timeBucket: true, demandCount: true, availableDrivers: true },
      });

      // Same hour-of-day on previous days is the strongest simple predictor.
      const sameHour = history.filter(h => h.timeBucket.getHours() === nextHour);
      const sample = sameHour.length >= 3 ? sameHour : history;
      if (sample.length === 0) continue;

      const predictedDemand =
        sample.reduce((s, h) => s + h.demandCount, 0) / sample.length;
      const predictedSupply =
        sample.reduce((s, h) => s + h.availableDrivers, 0) / sample.length;
      const predictedRatio = calculateDemandSupplyRatio(predictedDemand, predictedSupply);

      await db.zoneMetric.updateMany({
        where: { zoneId: zone.id, timeBucket: bucket },
        data: {
          predictedDemand: Math.round(predictedDemand * 10) / 10,
          predictedSupply: Math.round(predictedSupply * 10) / 10,
          predictedRatio: Math.round(predictedRatio * 100) / 100,
        },
      });
      written++;
    }

    return written;
  }
}

export default MarketplaceScheduler;
