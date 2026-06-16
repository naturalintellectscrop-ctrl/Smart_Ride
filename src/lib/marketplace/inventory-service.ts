/**
 * Smart Ride Marketplace Inventory Service
 *
 * Prevents overselling through atomic stock reservations.
 * Two inventory domains:
 *   1. MenuItem inventory  — for food/shopping orders
 *   2. MedicineCatalog inventory — for health/pharmacy orders
 *
 * Reservation lifecycle:
 *   RESERVED → CONFIRMED  (payment confirmed, stock permanently deducted)
 *   RESERVED → RELEASED   (order cancelled / payment failed, stock becomes available again)
 *   RESERVED → EXPIRED    (reservation timed out after 15 min)
 */

import { db } from '@/lib/db';
import { InventoryReservationStatus } from '@prisma/client';
import { toNumber } from '@/lib/decimal-utils';

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_RESERVATION_EXPIRY_MINUTES = 15;

/**
 * Get the reservation timeout from SystemConfig if available,
 * otherwise fall back to the default.
 */
async function getReservationExpiryMinutes(): Promise<number> {
  try {
    const config = await db.systemConfig.findUnique({
      where: { key: 'inventory_reservation_expiry_minutes' },
    });
    if (config) {
      const parsed = parseInt(config.value, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // SystemConfig table may not be accessible — use default
  }
  return DEFAULT_RESERVATION_EXPIRY_MINUTES;
}

// ============================================
// ERROR TYPES
// ============================================

export class InsufficientStockError extends Error {
  public readonly menuItemId: string;
  public readonly requested: number;
  public readonly available: number;

  constructor(menuItemId: string, requested: number, available: number) {
    super(
      `Insufficient stock for menu item ${menuItemId}. Requested: ${requested}, Available: ${available}`
    );
    this.name = 'InsufficientStockError';
    this.menuItemId = menuItemId;
    this.requested = requested;
    this.available = available;
  }
}

export class InsufficientMedicineStockError extends Error {
  public readonly medicineCatalogId: string;
  public readonly requested: number;
  public readonly available: number;

  constructor(medicineCatalogId: string, requested: number, available: number) {
    super(
      `Insufficient stock for medicine ${medicineCatalogId}. Requested: ${requested}, Available: ${available}`
    );
    this.name = 'InsufficientMedicineStockError';
    this.medicineCatalogId = medicineCatalogId;
    this.requested = requested;
    this.available = available;
  }
}

export class ReservationNotFoundError extends Error {
  constructor(reservationId: string) {
    super(`Reservation not found: ${reservationId}`);
    this.name = 'ReservationNotFoundError';
  }
}

export class InvalidReservationStatusError extends Error {
  constructor(reservationId: string, currentStatus: string) {
    super(`Reservation ${reservationId} is in ${currentStatus} status and cannot be modified`);
    this.name = 'InvalidReservationStatusError';
  }
}

// ============================================
// MENU ITEM INVENTORY FUNCTIONS
// ============================================

/**
 * Reserve stock for an order atomically.
 * Returns the reservation ID or throws if insufficient stock.
 *
 * Logic:
 *   1. In a transaction: check total stock minus RESERVED quantity >= requested quantity
 *   2. Create InventoryReservation with status=RESERVED, expiresAt = now + 15 minutes
 *   3. If insufficient stock, throw InsufficientStockError with available quantity
 */
export async function reserveStock(
  menuItemId: string,
  orderId: string,
  quantity: number
): Promise<string> {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  const expiryMinutes = await getReservationExpiryMinutes();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  return db.$transaction(async (tx) => {
    // Fetch menu item with its active (non-expired) RESERVED reservations
    const menuItem = await tx.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        reservations: {
          where: {
            status: InventoryReservationStatus.RESERVED,
            expiresAt: { gt: new Date() },
          },
          select: { quantity: true },
        },
      },
    });

    if (!menuItem) {
      throw new Error(`Menu item not found: ${menuItemId}`);
    }

    if (!menuItem.isAvailable) {
      throw new InsufficientStockError(menuItemId, quantity, 0);
    }

    // If stock tracking is disabled (null), skip stock check
    if (menuItem.stockQuantity !== null && menuItem.stockQuantity !== undefined) {
      const reservedQuantity = menuItem.reservations.reduce(
        (sum, r) => sum + r.quantity,
        0
      );
      const availableStock = menuItem.stockQuantity - reservedQuantity;

      if (availableStock < quantity) {
        throw new InsufficientStockError(menuItemId, quantity, availableStock);
      }
    }

    // Create the reservation
    const reservation = await tx.inventoryReservation.create({
      data: {
        menuItemId,
        orderId,
        quantity,
        status: InventoryReservationStatus.RESERVED,
        expiresAt,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'INVENTORY_STOCK_RESERVED',
        entityType: 'InventoryReservation',
        entityId: reservation.id,
        orderId,
        description: `Reserved ${quantity} units of menu item ${menuItemId} for order ${orderId}. Expires at ${expiresAt.toISOString()}`,
        source: 'SYSTEM',
      },
    });

    return reservation.id;
  });
}

