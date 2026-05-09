import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const actorType = searchParams.get('actorType');
    const entityType = searchParams.get('entityType');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    switch (action) {
      case 'list':
        return await getAuditLogs(actorType, entityType, search, startDate, endDate, skip, limit, page);
      
      case 'stats':
        return await getAuditStats(startDate, endDate);
      
      case 'pharmacy':
        return await getPharmacyAuditLogs(skip, limit);
      
      case 'export':
        return await exportAuditLogs(actorType, entityType, startDate, endDate);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// Get audit logs with filtering and pagination
async function getAuditLogs(
  actorType: string | null,
  entityType: string | null,
  search: string | null,
  startDate: string | null,
  endDate: string | null,
  skip: number,
  limit: number,
  page: number
) {
  // Build where clause
  const where: {
    actorType?: string;
    entityType?: string;
    OR?: Array<{ action: { contains: string } } | { description: { contains: string } }>;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (actorType && actorType !== 'all') {
    where.actorType = actorType;
  }

  if (entityType && entityType !== 'all') {
    where.entityType = entityType;
  }

  if (search) {
    where.OR = [
      { action: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Fetch logs with pagination
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: { name: true, email: true },
        },
        rider: {
          select: { fullName: true },
        },
        merchant: {
          select: { name: true },
        },
        order: {
          select: { orderNumber: true },
        },
        task: {
          select: { taskNumber: true },
        },
        healthOrder: {
          select: { orderNumber: true },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  // Format logs for response
  const formattedLogs = logs.map(log => ({
    id: log.id,
    action: log.action,
    actorType: log.actorType,
    actor: getActorName(log),
    entityType: log.entityType,
    entityId: log.entityId,
    description: log.description,
    timestamp: log.createdAt.toISOString(),
    orderId: log.orderId,
    taskId: log.taskId,
    healthOrderId: log.healthOrderId,
    oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
    newValues: log.newValues ? JSON.parse(log.newValues) : null,
    ipAddress: log.ipAddress,
  }));

  return NextResponse.json({
    logs: formattedLogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// Get audit statistics
async function getAuditStats(startDate?: string | null, endDate?: string | null) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get counts by actor type
  const actorTypeCounts = await db.auditLog.groupBy({
    by: ['actorType'],
    where: {
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    _count: { id: true },
  });

  // Get total today
  const todayCount = await db.auditLog.count({
    where: {
      createdAt: { gte: today },
    },
  });

  // Get action type counts
  const actionCounts = await db.auditLog.groupBy({
    by: ['action'],
    where: {
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  // Get entity type counts
  const entityTypeCounts = await db.auditLog.groupBy({
    by: ['entityType'],
    where: {
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    _count: { id: true },
  });

  return NextResponse.json({
    todayCount,
    actorTypes: actorTypeCounts.map(at => ({
      type: at.actorType,
      count: at._count.id,
    })),
    topActions: actionCounts.map(a => ({
      action: a.action,
      count: a._count.id,
    })),
    entityTypes: entityTypeCounts.map(et => ({
      type: et.entityType,
      count: et._count.id,
    })),
  });
}

// Get pharmacy-specific audit logs
async function getPharmacyAuditLogs(skip: number, limit: number) {
  const pharmacyEntityTypes = [
    'HealthProvider',
    'Pharmacy',
    'HealthOrder',
    'Prescription',
    'MedicineCatalog',
  ];

  const pharmacyActions = [
    'PHARMACY_REGISTERED',
    'PHARMACY_APPROVED',
    'PHARMACY_REJECTED',
    'PHARMACY_SUSPENDED',
    'PHARMACY_OPENED',
    'PHARMACY_CLOSED',
    'HEALTH_PROVIDER_REGISTERED',
    'HEALTH_PROVIDER_APPROVED',
    'HEALTH_PROVIDER_REJECTED',
    'HEALTH_PROVIDER_SUSPENDED',
    'PRESCRIPTION_UPLOADED',
    'PRESCRIPTION_VIEWED',
    'PRESCRIPTION_VERIFIED',
    'PRESCRIPTION_REJECTED',
    'PRESCRIPTION_EXPIRED',
    'PRESCRIPTION_DISPUTE_OPENED',
    'PRESCRIPTION_DISPUTE_RESOLVED',
    'HEALTH_ORDER_PLACED',
    'HEALTH_ORDER_REVIEWED',
    'HEALTH_ORDER_PREPARING',
    'HEALTH_ORDER_READY',
    'HEALTH_ORDER_PICKED_UP',
    'HEALTH_ORDER_DELIVERED',
    'HEALTH_ORDER_CANCELLED',
  ];

  const logs = await db.auditLog.findMany({
    where: {
      OR: [
        { entityType: { in: pharmacyEntityTypes } },
        { action: { in: pharmacyActions } },
        { actorType: 'PHARMACIST' },
        { actorType: 'HEALTH_PROVIDER' },
      ],
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      healthOrder: {
        select: { orderNumber: true },
      },
    },
  });

  return NextResponse.json({
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      actorType: log.actorType,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      timestamp: log.createdAt.toISOString(),
    })),
    total: logs.length,
  });
}

// Export audit logs
async function exportAuditLogs(
  actorType: string | null,
  entityType: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  const where: {
    actorType?: string;
    entityType?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (actorType && actorType !== 'all') {
    where.actorType = actorType;
  }

  if (entityType && entityType !== 'all') {
    where.entityType = entityType;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10000, // Max export limit
  });

  // Format as CSV
  const headers = ['Timestamp', 'Action', 'Actor Type', 'Actor', 'Entity Type', 'Entity ID', 'Description'];
  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    log.action,
    log.actorType,
    log.actorId || 'System',
    log.entityType,
    log.entityId,
    log.description?.replace(/,/g, ';') || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

// Helper function to get actor name
function getActorName(log: {
  actorType: string;
  actorId: string | null;
  user: { name: string; email: string } | null;
  rider: { fullName: string } | null;
  merchant: { name: string } | null;
}): string {
  if (log.actorType === 'SYSTEM') return 'System';
  if (log.user) return log.user.name || log.user.email;
  if (log.rider) return log.rider.fullName;
  if (log.merchant) return log.merchant.name;
  return log.actorId || 'Unknown';
}
