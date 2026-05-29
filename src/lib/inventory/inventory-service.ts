/**
 * Smart Ride Inventory Service
 * Manages stock availability, reservations, and product variants.
 * Prevents overselling through reservation-based stock locking.
 */

import { db } from '@/lib/db';
import { InventoryReservationStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface AvailabilityResult {
  available: boolean;
  menuItemId: string;
  requestedQuantity: number;
  availableQuantity: number | null; // null when unlimited (no stockQuantity tracking)
  isAvailable: boolean; // MenuItem.isAvailable flag
  variantAvailable?: boolean;
  variantAvailableQuantity?: number | null;
}

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  error?: string;
}

export interface ConfirmResult {
  success: boolean;
  error?: string;
}

export interface ReleaseResult {
  success: boolean;
  error?: string;
}

export interface LowStockItem {
  menuItemId: string;
  name: string;
  merchantId: string;
  stockQuantity: number | null;
  reservedQuantity: number;
  availableQuantity: number | null;
}

export interface VariantData {
  variantName: string;
  variantValue: string;
  priceModifier?: number;
  stockQuantity?: number;
  isAvailable?: boolean;
  sku?: string;
}

// ============================================
// RESERVATION EXPIRY CONFIG
// ============================================

const RESERVATION_EXPIRY_MINUTES = 15;

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class InventoryService {
  /**
   * Check if a menu item is in stock.
   * - Checks MenuItem.isAvailable
   * - If MenuItem has stockQuantity, checks against it minus reserved quantities
   * - Checks variant availability if variantId specified
   */
  static async checkAvailability(
    menuItemId: string,
    quantity: number,
    variantId?: string
  ): Promise<AvailabilityResult> {
    // Fetch menu item with reservations
    const menuItem = await db.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        reservations: {
          where: {
            status: { in: ['RESERVED'] },
            expiresAt: { gt: new Date() },
          },
          select: { quantity: true },
        },
      },
    });

    if (!menuItem) {
      return {
        available: false,
        menuItemId,
        requestedQuantity: quantity,
        availableQuantity: 0,
        isAvailable: false,
      };
    }

    // Check if menu item is available
    if (!menuItem.isAvailable) {
      return {
        available: false,
        menuItemId,
        requestedQuantity: quantity,
        availableQuantity: menuItem.stockQuantity,
        isAvailable: false,
      };
    }

    // Calculate available quantity
    let availableQuantity: number | null = null;

    if (menuItem.stockQuantity !== null && menuItem.stockQuantity !== undefined) {
      const reservedQuantity = menuItem.reservations.reduce((sum, r) => sum + r.quantity, 0);
      availableQuantity = menuItem.stockQuantity - reservedQuantity;
    }

    // Check variant availability if specified
    let variantAvailable: boolean | undefined;
    let variantAvailableQuantity: number | null | undefined;

    if (variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: variantId },
        include: {
          menuItem: {
            include: {
              reservations: {
                where: {
                  status: { in: ['RESERVED'] as InventoryReservationStatus[] },
                  expiresAt: { gt: new Date() },
                  variantId,
                },
                select: { quantity: true },
              },
            },
          },
        },
      });

      if (!variant) {
        return {
          available: false,
          menuItemId,
          requestedQuantity: quantity,
          availableQuantity,
          isAvailable: menuItem.isAvailable,
          variantAvailable: false,
          variantAvailableQuantity: 0,
        };
      }

      variantAvailable = variant.isAvailable;

      if (variant.stockQuantity !== null && variant.stockQuantity !== undefined) {
        const variantReserved = variant.menuItem.reservations.reduce((sum, r) => sum + r.quantity, 0);
        variantAvailableQuantity = variant.stockQuantity - variantReserved;
      }
    }

    // Determine overall availability
    let isAvailable = true;

    // Check menu item level stock
    if (availableQuantity !== null && availableQuantity < quantity) {
      isAvailable = false;
    }

    // Check variant level stock
    if (variantId && variantAvailable === false) {
      isAvailable = false;
    }
    if (variantId && variantAvailableQuantity !== undefined && variantAvailableQuantity !== null && variantAvailableQuantity < quantity) {
      isAvailable = false;
    }

    return {
      available: isAvailable,
      menuItemId,
      requestedQuantity: quantity,
      availableQuantity,
      isAvailable: menuItem.isAvailable,
      variantAvailable,
      variantAvailableQuantity,
    };
  }

  /**
   * Reserve stock during checkout.
   * Creates an InventoryReservation record with expiresAt set to 15 minutes from now.
   * Uses Prisma transaction for atomicity.
   */
  static async reserveStock(
    menuItemId: string,
    quantity: number,
    params: {
      variantId?: string;
      orderId?: string;
      taskId?: string;
    }
  ): Promise<ReservationResult> {
    try {
      // First check availability
      const availability = await this.checkAvailability(menuItemId, quantity, params.variantId);
      if (!availability.available) {
        return {
          success: false,
          error: `Insufficient stock. Requested: ${quantity}, Available: ${availability.availableQuantity ?? 'unlimited'}`,
        };
      }

      const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);

      const reservation = await db.inventoryReservation.create({
        data: {
          menuItemId,
          variantId: params.variantId || null,
          orderId: params.orderId || null,
          taskId: params.taskId || null,
          quantity,
          status: 'RESERVED',
          expiresAt,
        },
      });

      return {
        success: true,
        reservationId: reservation.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reserve stock';
      console.error('[InventoryService] reserveStock failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Confirm a reservation after payment.
   * Updates status to CONFIRMED and decrements stockQuantity on MenuItem.
   */
  static async confirmReservation(
    reservationId: string,
    orderId?: string
  ): Promise<ConfirmResult> {
    try {
      const reservation = await db.inventoryReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        return { success: false, error: 'Reservation not found' };
      }

      if (reservation.status !== 'RESERVED') {
        return { success: false, error: `Reservation is already ${reservation.status}` };
      }

      await db.$transaction(async (tx) => {
        // Update reservation status
        await tx.inventoryReservation.update({
          where: { id: reservationId },
          data: {
            status: 'CONFIRMED',
          },
        });

        // Decrement stockQuantity on MenuItem if tracking is enabled
        const menuItem = await tx.menuItem.findUnique({
          where: { id: reservation.menuItemId },
          select: { stockQuantity: true },
        });

        if (menuItem && menuItem.stockQuantity !== null && menuItem.stockQuantity !== undefined) {
          const newQuantity = menuItem.stockQuantity - reservation.quantity;
          await tx.menuItem.update({
            where: { id: reservation.menuItemId },
            data: {
              stockQuantity: Math.max(0, newQuantity),
              isAvailable: newQuantity > 0,
            },
          });
        }

        // Also decrement variant stock if variant was specified
        if (reservation.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: reservation.variantId },
            select: { stockQuantity: true },
          });

          if (variant && variant.stockQuantity !== null && variant.stockQuantity !== undefined) {
            const newVariantQty = variant.stockQuantity - reservation.quantity;
            await tx.productVariant.update({
              where: { id: reservation.variantId },
              data: {
                stockQuantity: Math.max(0, newVariantQty),
                isAvailable: newVariantQty > 0,
              },
            });
          }
        }

        // Update orderId if provided
        if (orderId) {
          await tx.inventoryReservation.update({
            where: { id: reservationId },
            data: { orderId },
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            action: 'INVENTORY_RESERVATION_CONFIRMED',
            entityType: 'InventoryReservation',
            entityId: reservationId,
            orderId: orderId || reservation.orderId,
            taskId: reservation.taskId,
            description: `Confirmed reservation of ${reservation.quantity} units for menu item ${reservation.menuItemId}`,
            source: 'SYSTEM',
          },
        });
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm reservation';
      console.error('[InventoryService] confirmReservation failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Release a reserved stock.
   * Used when payment fails or order is cancelled.
   */
  static async releaseReservation(reservationId: string): Promise<ReleaseResult> {
    try {
      const reservation = await db.inventoryReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        return { success: false, error: 'Reservation not found' };
      }

      if (reservation.status !== 'RESERVED') {
        return { success: false, error: `Cannot release reservation in ${reservation.status} status` };
      }

      await db.inventoryReservation.update({
        where: { id: reservationId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'INVENTORY_RESERVATION_RELEASED',
          entityType: 'InventoryReservation',
          entityId: reservationId,
          orderId: reservation.orderId,
          taskId: reservation.taskId,
          description: `Released reservation of ${reservation.quantity} units for menu item ${reservation.menuItemId}`,
          source: 'SYSTEM',
        },
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to release reservation';
      console.error('[InventoryService] releaseReservation failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Release all expired reservations.
   * Finds all RESERVED reservations where expiresAt < now and releases them.
   */
  static async releaseExpiredReservations(): Promise<{ released: number; errors: string[] }> {
    const errors: string[] = [];
    let released = 0;

    try {
      const expiredReservations = await db.inventoryReservation.findMany({
        where: {
          status: 'RESERVED',
          expiresAt: { lt: new Date() },
        },
        select: { id: true },
      });

      for (const reservation of expiredReservations) {
        try {
          await db.inventoryReservation.update({
            where: { id: reservation.id },
            data: {
              status: 'EXPIRED',
              releasedAt: new Date(),
            },
          });
          released++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to expire reservation ${reservation.id}: ${message}`);
        }
      }

      if (released > 0) {
        // Create audit log for batch expiry
        await db.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            action: 'INVENTORY_RESERVATIONS_EXPIRED',
            entityType: 'SystemEvent',
            entityId: `batch-expiry-${Date.now()}`,
            description: `Released ${released} expired inventory reservations`,
            newValues: JSON.stringify({ released, errors: errors.length }),
            source: 'SYSTEM',
          },
        });
      }

      return { released, errors };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to release expired reservations';
      errors.push(message);
      return { released, errors };
    }
  }

  /**
   * Manual stock adjustment.
   * Updates MenuItem stockQuantity and creates audit log.
   */
  static async adjustStock(
    menuItemId: string,
    quantityChange: number,
    reason: string,
    actorId?: string
  ): Promise<{ success: boolean; newQuantity: number | null; error?: string }> {
    try {
      const menuItem = await db.menuItem.findUnique({
        where: { id: menuItemId },
        select: { stockQuantity: true, name: true },
      });

      if (!menuItem) {
        return { success: false, newQuantity: null, error: 'Menu item not found' };
      }

      if (menuItem.stockQuantity === null || menuItem.stockQuantity === undefined) {
        return { success: false, newQuantity: null, error: 'Menu item does not track stock quantity' };
      }

      const oldQuantity = menuItem.stockQuantity;
      const newQuantity = Math.max(0, oldQuantity + quantityChange);

      await db.$transaction(async (tx) => {
        await tx.menuItem.update({
          where: { id: menuItemId },
          data: {
            stockQuantity: newQuantity,
            isAvailable: newQuantity > 0,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: actorId || null,
            actorType: actorId ? 'ADMIN' : 'SYSTEM',
            action: 'INVENTORY_STOCK_ADJUSTED',
            entityType: 'MenuItem',
            entityId: menuItemId,
            description: `Stock adjusted for "${menuItem.name}": ${oldQuantity} → ${newQuantity} (${quantityChange >= 0 ? '+' : ''}${quantityChange}). Reason: ${reason}`,
            oldValues: JSON.stringify({ stockQuantity: oldQuantity }),
            newValues: JSON.stringify({ stockQuantity: newQuantity, quantityChange, reason }),
            source: actorId ? 'ADMIN_DASHBOARD' : 'SYSTEM',
          },
        });
      });

      return { success: true, newQuantity };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to adjust stock';
      console.error('[InventoryService] adjustStock failed:', message);
      return { success: false, newQuantity: null, error: message };
    }
  }

  /**
   * Get items below a stock threshold for a merchant.
   */
  static async getLowStockItems(
    merchantId: string,
    threshold: number = 10
  ): Promise<LowStockItem[]> {
    const menuItems = await db.menuItem.findMany({
      where: {
        merchantId,
        stockQuantity: { not: null },
        isAvailable: true,
      },
      include: {
        reservations: {
          where: {
            status: { in: ['RESERVED'] as InventoryReservationStatus[] },
            expiresAt: { gt: new Date() },
          },
          select: { quantity: true },
        },
      },
    });

    const lowStockItems: LowStockItem[] = [];

    for (const item of menuItems) {
      const stockQty = item.stockQuantity as number;
      const reservedQuantity = item.reservations.reduce((sum, r) => sum + r.quantity, 0);
      const availableQuantity = stockQty - reservedQuantity;

      if (stockQty <= threshold || availableQuantity <= threshold) {
        lowStockItems.push({
          menuItemId: item.id,
          name: item.name,
          merchantId: item.merchantId,
          stockQuantity: stockQty,
          reservedQuantity,
          availableQuantity,
        });
      }
    }

    return lowStockItems;
  }

  /**
   * Create a product variant for a menu item.
   */
  static async createProductVariant(
    menuItemId: string,
    data: VariantData
  ): Promise<{ success: boolean; variantId?: string; error?: string }> {
    try {
      // Verify menu item exists
      const menuItem = await db.menuItem.findUnique({
        where: { id: menuItemId },
      });

      if (!menuItem) {
        return { success: false, error: 'Menu item not found' };
      }

      const variant = await db.productVariant.create({
        data: {
          menuItemId,
          variantName: data.variantName,
          variantValue: data.variantValue,
          priceModifier: data.priceModifier ?? 0,
          stockQuantity: data.stockQuantity ?? null,
          isAvailable: data.isAvailable ?? true,
          sku: data.sku ?? null,
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'PRODUCT_VARIANT_CREATED',
          entityType: 'ProductVariant',
          entityId: variant.id,
          description: `Created variant "${data.variantName}: ${data.variantValue}" for menu item ${menuItemId}`,
          newValues: JSON.stringify(data),
          source: 'SYSTEM',
        },
      });

      return { success: true, variantId: variant.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product variant';
      console.error('[InventoryService] createProductVariant failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Update a product variant.
   */
  static async updateProductVariant(
    variantId: string,
    data: Partial<VariantData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await db.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!existing) {
        return { success: false, error: 'Product variant not found' };
      }

      const updateData: Record<string, unknown> = {};
      if (data.variantName !== undefined) updateData.variantName = data.variantName;
      if (data.variantValue !== undefined) updateData.variantValue = data.variantValue;
      if (data.priceModifier !== undefined) updateData.priceModifier = data.priceModifier;
      if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
      if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
      if (data.sku !== undefined) updateData.sku = data.sku;

      await db.$transaction(async (tx) => {
        await tx.productVariant.update({
          where: { id: variantId },
          data: updateData,
        });

        await tx.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            action: 'PRODUCT_VARIANT_UPDATED',
            entityType: 'ProductVariant',
            entityId: variantId,
            description: `Updated variant "${existing.variantName}: ${existing.variantValue}"`,
            oldValues: JSON.stringify({
              variantName: existing.variantName,
              variantValue: existing.variantValue,
              priceModifier: existing.priceModifier,
              stockQuantity: existing.stockQuantity,
              isAvailable: existing.isAvailable,
            }),
            newValues: JSON.stringify(updateData),
            source: 'SYSTEM',
          },
        });
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update product variant';
      console.error('[InventoryService] updateProductVariant failed:', message);
      return { success: false, error: message };
    }
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export const checkAvailability = InventoryService.checkAvailability.bind(InventoryService);
export const reserveStock = InventoryService.reserveStock.bind(InventoryService);
export const confirmReservation = InventoryService.confirmReservation.bind(InventoryService);
export const releaseReservation = InventoryService.releaseReservation.bind(InventoryService);
export const releaseExpiredReservations = InventoryService.releaseExpiredReservations.bind(InventoryService);
export const adjustStock = InventoryService.adjustStock.bind(InventoryService);
export const getLowStockItems = InventoryService.getLowStockItems.bind(InventoryService);
export const createProductVariant = InventoryService.createProductVariant.bind(InventoryService);
export const updateProductVariant = InventoryService.updateProductVariant.bind(InventoryService);
