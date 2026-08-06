/**
 * Client-facing promotions.
 *
 *   GET  /api/marketplace/promotions            — promotions available to me
 *   POST /api/marketplace/promotions/validate   — validate a promo code
 *
 * ROLE BOUNDARY: clients see offers and their own usage. Nothing here reveals
 * promo-abuse detection state (PromoAbuseRecord, risk scores) — a user probing
 * codes must not be able to learn what tripped the detector.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';
import { getAvailablePromotions, validatePromoCode } from '@/lib/marketplace/client-promotion-service';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as JWTPayload;

  try {
    const promotions = await getAvailablePromotions(user.userId);
    return NextResponse.json({ success: true, data: promotions });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotions' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

const validateSchema = z.object({
  promoCode: z.string().min(1, 'Promo code is required'),
  orderAmount: z.number().positive('Order amount must be greater than 0'),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as JWTPayload;

  try {
    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const result = await validatePromoCode(
      parsed.data.promoCode,
      user.userId,
      parsed.data.orderAmount
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate promo code' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
