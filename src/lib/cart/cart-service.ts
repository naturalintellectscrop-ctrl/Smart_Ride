import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export interface AddToCartParams {
  menuItemId: string;
  quantity?: number;
  specialNotes?: string;
}

export interface UpdateCartItemParams {
  quantity?: number;
  specialNotes?: string;
}

export interface CartValidationResult {
  isValid: boolean;
  issues: CartValidationIssue[];
}

export interface CartValidationIssue {
  cartItemId: string;
  menuItemId: string;
  issue: 'UNAVAILABLE' | 'PRICE_CHANGED' | 'DELETED' | 'MERCHANT_UNAVAILABLE';
  currentPrice?: number;
  cartPrice?: number;
}

// Price change threshold: >10% difference triggers a validation issue
const PRICE_CHANGE_THRESHOLD = 0.1;

// ============================================
// CART SERVICE
// ============================================

/**
 * Get user's active cart or create one.
 * If user has multiple active carts (shouldn't happen with unique constraint),
 * merge them into one.
 */
export async function getOrCreateCart(userId: string) {
  // Find all carts for this user (active first)
  const carts = await db.cart.findMany({
    where: { userId },
    include: { items: { where: { isActive: true } } },
    orderBy: [{ isActive: 'desc' }, { lastActivityAt: 'desc' }],
  });

  if (carts.length === 0) {
    // Create a new cart
    const cart = await db.cart.create({
      data: { userId },
      include: { items: true },
    });
    return cart;
  }

  // With unique constraint on userId, there should only be one cart
  // But defensively handle multiple carts by merging
  const activeCarts = carts.filter((c) => c.isActive);
  const abandonedCarts = carts.filter((c) => !c.isActive);

  if (activeCarts.length === 0 && abandonedCarts.length > 0) {
    // No active cart, but abandoned cart(s) exist — recover the most recent one
    const cart = abandonedCarts[0];
    const recovered = await db.cart.update({
      where: { id: cart.id },
      data: {
        isActive: true,
        abandonedAt: null,
        lastActivityAt: new Date(),
      },
      include: { items: { where: { isActive: true } } },
    });

    // Delete any other abandoned carts
    if (abandonedCarts.length > 1) {
      const otherCartIds = abandonedCarts.slice(1).map((c) => c.id);
      await db.cartItem.deleteMany({ where: { cartId: { in: otherCartIds } } });
      await db.cart.deleteMany({ where: { id: { in: otherCartIds } } });
    }

    return recovered;
  }

  if (activeCarts.length === 1) {
    // Single active cart — update lastActivityAt
    const cart = await db.cart.update({
      where: { id: activeCarts[0].id },
      data: { lastActivityAt: new Date() },
      include: { items: { where: { isActive: true } } },
    });
    return cart;
  }

  // Multiple active carts — merge into the first one
  const targetCart = activeCarts[0];
  const sourceCarts = activeCarts.slice(1);

  await db.$transaction(async (tx) => {
    for (const sourceCart of sourceCarts) {
      for (const item of sourceCart.items) {
        // Check if same menuItemId already exists in target cart
        const existingItem = targetCart.items.find(
          (i) => i.menuItemId === item.menuItemId
        );

        if (existingItem) {
          // Increment quantity in target
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + item.quantity,
              totalPrice:
                (existingItem.quantity + item.quantity) * existingItem.unitPrice,
            },
          });
        } else {
          // Move item to target cart
          await tx.cartItem.update({
            where: { id: item.id },
            data: { cartId: targetCart.id },
          });
        }
      }

      // Delete source cart items that were moved, then delete source cart
      await tx.cartItem.deleteMany({ where: { cartId: sourceCart.id } });
      await tx.cart.delete({ where: { id: sourceCart.id } });
    }

    // Update target cart activity
    await tx.cart.update({
      where: { id: targetCart.id },
      data: { lastActivityAt: new Date() },
    });
  });

  // Return the merged cart
  const mergedCart = await db.cart.findUnique({
    where: { id: targetCart.id },
    include: { items: { where: { isActive: true } } },
  });

  return mergedCart;
}

/**
 * Add item to cart with full validation.
 * Validates product exists, is available, and enforces same-merchant constraint.
 */
