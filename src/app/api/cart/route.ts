import { NextRequest } from 'next/server';
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

// ============================================
// GET /api/cart — Get user's cart with items
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    const cart = await getCartWithItems(userId);

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
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, menuItemId, quantity, specialNotes } = body;

    // Validate required fields
    if (!userId) {
      return errorResponse('userId is required', 400);
    }

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

    const cart = await addItemToCart(userId, params);

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
