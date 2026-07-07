/**
 * Admin SLA Configuration API
 *
 * GET  /api/admin/sla  → all SLAConfig rows (delivery SLA minutes + rider
 *                        acceptance timeouts per service type)
 * PUT  /api/admin/sla  → upsert rows; body:
 *   { rows: [{ serviceType, slaMinutes?, acceptTimeoutSeconds? }] }
 *
 * Rows are keyed (serviceType, state='default'). Saving invalidates the SLA
 * cache so the dispatch engine picks the new values up on its next offer
 * (≤60s) — no redeploy needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { invalidateSlaCache } from '@/lib/api/sla';
import { z } from 'zod';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'];
const SERVICE_TYPES = [
  'SMART_BODA_RIDE',
  'SMART_CAR_RIDE',
  'FOOD_DELIVERY',
  'SHOPPING',
  'ITEM_DELIVERY',
  'SMART_HEALTH_DELIVERY',
] as const;

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { decoded: null, error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }
  const decoded = verifyAccessToken(token);
  if (!decoded || !ADMIN_ROLES.includes(decoded.role)) {
    return { decoded: null, error: NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 }) };
  }
  return { decoded, error: null };
}

export async function GET(request: NextRequest) {
  const { decoded, error } = verifyAdmin(request);
  if (error) return error;

  await setRLSContext(decoded);
  try {
    const rows = await db.sLAConfig.findMany({
      select: { serviceType: true, state: true, slaMinutes: true, acceptTimeoutSeconds: true },
      orderBy: { serviceType: 'asc' },
    });
    return NextResponse.json({ success: true, data: { rows, serviceTypes: SERVICE_TYPES } });
  } catch (e) {
    console.error('[admin/sla] GET error:', e);
    return NextResponse.json({ success: false, error: 'Failed to load SLA config' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

const putSchema = z.object({
  rows: z.array(z.object({
    serviceType: z.enum(SERVICE_TYPES),
    slaMinutes: z.number().int().min(1).max(24 * 60).optional(),
    acceptTimeoutSeconds: z.number().int().min(10).max(300).optional(),
  })).min(1),
});

export async function PUT(request: NextRequest) {
  const { decoded, error } = verifyAdmin(request);
  if (error) return error;

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 },
    );
  }

  await setRLSContext(decoded);
  try {
    for (const row of parsed.data.rows) {
      await db.sLAConfig.upsert({
        where: { serviceType_state: { serviceType: row.serviceType, state: 'default' } },
        update: {
          ...(row.slaMinutes != null ? { slaMinutes: row.slaMinutes } : {}),
          ...(row.acceptTimeoutSeconds != null ? { acceptTimeoutSeconds: row.acceptTimeoutSeconds } : {}),
        },
        create: {
          serviceType: row.serviceType,
          state: 'default',
          slaMinutes: row.slaMinutes ?? 30,
          acceptTimeoutSeconds: row.acceptTimeoutSeconds ?? null,
          description: 'Configured from admin dashboard',
        },
      });
    }

    invalidateSlaCache();

    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        userId: decoded!.userId,
        action: 'SLA_CONFIG_UPDATED',
        entityType: 'SLAConfig',
        entityId: 'default',
        description: `SLA config updated: ${parsed.data.rows.map((r) => `${r.serviceType}(sla=${r.slaMinutes ?? '-'}m, accept=${r.acceptTimeoutSeconds ?? '-'}s)`).join(', ')}`,
      },
    }).catch(() => { /* audit failure must not block config save */ });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[admin/sla] PUT error:', e);
    return NextResponse.json({ success: false, error: 'Failed to save SLA config' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}
