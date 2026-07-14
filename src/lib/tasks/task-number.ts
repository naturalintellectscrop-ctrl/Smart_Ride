/**
 * Human-readable, collision-free task numbers.
 *
 *   TASK-2026-000123
 *
 * Uniqueness is guaranteed by an atomic per-year counter row (TaskSequence)
 * plus the UNIQUE constraint on Task.taskNumber. Replaces the opaque base36
 * timestamp form (TASK-2026-MRKBQXGC), mirroring nextReceiptNumber().
 *
 * Numbering may skip a value if a task creation is rolled back after the
 * counter is reserved — that's fine (invoice-style gaps), and keeps the hot
 * path free of a long-held row lock.
 */
import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Reserve and return the next task number for the current year. The
 * upsert-increment is atomic at the database level, so concurrent bookings
 * never collide.
 *
 * If the TaskSequence table doesn't exist yet (the counter is a new addition
 * and the schema is `db push`-managed), we fall back to the legacy
 * timestamp-based form so booking NEVER breaks. This lets the code deploy
 * before the table is created; sequential numbering activates automatically
 * once TaskSequence exists — no coordinated deploy needed.
 */
export async function nextTaskNumber(db: Db): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const row = await db.taskSequence.upsert({
      where: { year },
      create: { year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    const seq = String(row.lastSeq).padStart(6, '0');
    return `TASK-${year}-${seq}`;
  } catch {
    // Legacy fallback (matches the old generateTaskNumber format).
    return `TASK-${year}-${Date.now().toString(36).toUpperCase()}`;
  }
}
