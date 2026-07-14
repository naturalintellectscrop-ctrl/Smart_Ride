/**
 * Receipt domain service — ONE shared path for every transaction type.
 *
 * `ensureReceiptForTask` is idempotent: it returns the existing receipt if one
 * was already issued for the task, otherwise it builds a privacy-safe receipt
 * (FIRST NAMES ONLY, never phone numbers), assigns a human-readable number, and
 * persists it. A Task carries the fare breakdown for rides AND deliveries
 * (food/shop/item/pharmacy), so a single function covers all five receipt types.
 */
import { db } from '@/lib/db';
import type { Prisma, ReceiptType, TaskType } from '@prisma/client';
import { nextReceiptNumber } from './receipt-number';
import { firstNameOf } from '@/lib/privacy/public-contact';

const COMPLETED_STATUSES = new Set(['COMPLETED', 'DELIVERED']);

const TASK_TO_RECEIPT: Record<TaskType, ReceiptType> = {
  SMART_BODA_RIDE: 'RIDE',
  SMART_CAR_RIDE: 'RIDE',
  FOOD_DELIVERY: 'FOOD',
  SHOPPING: 'SHOP',
  ITEM_DELIVERY: 'ITEM_DELIVERY',
  SMART_HEALTH_DELIVERY: 'PHARMACY',
};

const SERVICE_LABEL: Record<TaskType, string> = {
  SMART_BODA_RIDE: 'Smart Boda Ride',
  SMART_CAR_RIDE: 'Smart Car Ride',
  FOOD_DELIVERY: 'Food Delivery',
  SHOPPING: 'Shopping',
  ITEM_DELIVERY: 'Item Delivery',
  SMART_HEALTH_DELIVERY: 'Pharmacy Delivery',
};

const num =(v: Prisma.Decimal | number | null | undefined): number =>
  v == null ? 0 : typeof v === 'number' ? v : Number(v);

export interface ReceiptLine {
  label: string;
  amount: number;
}

function buildBreakdown(task: {
  baseFare: Prisma.Decimal | null;
  distanceFare: Prisma.Decimal | null;
  timeFare: Prisma.Decimal | null;
  deliveryFee: Prisma.Decimal | null;
  waitingCharge: Prisma.Decimal | null;
  serviceFee: Prisma.Decimal | null;
  discount: Prisma.Decimal | null;
  totalAmount: Prisma.Decimal | null;
}): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  const push = (label: string, amount: number) => {
    if (amount && amount !== 0) lines.push({ label, amount });
  };
  push('Base Fare', num(task.baseFare));
  push('Distance Charge', num(task.distanceFare));
  push('Time Charge', num(task.timeFare));
  push('Delivery Fee', num(task.deliveryFee));
  push('Waiting Charge', num(task.waitingCharge));

  // Peak/night surge is baked into totalAmount but has no dedicated Task column,
  // so recover it as the remainder: total = (itemised charges) + surge − discount.
  // This guarantees the breakdown always sums to the total the customer paid,
  // instead of silently under-listing (base+distance+service < total). Matches
  // the "Peak / night surcharge" line the client sees on the fare screen.
  const discount = num(task.discount) > 0 ? num(task.discount) : 0;
  const itemisedCharges =
    lines.reduce((s, l) => s + l.amount, 0) + num(task.serviceFee);
  const surcharge = Math.round(num(task.totalAmount) - itemisedCharges + discount);
  if (surcharge > 0) push('Peak / night surcharge', surcharge);

  push('Service Fee', num(task.serviceFee));
  if (num(task.discount) > 0) push('Discount', -num(task.discount));
  return lines;
}

/**
 * Idempotently create (or fetch) the receipt for a completed task.
 * Returns null only if the task doesn't exist.
 */
export async function ensureReceiptForTask(taskId: string, opts?: { force?: boolean }) {
  const existing = await db.receipt.findUnique({ where: { taskId } });
  if (existing) return existing;

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { fullName: true, rating: true, riderRole: true } },
    },
  });
  if (!task) return null;
  if (!opts?.force && !COMPLETED_STATUSES.has(task.status)) {
    // Only issue receipts for completed/delivered transactions.
    return null;
  }

  const type = TASK_TO_RECEIPT[task.taskType];
  const breakdown = buildBreakdown(task);
  const subtotal = breakdown
    .filter((l) => l.amount > 0)
    .reduce((s, l) => s + l.amount, 0);
  const fees = num(task.serviceFee);
  const total = num(task.totalAmount);
  const vehicleType =
    task.taskType === 'SMART_BODA_RIDE'
      ? 'Bike'
      : task.taskType === 'SMART_CAR_RIDE'
        ? 'Car'
        : task.rider?.riderRole === 'SMART_CAR_DRIVER'
          ? 'Car'
          : task.rider?.riderRole
            ? 'Bike'
            : null;

  // Reserve number + persist atomically.
  const receipt = await db.$transaction(async (tx) => {
    const again = await tx.receipt.findUnique({ where: { taskId } });
    if (again) return again;
    const receiptNumber = await nextReceiptNumber(tx, type);
    return tx.receipt.create({
      data: {
        receiptNumber,
        type,
        taskId: task.id,
        orderId: task.orderId ?? undefined,
        healthOrderId: task.healthOrderId ?? undefined,
        userId: task.clientId,
        currency: 'UGX',
        subtotal,
        fees,
        tax: 0,
        total,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
        paymentMethod: task.paymentMethod,
        paymentStatus: task.paymentStatus,
        serviceLabel: SERVICE_LABEL[task.taskType],
        vehicleType,
        providerName: firstNameOf(task.rider?.fullName) || null,
        providerRating: task.rider?.rating ?? null,
        pickupAddress: task.pickupAddress,
        dropoffAddress: task.dropoffAddress,
        distanceKm: task.distanceKm,
        durationMin: task.actualDuration ?? task.estimatedDuration ?? null,
      },
    });
  });

  return receipt;
}
