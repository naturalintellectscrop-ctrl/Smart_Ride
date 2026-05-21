import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle, ShadingType } from 'docx';

// GET - Fetch audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const actorType = searchParams.get('actorType');
    const entityType = searchParams.get('entityType');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    switch (action) {
      case 'list':
        return await getAuditLogs(actorType, entityType, source, search, startDate, endDate, skip, limit, page);

      case 'stats':
        return await getAuditStats(startDate, endDate);

      case 'pharmacy':
        return await getPharmacyAuditLogs(skip, limit);

      case 'export':
        return await exportAuditLogsCSV(actorType, entityType, source, startDate, endDate);

      case 'export-docx':
        return await exportAuditLogsDocx(actorType, entityType, source, startDate, endDate, search);

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

// POST - Log mobile app activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, entityType, entityId, actorType, actorId, description, oldValues, newValues, userId, riderId, merchantId, orderId, taskId } = body;

    if (!action || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, entityType, entityId' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const auditLog = await db.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        actorType: actorType || 'USER',
        actorId: actorId || null,
        userId: userId || null,
        riderId: riderId || null,
        merchantId: merchantId || null,
        orderId: orderId || null,
        taskId: taskId || null,
        description: description || null,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
        source: 'MOBILE_APP',
      },
    });

    return NextResponse.json({ success: true, log: auditLog }, { status: 201 });
  } catch (error) {
    console.error('Audit log creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

// Build where clause helper
function buildWhereClause(
  actorType: string | null,
  entityType: string | null,
  source: string | null,
  search: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const where: {
    actorType?: string;
    entityType?: string;
    source?: string;
    OR?: Array<{ action: { contains: string } } | { description: { contains: string } }>;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (actorType && actorType !== 'all') {
    where.actorType = actorType;
  }

  if (entityType && entityType !== 'all') {
    where.entityType = entityType;
  }

  if (source && source !== 'all') {
    where.source = source;
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

  return where;
}

// Get audit logs with filtering and pagination
async function getAuditLogs(
  actorType: string | null,
  entityType: string | null,
  source: string | null,
  search: string | null,
  startDate: string | null,
  endDate: string | null,
  skip: number,
  limit: number,
  page: number
) {
  const where = buildWhereClause(actorType, entityType, source, search, startDate, endDate);

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
    source: log.source || 'SYSTEM',
    orderId: log.orderId,
    taskId: log.taskId,
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

  const whereBase = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  // Get counts by actor type
  const actorTypeCounts = await db.auditLog.groupBy({
    by: ['actorType'],
    where: whereBase,
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
    where: whereBase,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  // Get entity type counts
  const entityTypeCounts = await db.auditLog.groupBy({
    by: ['entityType'],
    where: whereBase,
    _count: { id: true },
  });

  // Get source counts
  const sourceCounts = await db.auditLog.groupBy({
    by: ['source'],
    where: whereBase,
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
    sources: sourceCounts.map(s => ({
      source: s.source || 'SYSTEM',
      count: s._count.id,
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
      source: log.source || 'SYSTEM',
    })),
    total: logs.length,
  });
}

// Export audit logs as CSV
async function exportAuditLogsCSV(
  actorType: string | null,
  entityType: string | null,
  source: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  const where = buildWhereClause(actorType, entityType, source, null, startDate, endDate);

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10000,
    include: {
      user: { select: { name: true, email: true } },
      rider: { select: { fullName: true } },
      merchant: { select: { name: true } },
    },
  });

  const headers = ['Timestamp', 'Action', 'Actor Type', 'Actor', 'Entity Type', 'Entity ID', 'Description', 'Source', 'IP Address'];
  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    log.action,
    log.actorType,
    getActorName(log),
    log.entityType,
    log.entityId,
    log.description?.replace(/,/g, ';') || '',
    log.source || 'SYSTEM',
    log.ipAddress || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

// Export audit logs as DOCX
async function exportAuditLogsDocx(
  actorType: string | null,
  entityType: string | null,
  source: string | null,
  startDate?: string | null,
  endDate?: string | null,
  search?: string | null
) {
  const where = buildWhereClause(actorType, entityType, source, search, startDate, endDate);

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10000,
    include: {
      user: { select: { name: true, email: true } },
      rider: { select: { fullName: true } },
      merchant: { select: { name: true } },
    },
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Filter description
  const filterParts: string[] = [];
  if (actorType && actorType !== 'all') filterParts.push(`Actor: ${actorType}`);
  if (entityType && entityType !== 'all') filterParts.push(`Entity: ${entityType}`);
  if (source && source !== 'all') filterParts.push(`Source: ${source === 'ADMIN_DASHBOARD' ? 'Admin Dashboard' : source === 'MOBILE_APP' ? 'Mobile App' : source}`);
  if (startDate) filterParts.push(`From: ${new Date(startDate).toLocaleDateString()}`);
  if (endDate) filterParts.push(`To: ${new Date(endDate).toLocaleDateString()}`);
  const filterDesc = filterParts.length > 0 ? filterParts.join(' | ') : 'No filters applied';

  // Stats
  const adminCount = logs.filter(l => l.source === 'ADMIN_DASHBOARD').length;
  const mobileCount = logs.filter(l => l.source === 'MOBILE_APP').length;
  const systemCount = logs.filter(l => !l.source || l.source === 'SYSTEM').length;
  const apiCount = logs.filter(l => l.source === 'API').length;

  const headerColor = '00FF88';
  const darkBg = '0D0D12';
  const sectionBg = '1A1A24';

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 20,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'SMART RIDE',
                bold: true,
                size: 48,
                color: headerColor,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Audit Log Report',
                bold: true,
                size: 36,
                color: 'FFFFFF',
                font: 'Calibri',
              }),
            ],
          }),

          // Metadata
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Generated: ', bold: true, size: 20, color: '999999' }),
              new TextRun({ text: dateStr, size: 20, color: 'FFFFFF' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Total Records: ', bold: true, size: 20, color: '999999' }),
              new TextRun({ text: `${logs.length}`, size: 20, color: 'FFFFFF' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Filters: ', bold: true, size: 20, color: '999999' }),
              new TextRun({ text: filterDesc, size: 20, color: 'FFFFFF' }),
            ],
          }),

          // Source breakdown
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'SOURCE BREAKDOWN',
                bold: true,
                size: 24,
                color: headerColor,
              }),
            ],
          }),
          ...[
            { label: 'Admin Dashboard', count: adminCount },
            { label: 'Mobile App', count: mobileCount },
            { label: 'API', count: apiCount },
            { label: 'System', count: systemCount },
          ].map(item => new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `  ${item.label}: `, bold: true, size: 20, color: 'CCCCCC' }),
              new TextRun({ text: `${item.count} entries`, size: 20, color: 'FFFFFF' }),
            ],
          })),

          // Divider
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: '─'.repeat(80),
                color: '333333',
                size: 16,
              }),
            ],
          }),

          // Section header
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'DETAILED LOG ENTRIES',
                bold: true,
                size: 24,
                color: headerColor,
              }),
            ],
          }),

          // Log entries table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Header row
              new TableRow({
                tableHeader: true,
                children: [
                  createHeaderCell('Timestamp', 1500),
                  createHeaderCell('Action', 1800),
                  createHeaderCell('Actor', 1500),
                  createHeaderCell('Source', 1200),
                  createHeaderCell('Entity', 1200),
                  createHeaderCell('Description', 2800),
                ],
              }),
              // Data rows
              ...logs.map(log =>
                new TableRow({
                  children: [
                    createDataCell(log.createdAt.toLocaleString(), 1500),
                    createDataCell(log.action, 1800),
                    createDataCell(getActorName(log), 1500),
                    createDataCell(
                      log.source === 'ADMIN_DASHBOARD' ? 'Admin' :
                      log.source === 'MOBILE_APP' ? 'Mobile' :
                      log.source === 'API' ? 'API' : 'System',
                      1200
                    ),
                    createDataCell(log.entityType, 1200),
                    createDataCell(log.description || '-', 2800),
                  ],
                })
              ),
            ],
          }),

          // Footer
          new Paragraph({
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `End of Report — Smart Ride Audit System — Generated on ${dateStr}`,
                size: 16,
                color: '666666',
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="smart-ride-audit-report-${new Date().toISOString().split('T')[0]}.docx"`,
    },
  });
}

// Helper to create header cells for the DOCX table
function createHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: {
      type: ShadingType.SOLID,
      color: '1A1A24',
      fill: '1A1A24',
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            size: 16,
            color: '00FF88',
            font: 'Calibri',
          }),
        ],
      }),
    ],
  });
}

// Helper to create data cells for the DOCX table
function createDataCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text.substring(0, 200), // Limit text length
            size: 14,
            color: 'CCCCCC',
            font: 'Calibri',
          }),
        ],
      }),
    ],
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