/**
 * Confirm a reservation (after payment is confirmed).
 * Permanently deducts from stock quantity.
 *
 * Logic:
 *   1. Update reservation status to CONFIRMED
 *   2. Decrement MenuItem.stockQuantity by the reserved amount
 */
export async function confirmReservation(reservationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new ReservationNotFoundError(reservationId);
    }

    if (reservation.status !== InventoryReservationStatus.RESERVED) {
      throw new InvalidReservationStatusError(reservationId, reservation.status);
    }

    // Update reservation status
    await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: InventoryReservationStatus.CONFIRMED },
    });

    // Decrement stockQuantity on MenuItem if tracking is enabled
    const menuItem = await tx.menuItem.findUnique({
      where: { id: reservation.menuItemId },
      select: { stockQuantity: true, name: true },
    });

    if (menuItem && menuItem.stockQuantity !== null && menuItem.stockQuantity !== undefined) {
      const newQuantity = Math.max(0, menuItem.stockQuantity - reservation.quantity);
      await tx.menuItem.update({
        where: { id: reservation.menuItemId },
        data: {
          stockQuantity: newQuantity,
          isAvailable: newQuantity > 0,
        },
      });
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'INVENTORY_RESERVATION_CONFIRMED',
        entityType: 'InventoryReservation',
        entityId: reservationId,
        orderId: reservation.orderId,
        description: `Confirmed reservation of ${reservation.quantity} units for menu item ${reservation.menuItemId}. Stock permanently deducted.`,
        source: 'SYSTEM',
      },
    });
  });
}

/**
 * Release a reservation (if order is cancelled or payment fails).
 * Returns the reserved quantity back to available stock.
 *
 * Logic:
 *   1. Update reservation status to RELEASED
 *   2. NO need to increment stockQuantity (it wasn't deducted during reservation)
 */
export async function releaseReservation(reservationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new ReservationNotFoundError(reservationId);
    }

    // Can only release RESERVED reservations
    // (EXPIRED ones are already effectively released)
    if (reservation.status !== InventoryReservationStatus.RESERVED) {
      throw new InvalidReservationStatusError(reservationId, reservation.status);
    }

    // Update reservation status — stock was NOT deducted, so no increment needed
    await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: {
        status: InventoryReservationStatus.RELEASED,
        releasedAt: new Date(),
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'INVENTORY_RESERVATION_RELEASED',
        entityType: 'InventoryReservation',
        entityId: reservationId,
        orderId: reservation.orderId,
        description: `Released reservation of ${reservation.quantity} units for menu item ${reservation.menuItemId}. Stock available again.`,
        source: 'SYSTEM',
      },
    });
  });
}

