// ============================================
// POST /api/orders/quote
// ============================================
// Returns the authoritative price for a cart before it is placed, so the
// customer sees exactly what POST /api/orders will charge. Both routes call
// `quoteOrder`, so the displayed total and the charged total cannot disagree.
//
// This exists because the mobile cart previously invented its own
// `deliveryFee = 3000` / `serviceFee = 500` and posted them for the server to
// store verbatim.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/guards';
import { resetRLSContext } from '@/lib/auth-utils';
import { quoteOrder } from '@/lib/api/order-pricing';
import { z } from 'zod';

const quoteSchema = z.object({
  merchantId: z.string(),
  orderType: z.enum(['FOOD_DELIVERY', 'SHOPPING']),
  items: z.array(z.object({
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
  })).min(1),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  /** Only used when coordinates are unavailable. */
  distanceKm: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode },
      );
    }

    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid quote request');
    }
    const data = parsed.data;

    const merchant = await db.merchant.findUnique({
      where: { id: data.merchantId },
      select: { id: true, status: true, latitude: true, longitude: true },
    });
    if (!merchant) return notFoundResponse('Merchant');
    if (merchant.status !== 'APPROVED') return errorResponse('Merchant is not active');

    const quote = await quoteOrder({
      orderType: data.orderType,
      items: data.items,
      merchant: { latitude: merchant.latitude, longitude: merchant.longitude },
      delivery: { latitude: data.deliveryLatitude, longitude: data.deliveryLongitude },
      distanceKm: data.distanceKm,
    });

    return successResponse(quote);
  } catch (error) {
    console.error('[orders/quote] failed:', error);
    return serverErrorResponse();
  } finally {
    await resetRLSContext();
  }
}
