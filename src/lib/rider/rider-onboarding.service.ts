/**
 * Smart Ride - Rider Onboarding Service
 *
 * Handles rider registration, verification, suspension, capability assignment,
 * metrics calculation, wallet access, and online status management.
 * All data operations use real database queries via Prisma.
 */

import { db } from '@/lib/db';
import {
  RiderRole,
  RiderStatus,
  VehicleType,
  DocumentType,
  DocumentStatus,
  TaskType,
  WalletOwnerType,
  WalletStatus,
  WalletTransactionType,
  WalletTransactionStatus,
} from '@prisma/client';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

// ============================================
// TYPES
// ============================================

interface RegisterRiderInput {
  fullName: string;
  phone: string;
  email?: string;
  riderRole: RiderRole | string;
  physicalAddress: string;
  // Document URLs
  facePhotoUrl?: string;
  nationalIdFrontUrl?: string;
  nationalIdBackUrl?: string;
  driverLicenseUrl?: string;
  // Vehicle info (required for SMART_BODA_RIDER and SMART_CAR_DRIVER)
  vehicle?: {
    make: string;
    model: string;
    year?: number;
    color: string;
    plateNumber: string;
    registrationDocUrl?: string;
    insuranceDocUrl?: string;
    inspectionDocUrl?: string;
  };
  // User account
  userId?: string;
}

interface VerifyRiderInput {
  riderId: string;
  adminId: string;
  action: 'APPROVE' | 'REJECT';
  notes?: string;
  reason?: string;
}

interface SuspendRiderInput {
  riderId: string;
  adminId: string;
  reason: string;
}

interface AssignCapabilityInput {
  riderId: string;
  capabilityType: TaskType;
}

interface RiderMetricsResult {
  acceptanceRate: number;
  cancellationRate: number;
  completionRate: number;
  averageRating: number;
  totalOnlineHours: number;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
}

interface RiderWalletResult {
  walletId: string;
  balance: number;
  pendingBalance: number;
  currency: string;
  status: string;
  totalDeposited: number;
  totalWithdrawn: number;
  totalReceived: number;
  recentTransactions: Array<{
    id: string;
    transactionType: string;
    amount: number;
    description: string | null;
    status: string;
    createdAt: Date;
  }>;
}

// ============================================
// VALIDATION HELPERS
// ============================================

const PHONE_REGEX = /^(\+256|0)\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.replace(/\s/g, ''));
}

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// Default capabilities for each rider role
const DEFAULT_CAPABILITIES: Record<RiderRole, TaskType[]> = {
  SMART_BODA_RIDER: [TaskType.SMART_BODA_RIDE, TaskType.ITEM_DELIVERY],
  SMART_CAR_DRIVER: [TaskType.SMART_CAR_RIDE],
  DELIVERY_PERSONNEL: [TaskType.FOOD_DELIVERY, TaskType.SHOPPING, TaskType.ITEM_DELIVERY, TaskType.SMART_HEALTH_DELIVERY],
};

// Default vehicle types for rider roles
const DEFAULT_VEHICLE_TYPES: Record<RiderRole, VehicleType | null> = {
  SMART_BODA_RIDER: VehicleType.BODA,
  SMART_CAR_DRIVER: VehicleType.CAR,
  DELIVERY_PERSONNEL: null,
};

// ============================================
// RIDER ONBOARDING SERVICE
// ============================================

