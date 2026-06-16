import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  serverErrorResponse,
  paginatedResponse,
  getPaginationParams 
} from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { generateCSV, csvResponse } from '@/lib/export';
import { requireAdmin } from '@/lib/auth/guards';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';

/**
 * GET /api/payments
 * List all payments with pagination and filtering
 * ?action=export — Download as CSV
 * SECURITY: Admin-only access required
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateResult = checkRateLimit(request, RATE_LIMITS.payment.initiate);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.payment.initiate);
  }

  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const admin = authResult.user!;

  await setRLSContext(admin);
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (userId) where.userId = userId;

    // CSV Export
    if (action === 'export') {
      const payments = await db.payment.findMany({
        where,
        take: 10000,
        orderBy: { createdAt: 'desc' },
        include: {
          task: {
            select: {
              taskNumber: true,
              taskType: true,
              client: { select: { name: true } },
            },
          },
        },
      });

      const headers = ['Reference', 'Amount', 'Currency', 'Method', 'Status', 'Task Number', 'Task Type', 'Client', 'Date'];
      const rows = payments.map(p => [
        p.paymentReference || p.id.substring(0, 8),
        String(p.amount),
        p.currency || 'UGX',
        p.paymentMethod,
        p.status,
        p.task?.taskNumber || '',
        p.task?.taskType || '',
        p.task?.client?.name || '',
        new Date(p.createdAt).toLocaleString(),
      ]);

      const csv = generateCSV(headers, rows);
      const date = new Date().toISOString().split('T')[0];
      return csvResponse(csv, `payments-export-${date}.csv`);
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          task: {
            select: {
              taskNumber: true,
              taskType: true,
              client: { select: { name: true } },
            },
          },
        },
      }),
      db.payment.count({ where }),
    ]);

    return paginatedResponse(payments, page, limit, total);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return serverErrorResponse('Failed to fetch payments');
  } finally {
    await resetRLSContext();
  }
}
