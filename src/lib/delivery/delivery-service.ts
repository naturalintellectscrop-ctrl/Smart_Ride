/**
 * SMART RIDE — DELIVERY SERVICE (BE-005)
 *
 * Two structural gaps in the delivery-personnel workflow:
 *
 * 1. CLAIMING WAS A RACE. `POST /tasks/[id]/accept` read the task, checked it
 *    was unclaimed, then wrote its own `riderId` — the same read-then-write
 *    that let two withdrawals drain one wallet. Two couriers accepting the
 *    same offer within the dispatch window both passed the check and both
 *    wrote; the second silently won, and the first spent the trip believing
 *    they had a job that had been reassigned under them.
 *
 * 2. NOTHING PROVED A DELIVERY HAPPENED. There was no photo, no signature and
 *    no handover code, so a courier could mark a parcel DELIVERED from
 *    anywhere, and a customer disputing "I never received it" left the
 *    platform with nothing to adjudicate on.
 *
 * Both are fixed the same way the wallet was: let the database decide, with a
 * single conditional statement, instead of trusting a read that can go stale.
 */

import { db } from '@/lib/db';
import { TaskStatus, TaskType, ProofOfDeliveryType } from '@prisma/client';

/** Task types that are deliveries and therefore require proof. */
export const DELIVERY_TASK_TYPES: TaskType[] = [
  TaskType.FOOD_DELIVERY,
  TaskType.SHOPPING,
  TaskType.ITEM_DELIVERY,
  TaskType.SMART_HEALTH_DELIVERY,
];

export function isDeliveryTask(taskType: TaskType): boolean {
  return DELIVERY_TASK_TYPES.includes(taskType);
}

/**
 * Statuses from which a task is still up for grabs. A task that has moved past
 * assignment belongs to whoever holds it.
 */
const CLAIMABLE_STATUSES: TaskStatus[] = [
  TaskStatus.CREATED,
  TaskStatus.SEARCHING,
  TaskStatus.MATCHING,
  TaskStatus.ASSIGNED,
];

export interface ClaimResult {
  success: boolean;
  /** True when this call is what actually claimed the task. */
  claimed: boolean;
  /** True when the caller already held it — a retry, not a conflict. */
  alreadyMine: boolean;
  error?: string;
  /** Who holds it, when the claim was lost to someone else. */
  heldBy?: string | null;
}

/**
 * Claim a task for a provider, atomically.
 *
 * The guard is one conditional UPDATE: assign `riderId` only if the row still
 * has no rider (or already has this one) AND is still in a claimable state.
 * Postgres evaluates the condition and applies the write in a single
 * statement, so the loser of a race matches zero rows rather than overwriting
 * the winner. `count` is the answer to "did I get the job", and no read can go
 * stale between the check and the write because there is no gap.
 *
 * Idempotent: a courier re-sending their own accept gets `alreadyMine` rather
 * than an error, because a dropped response should not cost them the job.
 */
export async function claimTask(taskId: string, riderId: string): Promise<ClaimResult> {
  const claimed = await db.task.updateMany({
    where: {
      id: taskId,
      status: { in: CLAIMABLE_STATUSES },
      // NULL means unclaimed; equal means this is a retry of our own claim.
      OR: [{ riderId: null }, { riderId }],
    },
    data: { riderId },
  });

  if (claimed.count > 0) {
    return { success: true, claimed: true, alreadyMine: false };
  }

  // Zero rows. Work out WHY, so the courier gets a message they can act on
  // rather than a generic failure.
  const current = await db.task.findUnique({
    where: { id: taskId },
    select: { riderId: true, status: true },
  });

  if (!current) {
    return { success: false, claimed: false, alreadyMine: false, error: 'Task not found' };
  }
  if (current.riderId === riderId) {
    // Already ours, but the status has moved past claimable — still a retry.
    return { success: true, claimed: false, alreadyMine: true };
  }
  if (current.riderId) {
    return {
      success: false,
      claimed: false,
      alreadyMine: false,
      error: 'This job has already been taken',
      heldBy: current.riderId,
    };
  }
  return {
    success: false,
    claimed: false,
    alreadyMine: false,
    error: `This job is no longer available (${current.status})`,
  };
}

/**
 * Release a claim — the courier cancelled, or dispatch reassigned.
 * Scoped to the holder so one provider cannot release another's job.
 */
export async function releaseClaim(taskId: string, riderId: string): Promise<boolean> {
  const released = await db.task.updateMany({
    where: { id: taskId, riderId },
    data: { riderId: null },
  });
  return released.count > 0;
}

/**
 * Generate the handover code the recipient is given.
 *
 * Four digits: long enough that guessing is not worth a courier's time given
 * one task, short enough to read aloud at a doorway. Deliberately NOT derived
 * from the task id — a derived code is forgeable by anyone who can see the id.
 */
