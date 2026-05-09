import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  serverErrorResponse,
  paginatedResponse,
  getPaginationParams 
} from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

/**
 * GET /api/payments
 * List all payments with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (userId) where.userId = userId;

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
  }
}