export class RiderOnboardingService {
  /**
   * Register a new rider with PENDING_APPROVAL status.
   * Creates Rider, Document, Vehicle, RiderCapability, Wallet, and audit log.
   */
  static async registerRider(data: RegisterRiderInput) {
    // Validate required fields
    if (!data.fullName || !data.phone || !data.riderRole || !data.physicalAddress) {
      throw new Error('Missing required fields: fullName, phone, riderRole, physicalAddress');
    }

    // Validate phone format
    if (!validatePhone(data.phone)) {
      throw new Error('Invalid phone format. Expected Ugandan number (+256 or 0 prefix, 10 digits)');
    }

    // Validate email format if provided
    if (data.email && !validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    const riderRole = data.riderRole as RiderRole;
    if (!['SMART_BODA_RIDER', 'SMART_CAR_DRIVER', 'DELIVERY_PERSONNEL'].includes(riderRole)) {
      throw new Error('Invalid riderRole. Must be SMART_BODA_RIDER, SMART_CAR_DRIVER, or DELIVERY_PERSONNEL');
    }

    // Check for existing rider with same phone
    const existingRider = await db.rider.findUnique({
      where: { phone: data.phone },
    });
    if (existingRider) {
      throw new Error('A rider with this phone number already exists');
    }

    // Check for existing rider profile for the same user
    if (data.userId) {
      const existingProfile = await db.rider.findUnique({
        where: { userId: data.userId },
      });
      if (existingProfile) {
        throw new Error('User already has a rider profile');
      }
    }

    // Vehicle is required for SMART_BODA_RIDER and SMART_CAR_DRIVER
    if ((riderRole === 'SMART_BODA_RIDER' || riderRole === 'SMART_CAR_DRIVER') && !data.vehicle) {
      throw new Error(`Vehicle information is required for ${riderRole}`);
    }

    // Create everything in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create rider
      const rider = await tx.rider.create({
        data: {
          userId: data.userId || 'pending_user',
          fullName: data.fullName,
          phone: data.phone,
          email: data.email || null,
          physicalAddress: data.physicalAddress,
          riderRole,
          vehicleType: DEFAULT_VEHICLE_TYPES[riderRole],
          facePhotoUrl: data.facePhotoUrl || null,
          nationalIdFrontUrl: data.nationalIdFrontUrl || null,
          nationalIdBackUrl: data.nationalIdBackUrl || null,
          driverLicenseUrl: data.driverLicenseUrl || null,
          status: RiderStatus.PENDING_APPROVAL,
        },
      });

      // 2. Create Document records
      const docPromises: Promise<unknown>[] = [];

      if (data.facePhotoUrl) {
        docPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: DocumentType.FACE_PHOTO,
              fileName: 'face_photo.jpg',
              fileUrl: data.facePhotoUrl,
              mimeType: 'image/jpeg',
              status: DocumentStatus.PENDING,
            },
          })
        );
      }

      if (data.nationalIdFrontUrl) {
        docPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: DocumentType.NATIONAL_ID_FRONT,
              fileName: 'national_id_front.jpg',
              fileUrl: data.nationalIdFrontUrl,
              mimeType: 'image/jpeg',
              status: DocumentStatus.PENDING,
            },
          })
        );
      }

      if (data.nationalIdBackUrl) {
        docPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: DocumentType.NATIONAL_ID_BACK,
              fileName: 'national_id_back.jpg',
              fileUrl: data.nationalIdBackUrl,
              mimeType: 'image/jpeg',
              status: DocumentStatus.PENDING,
            },
          })
        );
      }

      if (data.driverLicenseUrl) {
        docPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: DocumentType.DRIVERS_LICENSE,
              fileName: 'drivers_license.jpg',
              fileUrl: data.driverLicenseUrl,
              mimeType: 'image/jpeg',
              status: DocumentStatus.PENDING,
            },
          })
        );
      }

      await Promise.all(docPromises);

      // 3. Create Vehicle if applicable
      if (data.vehicle && (riderRole === 'SMART_BODA_RIDER' || riderRole === 'SMART_CAR_DRIVER')) {
        await tx.vehicle.create({
          data: {
            riderId: rider.id,
            make: data.vehicle.make,
            model: data.vehicle.model,
            year: data.vehicle.year || null,
            color: data.vehicle.color,
            plateNumber: data.vehicle.plateNumber,
            registrationDocUrl: data.vehicle.registrationDocUrl || null,
            insuranceDocUrl: data.vehicle.insuranceDocUrl || null,
            inspectionDocUrl: data.vehicle.inspectionDocUrl || null,
          },
        });
      }

      // 4. Create RiderCapability mapping based on riderRole
      const capabilities = DEFAULT_CAPABILITIES[riderRole] || [];
      for (const taskType of capabilities) {
        await tx.riderCapability.upsert({
          where: {
            riderRole_taskType: {
              riderRole,
              taskType,
            },
          },
          update: { isAllowed: true },
          create: {
            riderRole,
            taskType,
            isAllowed: true,
            requiresVehicle: riderRole === 'SMART_CAR_DRIVER' && taskType === TaskType.SMART_CAR_RIDE,
            requiresInsulatedBox: [TaskType.FOOD_DELIVERY, TaskType.SMART_HEALTH_DELIVERY].includes(taskType),
          },
        });
      }

      // 5. Create Wallet for rider
      await tx.wallet.create({
        data: {
          ownerId: rider.id,
          ownerType: WalletOwnerType.RIDER,
          balance: 0,
          pendingBalance: 0,
          currency: 'UGX',
          status: WalletStatus.ACTIVE,
        },
      });

      return rider;
    });

    // Create audit log (outside transaction to avoid blocking)
    await createAuditLog({
      action: AuditActions.RIDER_REGISTERED,
      entityType: EntityTypes.RIDER,
      entityId: result.id,
      riderId: result.id,
      actorType: 'USER',
      userId: data.userId,
      description: `New ${riderRole} registered: ${data.fullName}`,
      newValues: { status: RiderStatus.PENDING_APPROVAL, riderRole, phone: data.phone },
    });

    return result;
  }

  /**
   * Verify (approve or reject) a rider.
   * On approve: sets verifiedAt, verifiedBy, status APPROVED.
   * On reject: sets rejection reason, status REJECTED.
   */
  static async verifyRider(data: VerifyRiderInput) {
    const { riderId, adminId, action, notes, reason } = data;

    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error('Rider not found');
    }

    // Only PENDING_APPROVAL riders can be verified
    if (rider.status !== RiderStatus.PENDING_APPROVAL) {
      throw new Error(`Cannot verify rider with status ${rider.status}. Only PENDING_APPROVAL riders can be verified.`);
    }

    let newStatus: RiderStatus;
    const updateData: Record<string, unknown> = {
      verifiedBy: adminId,
      verifiedAt: new Date(),
    };

    if (action === 'APPROVE') {
      newStatus = RiderStatus.APPROVED;
    } else if (action === 'REJECT') {
      newStatus = RiderStatus.REJECTED;
      updateData.verificationNotes = reason || notes || 'Not specified';
    } else {
      throw new Error('Invalid action. Must be APPROVE or REJECT');
    }

    const updatedRider = await db.rider.update({
      where: { id: riderId },
      data: {
        status: newStatus,
        ...updateData,
      },
    });

    // If approving, update documents status as well
    if (action === 'APPROVE') {
      await db.document.updateMany({
        where: { riderId },
        data: {
          status: DocumentStatus.APPROVED,
          verifiedBy: adminId,
          verifiedAt: new Date(),
          verificationNotes: notes,
        },
      });
    }

    // Create audit log
    await createAuditLog({
      action: action === 'APPROVE' ? AuditActions.RIDER_APPROVED : AuditActions.RIDER_REJECTED,
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      riderId,
      actorType: 'ADMIN',
      actorId: adminId,
      description: `Rider ${action === 'APPROVE' ? 'approved' : 'rejected'}: ${rider.fullName}${notes ? ` — ${notes}` : ''}`,
      oldValues: { status: rider.status },
      newValues: { status: newStatus, verifiedBy: adminId },
    });

    // Create notification for rider
    const riderUser = await db.user.findUnique({
      where: { id: rider.userId },
    });

    if (riderUser) {
      await db.notification.create({
        data: {
          userId: riderUser.id,
          title: action === 'APPROVE' ? 'Verification Approved!' : 'Verification Update',
          message:
            action === 'APPROVE'
              ? 'Your rider account has been verified. You can now start accepting tasks!'
              : `Your rider application was not approved. Reason: ${reason || notes || 'Not specified'}`,
          type: 'VERIFICATION',
          referenceId: riderId,
          referenceType: 'Rider',
        },
      });
    }

    return updatedRider;
  }

  /**
   * Suspend a rider.
   * Sets status to SUSPENDED and isOnline to false.
   */
  static async suspendRider(data: SuspendRiderInput) {
    const { riderId, adminId, reason } = data;

    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error('Rider not found');
    }

    // Only APPROVED riders can be suspended
    if (rider.status !== RiderStatus.APPROVED) {
      throw new Error(`Cannot suspend rider with status ${rider.status}. Only APPROVED riders can be suspended.`);
    }

    const updatedRider = await db.rider.update({
      where: { id: riderId },
      data: {
        status: RiderStatus.SUSPENDED,
        isOnline: false,
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.RIDER_SUSPENDED,
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      riderId,
      actorType: 'ADMIN',
      actorId: adminId,
      description: `Rider suspended: ${rider.fullName} — Reason: ${reason}`,
      oldValues: { status: rider.status, isOnline: rider.isOnline },
      newValues: { status: RiderStatus.SUSPENDED, isOnline: false },
    });

    // Notify rider
    const riderUser = await db.user.findUnique({
      where: { id: rider.userId },
    });

    if (riderUser) {
      await db.notification.create({
        data: {
          userId: riderUser.id,
          title: 'Account Suspended',
          message: `Your rider account has been suspended. Reason: ${reason}`,
          type: 'SYSTEM',
          referenceId: riderId,
          referenceType: 'Rider',
        },
      });
    }

    return updatedRider;
  }

  /**
   * Assign an additional capability to a rider.
   * Validates that the rider's role supports the capability.
   */
  static async assignCapability(data: AssignCapabilityInput) {
    const { riderId, capabilityType } = data;

    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error('Rider not found');
    }

    // Check if the rider's role supports this capability
    const roleCapabilities = DEFAULT_CAPABILITIES[rider.riderRole] || [];

    // Also check if it's already defined in the database
    const existingCap = await db.riderCapability.findUnique({
      where: {
        riderRole_taskType: {
          riderRole: rider.riderRole,
          taskType: capabilityType,
        },
      },
    });

    if (!existingCap?.isAllowed && !roleCapabilities.includes(capabilityType)) {
      throw new Error(`Rider role ${rider.riderRole} does not support capability ${capabilityType}`);
    }

    // Check if capability already exists
    const alreadyExists = await db.riderCapability.findUnique({
      where: {
        riderRole_taskType: {
          riderRole: rider.riderRole,
          taskType: capabilityType,
        },
      },
    });

    if (alreadyExists?.isAllowed) {
      return alreadyExists; // Already assigned
    }

    // Create or update the capability
    const capability = await db.riderCapability.upsert({
      where: {
        riderRole_taskType: {
          riderRole: rider.riderRole,
          taskType: capabilityType,
        },
      },
      update: { isAllowed: true },
      create: {
        riderRole: rider.riderRole,
        taskType: capabilityType,
        isAllowed: true,
        requiresVehicle: capabilityType === TaskType.SMART_CAR_RIDE,
        requiresInsulatedBox: [TaskType.FOOD_DELIVERY, TaskType.SMART_HEALTH_DELIVERY].includes(capabilityType),
      },
    });

    // Create audit log
    await createAuditLog({
      action: 'RIDER_CAPABILITY_ASSIGNED',
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      riderId,
      actorType: 'ADMIN',
      description: `Capability ${capabilityType} assigned to rider ${rider.fullName} (${rider.riderRole})`,
      newValues: { taskType: capabilityType, isAllowed: true },
    });

    return capability;
  }

  /**
   * Get or calculate rider metrics from real task data.
   */
  static async getRiderMetrics(riderId: string): Promise<RiderMetricsResult> {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error('Rider not found');
    }

    // Calculate acceptance rate from DispatchMatch data
    const [totalOffered, totalAccepted, totalRejected] = await Promise.all([
      db.dispatchMatch.count({
        where: { riderId },
      }),
      db.dispatchMatch.count({
        where: { riderId, status: 'ACCEPTED' },
      }),
      db.dispatchMatch.count({
        where: { riderId, status: 'REJECTED' },
      }),
    ]);

    const acceptanceRate = totalOffered > 0 ? (totalAccepted / totalOffered) * 100 : 0;

    // Calculate cancellation and completion rates from tasks
    const completedTasks = rider.completedTrips;
    const cancelledTasks = rider.cancelledTrips;
    const totalAcceptedTasks = completedTasks + cancelledTasks;

    const cancellationRate = totalAcceptedTasks > 0 ? (cancelledTasks / totalAcceptedTasks) * 100 : 0;
    const completionRate = totalAcceptedTasks > 0 ? (completedTasks / totalAcceptedTasks) * 100 : 0;

    // Average rating from Rating table
    const ratingResult = await db.rating.aggregate({
      where: { toRiderId: riderId },
      _avg: { score: true },
      _count: { id: true },
    });

    const averageRating = ratingResult._avg.score ?? rider.rating;

    // Total online hours from HeartbeatLog
    // Each heartbeat represents ~30 seconds of online time
    const heartbeatCount = await db.heartbeatLog.count({
      where: {
        riderId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    const totalOnlineHours = (heartbeatCount * 30) / 3600; // 30s per heartbeat

    return {
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      averageRating: Math.round(averageRating * 100) / 100,
      totalOnlineHours: Math.round(totalOnlineHours * 100) / 100,
      totalTrips: rider.totalTrips,
      completedTrips: rider.completedTrips,
      cancelledTrips: rider.cancelledTrips,
    };
  }

  /**
   * Get rider wallet with balance and recent transactions.
   */
  static async getRiderWallet(riderId: string): Promise<RiderWalletResult> {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error('Rider not found');
    }

    // Find the rider's wallet
    const wallet = await db.wallet.findUnique({
      where: {
        ownerId_ownerType: {
          ownerId: riderId,
          ownerType: WalletOwnerType.RIDER,
        },
      },
    });

    if (!wallet) {
      throw new Error('Wallet not found for rider');
    }

    // Get recent transactions
    const recentTransactions = await db.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        transactionType: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      walletId: wallet.id,
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
      currency: wallet.currency,
      status: wallet.status,
      totalDeposited: wallet.totalDeposited,
      totalWithdrawn: wallet.totalWithdrawn,
      totalReceived: wallet.totalReceived,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        transactionType: t.transactionType,
        amount: t.amount,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Update rider online status.
   * Only APPROVED riders can go online.
   */
  static async updateRiderOnlineStatus(riderId: string, isOnline: boolean) {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error('Rider not found');
    }

    // Only APPROVED riders can go online
    if (isOnline && rider.status !== RiderStatus.APPROVED) {
      throw new Error(`Cannot go online with status ${rider.status}. Only APPROVED riders can go online.`);
    }

    // If going offline and rider has a current task, warn but still allow
    if (!isOnline && rider.currentTaskId) {
      // Still allow going offline but log it
    }

    const updatedRider = await db.rider.update({
      where: { id: riderId },
      data: {
        isOnline,
        connectionStatus: isOnline ? 'ACTIVE' : 'DISCONNECTED',
      },
    });

    // Create audit log
    await createAuditLog({
      action: isOnline ? AuditActions.RIDER_ONLINE : AuditActions.RIDER_OFFLINE,
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      riderId,
      actorType: 'RIDER',
      description: `Rider ${isOnline ? 'went online' : 'went offline'}: ${rider.fullName}`,
      oldValues: { isOnline: rider.isOnline, connectionStatus: rider.connectionStatus },
      newValues: { isOnline, connectionStatus: isOnline ? 'ACTIVE' : 'DISCONNECTED' },
    });

    return updatedRider;
  }

  /**
   * Reactivate a SUSPENDED rider back to APPROVED status.
   */
  static async reactivateRider(riderId: string, adminId: string) {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error('Rider not found');
    }

    if (rider.status !== RiderStatus.SUSPENDED) {
      throw new Error(`Cannot reactivate rider with status ${rider.status}. Only SUSPENDED riders can be reactivated.`);
    }

    const updatedRider = await db.rider.update({
      where: { id: riderId },
      data: {
        status: RiderStatus.APPROVED,
        isOnline: false,
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
    });

    // Create audit log
    await createAuditLog({
      action: 'RIDER_REACTIVATED',
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      riderId,
      actorType: 'ADMIN',
      actorId: adminId,
      description: `Rider reactivated: ${rider.fullName}`,
      oldValues: { status: rider.status },
      newValues: { status: RiderStatus.APPROVED },
    });

    return updatedRider;
  }
}

export default RiderOnboardingService;
