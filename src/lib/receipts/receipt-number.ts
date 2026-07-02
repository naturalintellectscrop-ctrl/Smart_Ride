/**
 * Human-readable, collision-free receipt numbers.
 *
 *   SR-RIDE-2026-000123   SR-FOOD-2026-000045   SR-PHARM-2026-000009
 *
 * Uniqueness is guaranteed by an atomic per-(type, year) counter row
 * (ReceiptSequence) plus a UNIQUE constraint on Receipt.receiptNumber.
 * Never uses raw UUIDs.
 */
import type { Prisma, PrismaClient, ReceiptType } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

const TYPE_CODE: Record<ReceiptType, string> = {
  RIDE: 'RIDE',
  FOOD: 'FOOD',
  SHOP: 'SHOP',
  ITEM_DELIVERY: 'ITEM',
  PHARMACY: 'PHARM',
};

/**
 * Reserve and return the next receipt number for a type. The upsert-increment
 * is atomic at the database level, so concurrent completions never collide.
 */
export async function nextReceiptNumber(db: Db, type: ReceiptType): Promise<string> {
  const year = new Date().getFullYear();
  const row = await db.receiptSequence.upsert({
    where: { type_year: { type, year } },
    create: { type, year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  const seq = String(row.lastSeq).padStart(6, '0');
  return `SR-${TYPE_CODE[type]}-${year}-${seq}`;
}
