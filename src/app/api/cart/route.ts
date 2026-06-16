import { NextRequest, NextResponse } from 'next/server';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api/response';
import {
  getCartWithItems,
  addItemToCart,
  type AddToCartParams,
} from '@/lib/cart/cart-service';
import { requireAuth } from '@/lib/auth/guards';

// ============================================
// GET /api/cart — Get user's cart with items
// SECURITY: Requires authentication - userId derived from token
// ============================================
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const user = authResult.user!;

  try {
    const cart = await getCartWithItems(user.userId);

    if (!cart) {
      return successResponse({ cart: null, items: [] }, 'No cart found');
    }

    return successResponse(cart);
  } catch (err) {
    console.error('[Cart API] GET error:', err);
    return serverErrorResponse(
      err instanceof Error ? err.message : 'Failed to get cart'
    );
  }
}

// ============================================
// POST /api/cart — Add item to cart
// SECURITY: Requires authentication - userId derived from token
// ============================================
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const user = authResult.user!;

  try {
    const body = await request.json();
    const { menuItemId, quantity, specialNotes } = body;

    // Validate required fields
    if (!menuItemId) {
      return errorResponse('menuItemId is required', 400);
    }

    if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 1)) {
      return errorResponse('quantity must be a positive number', 400);
    }

    const params: AddToCartParams = {
      menuItemId,
      quantity: quantity || 1,
      specialNotes,
    };

    const cart = await addItemToCart(user.userId, params);

    return successResponse(cart, 'Item added to cart');
  } catch (err) {
    console.error('[Cart API] POST error:', err);

    if (err instanceof Error) {
      // Map known business logic errors to appropriate HTTP status
      const message = err.message;

      if (
        message.includes('not found') ||
        message.includes('unavailable') ||
        message.includes('closed')
      ) {
        return errorResponse(message, 404);
      }

      if (message.includes('different merchant')) {
        return errorResponse(message, 409);
      }

      return errorResponse(message, 400);
    }

    return serverErrorResponse('Failed to add item to cart');
  }
}