/**
 * Release expired reservations (cron job).
 * Called periodically to clean up reservations that passed their expiresAt.
 * Returns the number of reservations released.
 */
export async function releaseExpiredReservations(): Promise<number> {
  let released = 0;

  await db.$transaction(async (tx) => {
    const expiredReservations = await tx.inventoryReservation.findMany({
      where: {
        status: InventoryReservationStatus.RESERVED,
        expiresAt: { lt: new Date() },
      },
    });

    for (const reservation of expiredReservations) {
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: InventoryReservationStatus.EXPIRED,
          releasedAt: new Date(),
        },
      });
      released++;
    }

    if (released > 0) {
      await tx.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'INVENTORY_RESERVATIONS_EXPIRED',
          entityType: 'SystemEvent',
          entityId: `batch-expiry-${Date.now()}`,
          description: `Released ${released} expired inventory reservations`,
          newValues: JSON.stringify({ released }),
          source: 'SYSTEM',
        },
      });
    }
  });

  return released;
}

/**
 * Get available stock (total stock minus active reservations).
 *
 * Logic:
 *   Total = MenuItem.stockQuantity
 *   Reserved = sum of quantity where status = RESERVED (not expired)
 *   Available = Total - Reserved
 *
 * Note: CONFIRMED reservations already had stock deducted from stockQuantity,
 * so we only subtract RESERVED (not-yet-confirmed) from the total.
 */
export async function getAvailableStock(menuItemId: string): Promise<number> {
  const menuItem = await db.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      reservations: {
        where: {
          status: InventoryReservationStatus.RESERVED,
          expiresAt: { gt: new Date() },
        },
        select: { quantity: true },
      },
    },
  });

  if (!menuItem) {
    throw new Error(`Menu item not found: ${menuItemId}`);
  }

  // If stock tracking is disabled, return -1 to indicate unlimited
  if (menuItem.stockQuantity === null || menuItem.stockQuantity === undefined) {
    return -1;
  }

  const reservedQuantity = menuItem.reservations.reduce(
    (sum, r) => sum + r.quantity,
    0
  );

  return menuItem.stockQuantity - reservedQuantity;
}

/**
 * Confirm all reservations for a given order.
 * Called when payment is confirmed.
 */
