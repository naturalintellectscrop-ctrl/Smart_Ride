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
import { quoteOrder, priceItemsFromCatalogue } from '@/lib/api/order-pricing';
import { z } from 'zod';

const quoteSchema = z.object({
  merchantId: z.string(),
  orderType: z.enum(['FOOD_DELIVERY', 'SHOPPING']),
  items: z.array(z.object({
    // Optional for backward compatibility with carts that predate BE-002.
    // When present the catalogue decides the price, so the quote matches what
    // POST /api/orders will actually charge.
    menuItemId: z.string().optional(),
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

    // Resolve against the catalogue whenever the cart can tell us which items
    // these are. Without this the quote would happily echo a tampered price
    // back and then the create route would 409 — the customer would see a
    // confident total and an unexplained failure at checkout.
    const linked = data.items.filter(i => i.menuItemId).length;
    let itemsForPricing: Array<{ quantity: number; unitPrice: number }> = data.items;
    let priceChanges: unknown[] = [];
    let unavailable: unknown[] = [];

    if (linked === data.items.length) {
      const priced = await priceItemsFromCatalogue(data.merchantId, data.items);
      unavailable = priced.rejected;
      priceChanges = priced.increased;
      itemsForPricing = priced.items.map(i => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));
    }

    if (itemsForPricing.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some items are no longer available',
          code: 'ITEMS_UNAVAILABLE',
          items: unavailable,
        },
        { status: 409 },
      );
    }

    const quote = await quoteOrder({
      orderType: data.orderType,
      items: itemsForPricing,
      merchant: { latitude: merchant.latitude, longitude: merchant.longitude },
      delivery: { latitude: data.deliveryLatitude, longitude: data.deliveryLongitude },
      distanceKm: data.distanceKm,
    });

    return successResponse({
      ...quote,
      // Non-empty means the cart is showing stale prices and should refresh
      // before the customer commits. Reported here rather than only at
      // checkout so the correction happens while they can still react.
      priceChanges,
      unavailable,
      // Tells the client whether these figures were catalogue-verified or are
      // an echo of what it sent.
      pricedFromCatalogue: linked === data.items.length,
    });
  } catch (error) {
    console.error('[orders/quote] failed:', error);
    return serverErrorResponse();
  } finally {
    await resetRLSContext();
  }
}
