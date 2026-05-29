import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/api/response';
import {
  getAbandonedCarts,
  markOldCartsAbandoned,
} from '@/lib/cart/cart-service';

// ============================================
// GET /api/cart/abandoned — Get abandoned carts (admin-only)
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Admin-only: Check for internal key or admin session
    const internalKey = request.headers.get('x-internal-key');
    const authHeader = request.headers.get('authorization');

    // Simple auth check — real auth middleware will be added later
    if (!internalKey && !authHeader) {
      return unauthorizedResponse('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    if (isNaN(days) || days < 1) {
      return errorResponse('days must be a positive number', 400);
    }

    const result = await getAbandonedCarts({
      olderThanDays: days,
      limit,
      offset,
    });

    const page = Math.floor(offset / limit) + 1;

    return paginatedResponse(result.carts, page, limit, result.total);
  } catch (err) {
    console.error('[Cart API] GET /abandoned error:', err);
    return serverErrorResponse(
      err instanceof Error ? err.message : 'Failed to get abandoned carts'
    );
  }
}

// ============================================
// POST /api/cart/abandoned — Mark old carts as abandoned (cron)
// Marks carts inactive for > 24 hours with no activity.
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Admin/system-only: Check for internal key or admin session
    const internalKey = request.headers.get('x-internal-key');
    const authHeader = request.headers.get('authorization');

    if (!internalKey && !authHeader) {
      return unauthorizedResponse('Admin/system access required');
    }

    const result = await markOldCartsAbandoned();

    return successResponse(
      {
        markedCount: result.count,
        carts: result.carts,
      },
      result.count > 0
        ? `${result.count} cart(s) marked as abandoned`
        : 'No stale carts found'
    );
  } catch (err) {
    console.error('[Cart API] POST /abandoned error:', err);
    return serverErrorResponse(
      err instanceof Error ? err.message : 'Failed to mark carts as abandoned'
    );
  }
}
