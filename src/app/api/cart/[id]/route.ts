import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/response';
import {
  getCartWithItems,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateCart,
} from '@/lib/cart/cart-service';
import { db } from '@/lib/db';

// ============================================
// GET /api/cart/[id] — Get specific cart with items
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cart = await db.cart.findUnique({
      where: { id },
      include: { items: { where: { isActive: true } } },
    });

    if (!cart) {
      return notFoundResponse('Cart');
    }

    // Fetch menu item details for each cart item
    if (cart.items.length > 0) {
      const menuItems = await db.menuItem.findMany({
        where: {
          id: { in: cart.items.map((i) => i.menuItemId) },
        },
        include: { merchant: true },
      });

      const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

      const enrichedItems = cart.items.map((item) => ({
        ...item,
        menuItem: menuItemMap.get(item.menuItemId) || null,
      }));

      return successResponse({ ...cart, items: enrichedItems });
    }

    return successResponse(cart);
  } catch (err) {
    console.error('[Cart API] GET /[id] error:', err);
    return serverErrorResponse(
      err instanceof Error ? err.message : 'Failed to get cart'
    );
  }
}

// ============================================
// PATCH /api/cart/[id] — Update cart item, clear, or validate
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartId } = await params;
    const body = await request.json();
    const { action, cartItemId, quantity, specialNotes, userId } = body;

    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    // Verify the cart belongs to the user
    const cart = await db.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      return notFoundResponse('Cart');
    }

    if (cart.userId !== userId) {
      return errorResponse('Cart does not belong to this user', 403);
    }

    switch (action) {
      case 'update_item': {
        if (!cartItemId) {
          return errorResponse('cartItemId is required for update_item action', 400);
        }

        const updatedCart = await updateCartItem(userId, cartItemId, {
          quantity,
          specialNotes,
        });

        return successResponse(updatedCart, 'Cart item updated');
      }

      case 'remove_item': {
        if (!cartItemId) {
          return errorResponse('cartItemId is required for remove_item action', 400);
        }

        const updatedCart = await removeCartItem(userId, cartItemId);

        return successResponse(updatedCart, 'Cart item removed');
      }

      case 'clear': {
        const updatedCart = await clearCart(userId);

        return successResponse(updatedCart, 'Cart cleared');
      }

      case 'validate': {
        const validationResult = await validateCart(userId);

        return successResponse(validationResult, 'Cart validated');
      }

      default:
        return errorResponse(
          'Invalid action. Must be one of: update_item, remove_item, clear, validate',
          400
        );
    }
  } catch (err) {
    console.error('[Cart API] PATCH /[id] error:', err);

    if (err instanceof Error) {
      const message = err.message;

      if (message.includes('not found')) {
        return notFoundResponse('Cart item');
      }

      return errorResponse(message, 400);
    }

    return serverErrorResponse('Failed to update cart');
  }
}

// ============================================
// DELETE /api/cart/[id] — Clear/delete the cart
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    // Verify the cart belongs to the user
    const cart = await db.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      return notFoundResponse('Cart');
    }

    if (cart.userId !== userId) {
      return errorResponse('Cart does not belong to this user', 403);
    }

    const updatedCart = await clearCart(userId);

    return successResponse(updatedCart, 'Cart cleared');
  } catch (err) {
    console.error('[Cart API] DELETE /[id] error:', err);
    return serverErrorResponse(
      err instanceof Error ? err.message : 'Failed to delete cart'
    );
  }
}