export async function confirmReservationsForOrder(orderId: string): Promise<number> {
  const reservations = await db.inventoryReservation.findMany({
    where: {
      orderId,
      status: InventoryReservationStatus.RESERVED,
    },
  });

  let confirmed = 0;
  for (const reservation of reservations) {
    try {
      await confirmReservation(reservation.id);
      confirmed++;
    } catch (error) {
      console.error(
        `[InventoryService] Failed to confirm reservation ${reservation.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
  return confirmed;
}

/**
 * Release all reservations for a given order.
 * Called when order is cancelled or payment fails.
 */
export async function releaseReservationsForOrder(orderId: string): Promise<number> {
  const reservations = await db.inventoryReservation.findMany({
    where: {
      orderId,
      status: InventoryReservationStatus.RESERVED,
    },
  });

  let released = 0;
  for (const reservation of reservations) {
    try {
      await releaseReservation(reservation.id);
      released++;
    } catch (error) {
      console.error(
        `[InventoryService] Failed to release reservation ${reservation.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
  return released;
}

// ============================================
// MEDICINE CATALOG INVENTORY FUNCTIONS
// ============================================

/**
 * Reserve medicine stock for a health order atomically.
 * Returns the reservation ID or throws if insufficient stock.
 */
export async function reserveMedicineStock(
  medicineCatalogId: string,
  healthOrderId: string,
  quantity: number
): Promise<string> {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  const expiryMinutes = await getReservationExpiryMinutes();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  return db.$transaction(async (tx) => {
    // Fetch medicine catalog with its active RESERVED reservations
    const medicine = await tx.medicineCatalog.findUnique({
      where: { id: medicineCatalogId },
      include: {
        medicineReservations: {
          where: {
            status: InventoryReservationStatus.RESERVED,
            expiresAt: { gt: new Date() },
          },
          select: { quantity: true },
        },
      },
    });

    if (!medicine) {
      throw new Error(`Medicine catalog item not found: ${medicineCatalogId}`);
    }

    if (!medicine.isAvailable) {
      throw new InsufficientMedicineStockError(medicineCatalogId, quantity, 0);
    }

    // If stock tracking is enabled, check availability
    if (medicine.stockQuantity !== null && medicine.stockQuantity !== undefined) {
      const reservedQuantity = medicine.medicineReservations.reduce(
        (sum, r) => sum + r.quantity,
        0
      );
      const availableStock = medicine.stockQuantity - reservedQuantity;

      if (availableStock < quantity) {
        throw new InsufficientMedicineStockError(medicineCatalogId, quantity, availableStock);
      }
    }

    // Create the reservation
    const reservation = await tx.medicineInventoryReservation.create({
      data: {
        medicineCatalogId,
        healthOrderId,
        quantity,
        status: InventoryReservationStatus.RESERVED,
        expiresAt,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'MEDICINE_STOCK_RESERVED',
        entityType: 'MedicineInventoryReservation',
        entityId: reservation.id,
        healthOrderId,
        description: `Reserved ${quantity} units of medicine ${medicineCatalogId} for health order ${healthOrderId}. Expires at ${expiresAt.toISOString()}`,
        source: 'SYSTEM',
      },
    });

    return reservation.id;
  });
}

/**
 * Confirm a medicine reservation (after payment/delivery is confirmed).
 * Permanently deducts from MedicineCatalog.stockQuantity.
 */
export async function confirmMedicineReservation(reservationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const reservation = await tx.medicineInventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new ReservationNotFoundError(reservationId);
    }

    if (reservation.status !== InventoryReservationStatus.RESERVED) {
      throw new InvalidReservationStatusError(reservationId, reservation.status);
    }

    // Update reservation status
    await tx.medicineInventoryReservation.update({
      where: { id: reservationId },
      data: { status: InventoryReservationStatus.CONFIRMED },
    });

    // Decrement stockQuantity on MedicineCatalog if tracking is enabled
    const medicine = await tx.medicineCatalog.findUnique({
      where: { id: reservation.medicineCatalogId },
      select: { stockQuantity: true, name: true },
    });

    if (medicine && medicine.stockQuantity !== null && medicine.stockQuantity !== undefined) {
      const newQuantity = Math.max(0, medicine.stockQuantity - reservation.quantity);
      await tx.medicineCatalog.update({
        where: { id: reservation.medicineCatalogId },
        data: {
          stockQuantity: newQuantity,
          isAvailable: newQuantity > 0,
        },
      });
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'MEDICINE_RESERVATION_CONFIRMED',
        entityType: 'MedicineInventoryReservation',
        entityId: reservationId,
        healthOrderId: reservation.healthOrderId,
        description: `Confirmed reservation of ${reservation.quantity} units for medicine ${reservation.medicineCatalogId}. Stock permanently deducted.`,
        source: 'SYSTEM',
      },
    });
  });
}

/**
 * Release a medicine reservation (order cancelled or payment failed).
 * Stock was NOT deducted during reservation, so no increment needed.
 */
export async function releaseMedicineReservation(reservationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const reservation = await tx.medicineInventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new ReservationNotFoundError(reservationId);
    }

    if (reservation.status !== InventoryReservationStatus.RESERVED) {
      throw new InvalidReservationStatusError(reservationId, reservation.status);
    }

    // Update reservation status — stock was NOT deducted, so no increment needed
    await tx.medicineInventoryReservation.update({
      where: { id: reservationId },
      data: { status: InventoryReservationStatus.RELEASED },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'MEDICINE_RESERVATION_RELEASED',
        entityType: 'MedicineInventoryReservation',
        entityId: reservationId,
        healthOrderId: reservation.healthOrderId,
        description: `Released reservation of ${reservation.quantity} units for medicine ${reservation.medicineCatalogId}. Stock available again.`,
        source: 'SYSTEM',
      },
    });
  });
}