export async function addItemToCart(
  userId: string,
  params: AddToCartParams
) {
  const { menuItemId, quantity = 1, specialNotes } = params;

  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  // Validate MenuItem exists and is available
  const menuItem = await db.menuItem.findUnique({
    where: { id: menuItemId },
    include: { merchant: true },
  });

  if (!menuItem) {
    throw new Error('Menu item not found');
  }

  if (!menuItem.isAvailable) {
    throw new Error('Menu item is currently unavailable');
  }

  if (!menuItem.merchant.isOpen) {
    throw new Error('Merchant is currently closed');
  }

  // Get or create cart
  const cart = await getOrCreateCart(userId);

  // Check same-merchant constraint
  if (cart.merchantId && cart.merchantId !== menuItem.merchantId) {
    throw new Error(
      `Cart contains items from a different merchant. ` +
      `Please clear your cart before adding items from ${menuItem.merchant.name}.`
    );
  }

  const result = await db.$transaction(async (tx) => {
    // Check if item already exists in cart
    const existingItem = await tx.cartItem.findFirst({
      where: {
        cartId: cart.id,
        menuItemId,
        isActive: true,
      },
    });

    if (existingItem) {
      // Increment quantity
      const newQuantity = existingItem.quantity + quantity;
      const updatedItem = await tx.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          totalPrice: newQuantity * existingItem.unitPrice,
          specialNotes: specialNotes ?? existingItem.specialNotes,
        },
      });

      // Update cart activity and merchant if needed
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          lastActivityAt: new Date(),
          ...(cart.merchantId ? {} : { merchantId: menuItem.merchantId }),
        },
      });

      return updatedItem;
    }

    // Create new cart item
    const newCartItem = await tx.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId,
        productName: menuItem.name,
        quantity,
        unitPrice: menuItem.price,
        totalPrice: menuItem.price * quantity,
        specialNotes,
        priceSnapshot: menuItem.price,
        isActive: true,
      },
    });

    // Update cart activity and merchant
    await tx.cart.update({
      where: { id: cart.id },
      data: {
        lastActivityAt: new Date(),
        ...(cart.merchantId ? {} : { merchantId: menuItem.merchantId }),
      },
    });

    return newCartItem;
  });

  // Return updated cart with items
  const updatedCart = await db.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: { where: { isActive: true } },
    },
  });

  return updatedCart;
}

/**
 * Update a cart item's quantity and/or notes.
 */
export async function updateCartItem(
  userId: string,
  cartItemId: string,
  params: UpdateCartItemParams
) {
  // Verify the cart item belongs to this user
  const cartItem = await db.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  });

  if (!cartItem || cartItem.cart.userId !== userId) {
    throw new Error('Cart item not found');
  }

  if (!cartItem.isActive) {
    throw new Error('Cart item is no longer active');
  }

  const { quantity, specialNotes } = params;

  if (quantity !== undefined && quantity < 1) {
    // If quantity is 0 or less, remove the item instead
    return removeCartItem(userId, cartItemId);
  }

  const result = await db.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};

    if (quantity !== undefined) {
      updateData.quantity = quantity;
      updateData.totalPrice = quantity * cartItem.unitPrice;
    }

    if (specialNotes !== undefined) {
      updateData.specialNotes = specialNotes;
    }

    const updatedItem = await tx.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
    });

    // Update cart lastActivityAt
    await tx.cart.update({
      where: { id: cartItem.cartId },
      data: { lastActivityAt: new Date() },
    });

    return updatedItem;
  });

  // Return updated cart with items
  const updatedCart = await db.cart.findUnique({
    where: { id: cartItem.cartId },
    include: { items: { where: { isActive: true } } },
  });

  return updatedCart;
}

/**
 * Remove an item from the cart.
 */
export async function removeCartItem(userId: string, cartItemId: string) {
  // Verify the cart item belongs to this user
  const cartItem = await db.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: { include: { items: { where: { isActive: true } } } } },
  });

  if (!cartItem || cartItem.cart.userId !== userId) {
    throw new Error('Cart item not found');
  }

  await db.$transaction(async (tx) => {
    // Soft-delete the item
    await tx.cartItem.update({
      where: { id: cartItemId },
      data: { isActive: false },
    });

    // Check if this was the last active item in the cart
    const remainingActiveItems = cartItem.cart.items.filter(
      (i) => i.id !== cartItemId && i.isActive
    );

    // If no items left, clear the merchantId
    if (remainingActiveItems.length === 0) {
      await tx.cart.update({
        where: { id: cartItem.cartId },
        data: {
          merchantId: null,
          lastActivityAt: new Date(),
        },
      });
    } else {
      await tx.cart.update({
        where: { id: cartItem.cartId },
        data: { lastActivityAt: new Date() },
      });
    }
  });

  // Return updated cart with items
  const updatedCart = await db.cart.findUnique({
    where: { id: cartItem.cartId },
    include: { items: { where: { isActive: true } } },
  });

  return updatedCart;
}