export function generateDeliveryCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface ProofSubmission {
  proofType: ProofOfDeliveryType;
  /** Required when proofType is CODE. */
  code?: string;
  photoUrl?: string;
  signatureUrl?: string;
  recipientName?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProofResult {
  success: boolean;
  error?: string;
  /** How far the courier was from the drop-off when proof was captured. */
  distanceFromDropoffKm?: number;
}

/**
 * How far from the recorded drop-off a proof may be captured before it is
 * refused. Generous: GPS in a dense city drifts, and a courier may be at a
 * gate or a reception desk rather than the exact pin. Tight enough that proof
 * from the other side of town is refused.
 */
export const MAX_PROOF_DISTANCE_KM = 1.0;

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat1 - lat2) * 111;
  const dLng = (lng1 - lng2) * 111 * Math.cos((lat2 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Validate and record proof of delivery.
 *
 * Refuses rather than accepting weak evidence: a CODE proof with the wrong
 * code, a PHOTO proof with no photo, or any proof captured implausibly far
 * from the drop-off. The point of proof is to settle a dispute, and evidence
 * that is accepted unconditionally settles nothing.
 */
export async function submitProofOfDelivery(
  taskId: string,
  riderId: string,
  proof: ProofSubmission
): Promise<ProofResult> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      riderId: true,
      taskType: true,
      status: true,
      deliveryCode: true,
      dropoffLatitude: true,
      dropoffLongitude: true,
      proofCapturedAt: true,
    },
  });

  if (!task) return { success: false, error: 'Task not found' };
  if (task.riderId !== riderId) {
    return { success: false, error: 'You are not assigned to this delivery' };
  }
  if (!isDeliveryTask(task.taskType)) {
    return { success: false, error: 'This task type does not take proof of delivery' };
  }

  // Proof is a one-time act. Re-submitting would let a courier replace weak
  // evidence after a dispute is raised.
  if (task.proofCapturedAt) {
    return { success: false, error: 'Proof of delivery has already been recorded' };
  }

  switch (proof.proofType) {
    case ProofOfDeliveryType.CODE: {
      if (!proof.code) return { success: false, error: 'Delivery code is required' };
      if (!task.deliveryCode) {
        return { success: false, error: 'This delivery has no code issued' };
      }
      if (proof.code.trim() !== task.deliveryCode) {
        return { success: false, error: 'Incorrect delivery code' };
      }
      break;
    }
    case ProofOfDeliveryType.PHOTO:
      if (!proof.photoUrl) return { success: false, error: 'A photo is required' };
      break;
    case ProofOfDeliveryType.SIGNATURE:
      if (!proof.signatureUrl) return { success: false, error: 'A signature is required' };
      break;
    case ProofOfDeliveryType.LEFT_WITH_NOTE:
      // A claim rather than evidence, so it carries a higher bar: a photo of
      // where it was left, so the customer can at least go and look.
      if (!proof.photoUrl) {
        return {
          success: false,
          error: 'A photo of where the parcel was left is required',
        };
      }
      break;
    default:
      return { success: false, error: 'Unknown proof type' };
  }

  // Location check, when we have both ends of it.
  let distance: number | undefined;
  if (
    proof.latitude != null &&
    proof.longitude != null &&
    task.dropoffLatitude != null &&
    task.dropoffLongitude != null
  ) {
    distance = distanceKm(
      proof.latitude,
      proof.longitude,
      task.dropoffLatitude,
      task.dropoffLongitude
    );
    if (distance > MAX_PROOF_DISTANCE_KM) {
      return {
        success: false,
        error: 'You appear to be too far from the delivery address',
        distanceFromDropoffKm: Math.round(distance * 100) / 100,
      };
    }
  }

  await db.task.update({
    where: { id: taskId },
    data: {
      proofType: proof.proofType,
      proofPhotoUrl: proof.photoUrl ?? null,
      proofSignatureUrl: proof.signatureUrl ?? null,
      proofRecipientName: proof.recipientName ?? null,
      proofLatitude: proof.latitude ?? null,
      proofLongitude: proof.longitude ?? null,
      proofCapturedAt: new Date(),
    },
  });

  return {
    success: true,
    distanceFromDropoffKm: distance != null ? Math.round(distance * 100) / 100 : undefined,
  };
}

/**
 * Whether a task may be marked DELIVERED / COMPLETED.
 *
 * A delivery without proof cannot complete. This is the whole point of the
 * proof: if completion were still possible without it, capturing proof would
 * be optional in practice and the disputed deliveries — the ones that matter —
 * would be exactly the ones missing it.
 */
export async function canCompleteDelivery(
  taskId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { taskType: true, proofCapturedAt: true, riderId: true },
  });

  if (!task) return { allowed: false, reason: 'Task not found' };
  if (!isDeliveryTask(task.taskType)) return { allowed: true };
  if (!task.riderId) return { allowed: false, reason: 'No provider is assigned' };
  if (!task.proofCapturedAt) {
    return {
      allowed: false,
      reason: 'Capture proof of delivery before completing this job',
    };
  }
  return { allowed: true };
}

/**
 * Every job a delivery provider currently holds.
 *
 * A courier legitimately carries several parcels at once, which is what makes
 * delivery economics work at all. Returned as a list, ordered by how urgent
 * each is, rather than as a single "active task" — a UI that can only show one
 * makes the other assignments invisible and undeliverable.
 */
export async function getActiveAssignments(riderId: string) {
  return db.task.findMany({
    where: {
      riderId,
      status: {
        in: [
          TaskStatus.ASSIGNED,
          TaskStatus.ACCEPTED,
          TaskStatus.ARRIVING,
          TaskStatus.ARRIVED,
          TaskStatus.PICKED_UP,
          TaskStatus.IN_PROGRESS,
          TaskStatus.IN_TRANSIT,
          TaskStatus.DELIVERING,
        ],
      },
    },
    orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      taskNumber: true,
      taskType: true,
      status: true,
      pickupAddress: true,
      dropoffAddress: true,
      dropoffLatitude: true,
      dropoffLongitude: true,
      totalAmount: true,
      riderEarnings: true,
      proofCapturedAt: true,
      createdAt: true,
      deliveringAt: true,
    },
  });
}