/**
 * Release expired medicine reservations (cron job).
 * Returns the number of reservations released.
 */
export async function releaseExpiredMedicineReservations(): Promise<number> {
  let released = 0;

  await db.$transaction(async (tx) => {
    const expiredReservations = await tx.medicineInventoryReservation.findMany({
      where: {
        status: InventoryReservationStatus.RESERVED,
        expiresAt: { lt: new Date() },
      },
    });

    for (const reservation of expiredReservations) {
      await tx.medicineInventoryReservation.update({
        where: { id: reservation.id },
        data: { status: InventoryReservationStatus.EXPIRED },
      });
      released++;
    }

    if (released > 0) {
      await tx.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'MEDICINE_RESERVATIONS_EXPIRED',
          entityType: 'SystemEvent',
          entityId: `medicine-batch-expiry-${Date.now()}`,
          description: `Released ${released} expired medicine inventory reservations`,
          newValues: JSON.stringify({ released }),
          source: 'SYSTEM',
        },
      });
    }
  });

  return released;
}

/**
 * Get available medicine stock (total stock minus active reservations).
 * Returns -1 if stock tracking is disabled.
 */
export async function getAvailableMedicineStock(medicineCatalogId: string): Promise<number> {
  const medicine = await db.medicineCatalog.findUnique({
    where: { id: medicineCatalogId },
    include: {
      medicineReservations: {
        where: {
          status: InventoryReservationStatus.RESERVED,
          expiresAt: { gt: new Date() },
        },
        select: { quantity: true },
      },
    },
  });

  if (!medicine) {
    throw new Error(`Medicine catalog item not found: ${medicineCatalogId}`);
  }

  // If stock tracking is disabled, return -1 to indicate unlimited
  if (medicine.stockQuantity === null || medicine.stockQuantity === undefined) {
    return -1;
  }

  const reservedQuantity = medicine.medicineReservations.reduce(
    (sum, r) => sum + r.quantity,
    0
  );

  return medicine.stockQuantity - reservedQuantity;
}

/**
 * Confirm all medicine reservations for a given health order.
 */
export async function confirmMedicineReservationsForOrder(healthOrderId: string): Promise<number> {
  const reservations = await db.medicineInventoryReservation.findMany({
    where: {
      healthOrderId,
      status: InventoryReservationStatus.RESERVED,
    },
  });

  let confirmed = 0;
  for (const reservation of reservations) {
    try {
      await confirmMedicineReservation(reservation.id);
      confirmed++;
    } catch (error) {
      console.error(
        `[InventoryService] Failed to confirm medicine reservation ${reservation.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
  return confirmed;
}

/**
 * Release all medicine reservations for a given health order.
 */
export async function releaseMedicineReservationsForOrder(healthOrderId: string): Promise<number> {
  const reservations = await db.medicineInventoryReservation.findMany({
    where: {
      healthOrderId,
      status: InventoryReservationStatus.RESERVED,
    },
  });

  let released = 0;
  for (const reservation of reservations) {
    try {
      await releaseMedicineReservation(reservation.id);
      released++;
    } catch (error) {
      console.error(
        `[InventoryService] Failed to release medicine reservation ${reservation.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
  return released;
}

/**
 * Release ALL expired reservations (both menu item and medicine).
 * Convenience function for cron jobs.
 */
export async function releaseAllExpiredReservations(): Promise<{
  menuItemReservationsReleased: number;
  medicineReservationsReleased: number;
}> {
  const [menuItemReleased, medicineReleased] = await Promise.all([
    releaseExpiredReservations(),
    releaseExpiredMedicineReservations(),
  ]);

  return {
    menuItemReservationsReleased: menuItemReleased,
    medicineReservationsReleased: medicineReleased,
  };
}