/**
 * Clear all items from the cart.
 */
export async function clearCart(userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    return null;
  }

  await db.$transaction(async (tx) => {
    // Soft-delete all active items
    await tx.cartItem.updateMany({
      where: { cartId: cart.id, isActive: true },
      data: { isActive: false },
    });

    // Clear merchant and update activity
    await tx.cart.update({
      where: { id: cart.id },
      data: {
        merchantId: null,
        lastActivityAt: new Date(),
      },
    });
  });

  // Return cleared cart
  const updatedCart = await db.cart.findUnique({
    where: { id: cart.id },
    include: { items: { where: { isActive: true } } },
  });

  return updatedCart;
}

/**
 * Get cart with all items including MenuItem details.
 */
export async function getCartWithItems(userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: { items: { where: { isActive: true } } },
  });

  if (!cart) {
    return null;
  }

  // Fetch menu item details for each cart item
  const menuItems = await db.menuItem.findMany({
    where: {
      id: { in: cart.items.map((i) => i.menuItemId) },
    },
    include: { merchant: true },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // Enrich cart items with menu item details
  const enrichedItems = cart.items.map((item) => ({
    ...item,
    menuItem: menuItemMap.get(item.menuItemId) || null,
  }));

  return {
    ...cart,
    items: enrichedItems,
  };
}

/**
 * Validate all items in the cart.
 * Checks availability, price changes, and merchant status.
 */
export async function validateCart(userId: string): Promise<CartValidationResult> {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: { items: { where: { isActive: true } } },
  });

  if (!cart) {
    return { isValid: true, issues: [] };
  }

  const issues: CartValidationIssue[] = [];

  // Fetch all menu items referenced in the cart
  const menuItemIds = cart.items.map((i) => i.menuItemId);
  const menuItems = await db.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: { merchant: true },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // Check each cart item
  for (const item of cart.items) {
    const menuItem = menuItemMap.get(item.menuItemId);

    if (!menuItem) {
      issues.push({
        cartItemId: item.id,
        menuItemId: item.menuItemId,
        issue: 'DELETED',
        cartPrice: item.priceSnapshot,
      });
      continue;
    }

    if (!menuItem.isAvailable) {
      issues.push({
        cartItemId: item.id,
        menuItemId: item.menuItemId,
        issue: 'UNAVAILABLE',
        currentPrice: menuItem.price,
        cartPrice: item.priceSnapshot,
      });
      continue;
    }

    if (!menuItem.merchant.isOpen) {
      issues.push({
        cartItemId: item.id,
        menuItemId: item.menuItemId,
        issue: 'MERCHANT_UNAVAILABLE',
        currentPrice: menuItem.price,
        cartPrice: item.priceSnapshot,
      });
      continue;
    }

    // Check for significant price changes
    if (menuItem.price !== item.priceSnapshot) {
      const priceDiff = Math.abs(menuItem.price - item.priceSnapshot);
      const priceDiffPercent = priceDiff / item.priceSnapshot;

      if (priceDiffPercent > PRICE_CHANGE_THRESHOLD) {
        issues.push({
          cartItemId: item.id,
          menuItemId: item.menuItemId,
          issue: 'PRICE_CHANGED',
          currentPrice: menuItem.price,
          cartPrice: item.priceSnapshot,
        });
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Mark a user's cart as abandoned.
 */
export async function markCartAbandoned(userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    throw new Error('Cart not found');
  }

  if (!cart.isActive) {
    return cart; // Already abandoned
  }

  const updated = await db.cart.update({
    where: { id: cart.id },
    data: {
      isActive: false,
      abandonedAt: new Date(),
      lastActivityAt: new Date(),
    },
    include: { items: { where: { isActive: true } } },
  });

  return updated;
}

/**
 * Recover an abandoned cart for the user.
 */
export async function recoverCart(userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    throw new Error('Cart not found');
  }

  if (cart.isActive) {
    return cart; // Already active
  }

  const updated = await db.cart.update({
    where: { id: cart.id },
    data: {
      isActive: true,
      abandonedAt: null,
      lastActivityAt: new Date(),
    },
    include: { items: { where: { isActive: true } } },
  });

  return updated;
}

/**
 * Get all abandoned carts with filters.
 */
export async function getAbandonedCarts(options: {
  olderThanDays?: number;
  limit?: number;
  offset?: number;
}) {
  const { olderThanDays = 7, limit = 20, offset = 0 } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const where = {
    isActive: false,
    abandonedAt: { not: null, lte: cutoffDate },
  };

  const [carts, total] = await Promise.all([
    db.cart.findMany({
      where,
      include: {
        items: { where: { isActive: true } },
      },
      orderBy: { abandonedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.cart.count({ where }),
  ]);

  return { carts, total };
}

/**
 * Merge two carts. Moves all items from source into target.
 */
export async function mergeCarts(
  userId: string,
  sourceCartId: string,
  targetCartId: string
) {
  // Validate both carts belong to the user
  const [sourceCart, targetCart] = await Promise.all([
    db.cart.findUnique({
      where: { id: sourceCartId },
      include: { items: { where: { isActive: true } } },
    }),
    db.cart.findUnique({
      where: { id: targetCartId },
      include: { items: { where: { isActive: true } } },
    }),
  ]);

  if (!sourceCart || sourceCart.userId !== userId) {
    throw new Error('Source cart not found or does not belong to user');
  }

  if (!targetCart || targetCart.userId !== userId) {
    throw new Error('Target cart not found or does not belong to user');
  }

  if (sourceCartId === targetCartId) {
    throw new Error('Cannot merge a cart into itself');
  }

  // Check merchant constraint: if target has items, source must be same merchant
  if (
    targetCart.merchantId &&
    sourceCart.merchantId &&
    targetCart.merchantId !== sourceCart.merchantId
  ) {
    throw new Error(
      'Cannot merge carts from different merchants. Clear one cart first.'
    );
  }

  await db.$transaction(async (tx) => {
    for (const item of sourceCart.items) {
      // Check if same menuItemId already exists in target cart
      const existingItem = targetCart.items.find(
        (i) => i.menuItemId === item.menuItemId
      );

      if (existingItem) {
        // Increment quantity in target
        const newQuantity = existingItem.quantity + item.quantity;
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            totalPrice: newQuantity * existingItem.unitPrice,
          },
        });
        // Remove the source item
        await tx.cartItem.delete({ where: { id: item.id } });
      } else {
        // Move item to target cart
        await tx.cartItem.update({
          where: { id: item.id },
          data: { cartId: targetCartId },
        });
      }
    }

    // Update target cart merchant and activity
    await tx.cart.update({
      where: { id: targetCartId },
      data: {
        merchantId: targetCart.merchantId || sourceCart.merchantId,
        lastActivityAt: new Date(),
        isActive: true,
      },
    });

    // Delete the source cart
    await tx.cartItem.deleteMany({ where: { cartId: sourceCartId } });
    await tx.cart.delete({ where: { id: sourceCartId } });
  });

  // Return merged cart
  const mergedCart = await db.cart.findUnique({
    where: { id: targetCartId },
    include: { items: { where: { isActive: true } } },
  });

  return mergedCart;
}

/**
 * Mark old carts as abandoned.
 * Called periodically to mark carts inactive for > 24 hours with no activity.
 */
export async function markOldCartsAbandoned() {
  const inactivityThreshold = new Date();
  inactivityThreshold.setHours(inactivityThreshold.getHours() - 24);

  // Find active carts with no activity for > 24 hours
  const staleCarts = await db.cart.findMany({
    where: {
      isActive: true,
      lastActivityAt: { lte: inactivityThreshold },
    },
    include: { items: { where: { isActive: true } } },
  });

  if (staleCarts.length === 0) {
    return { count: 0, carts: [] };
  }

  // Mark all as abandoned in a transaction
  const cartIds = staleCarts.map((c) => c.id);

  await db.$transaction(async (tx) => {
    await tx.cart.updateMany({
      where: { id: { in: cartIds } },
      data: {
        isActive: false,
        abandonedAt: new Date(),
      },
    });
  });

  return {
    count: staleCarts.length,
    carts: staleCarts.map((c) => ({
      id: c.id,
      userId: c.userId,
      merchantId: c.merchantId,
      itemCount: c.items.length,
      lastActivityAt: c.lastActivityAt,
    })),
  };
}

// ============================================
// CART SERVICE OBJECT (for convenient import)
// ============================================

export const cartService = {
  getOrCreateCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getCartWithItems,
  validateCart,
  markCartAbandoned,
  recoverCart,
  getAbandonedCarts,
  mergeCarts,
  markOldCartsAbandoned,
};
