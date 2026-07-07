/**
 * GET /api/admin/riders/live
 *
 * Live positions of every APPROVED rider for the admin Live Monitoring map.
 * Returns all approved riders (online AND offline — offline render as
 * disconnected/grey markers) with their last known GPS fix, heartbeat age and
 * battery. Admin-only; full names are allowed on the admin dashboard.
 *
 * This is the HTTP source of truth the dashboard polls (~15s). Supabase
 * realtime events remain a low-latency enhancement on top — previously the
 * monitoring screen relied ONLY on a realtime broadcast that nothing was
 * emitting, so the map stayed empty.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];

// Heartbeat freshness thresholds (seconds) → connection status buckets.
const ACTIVE_S = 90;
const UNSTABLE_S = 300;

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const decoded = verifyAccessToken(token);
  if (!decoded || !ADMIN_ROLES.includes(decoded.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const riders = await db.rider.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        fullName: true,
        riderRole: true,
        isOnline: true,
        currentLatitude: true,
        currentLongitude: true,
        lastKnownHeading: true,
        lastHeartbeatAt: true,
        currentTaskId: true,
        // battery lives on HeartbeatLog, not Rider — take the latest reading
        heartbeatLogs: {
          select: { batteryLevel: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { isOnline: 'desc' },
    });

    const now = Date.now();
    const data = riders.map((r) => {
      const hbAgeS = r.lastHeartbeatAt
        ? Math.floor((now - r.lastHeartbeatAt.getTime()) / 1000)
        : null;
      const connectionStatus = !r.isOnline
        ? 'DISCONNECTED'
        : hbAgeS == null || hbAgeS > UNSTABLE_S
          ? 'DISCONNECTED'
          : hbAgeS > ACTIVE_S
            ? 'UNSTABLE'
            : 'ACTIVE';
      return {
        riderId: r.id,
        riderName: r.fullName,
        riderRole: r.riderRole,
        isOnline: r.isOnline,
        connectionStatus,
        lastKnownLocation:
          r.currentLatitude != null && r.currentLongitude != null
            ? { latitude: r.currentLatitude, longitude: r.currentLongitude }
            : null,
        heading: r.lastKnownHeading,
        lastHeartbeatAt: r.lastHeartbeatAt,
        secondsSinceHeartbeat: hbAgeS,
        batteryLevel: r.heartbeatLogs[0]?.batteryLevel ?? null,
        taskId: r.currentTaskId,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        riders: data,
        counts: {
          total: data.length,
          online: data.filter((r) => r.isOnline).length,
          withLocation: data.filter((r) => r.lastKnownLocation).length,
        },
      },
    });
  } catch (error) {
    console.error('[admin/riders/live] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch live riders' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}
