import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { redactBusiness } from '@/lib/privacy/public-contact';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/merchants/[id]
 *
 * One merchant's storefront, as a customer browsing sees it.
 *
 * This route did not exist. `src/app/api/merchants/[id]/` held four
 * subdirectories — analytics, availability, menu, products — and no
 * `route.ts`, so a request for the merchant ITSELF fell through to Next's HTML
 * 404 page. The client called it, tried to parse the HTML as JSON, and showed
 * "Merchant not found".
 *
 * The effect was that no customer could open any restaurant, shop or pharmacy:
 * the list rendered, and every card led to a dead end. Found by tapping one on
 * a device; the only evidence in the app was
 * `JSON Parse error: Unexpected character: <`.
 *
 * Shaped like the list route above it — service-role read, business contact
 * redacted, item counts included — because this is the same storefront, singular.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  await setServiceRoleContext();
  try {
    const { id } = await params;

    const merchant = await db.merchant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { menuItems: true, orders: true },
        },
      },
    });

    if (!merchant) {
      return notFoundResponse('Merchant');
    }

    // A merchant that has not been approved is not a storefront yet. Returning
    // one would let a customer build a basket at a shop that cannot be ordered
    // from — order creation refuses anything but APPROVED.
    if (merchant.status !== 'APPROVED') {
      return notFoundResponse('Merchant');
    }

    // PRIVACY: customers browsing never receive phone, email or banking
    // details. Same helper the list uses, for the same reason.
    redactBusiness(merchant as unknown as Record<string, unknown>);

    return successResponse(merchant);
  } catch (error) {
    console.error('Error fetching merchant:', error);
    return serverErrorResponse('Failed to fetch merchant');
  } finally {
    await resetRLSContext();
  }
}
