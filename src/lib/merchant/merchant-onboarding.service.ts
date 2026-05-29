/**
 * Smart Ride - Merchant Onboarding Service
 *
 * Handles merchant registration, verification, suspension, availability, and analytics.
 * All data operations use real database queries via Prisma.
 */

import { db } from '@/lib/db';
import { MerchantStatus, MerchantType, DocumentType, DocumentStatus } from '@prisma/client';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

// ============================================
// TYPES
// ============================================

interface RegisterMerchantInput {
  name: string;
  type: MerchantType | string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  openingTime?: string;
  closingTime?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  documents?: {
    businessLicense?: string;
    nationalIdFront?: string;
    nationalIdBack?: string;
    logo?: string;
  };
}

interface VerifyMerchantInput {
  merchantId: string;
  adminId: string;
  action: 'APPROVE' | 'REJECT';
  notes?: string;
  reason?: string;
}

interface SuspendMerchantInput {
  merchantId: string;
  adminId: string;
  reason: string;
}

interface UpdateAvailabilityInput {
  merchantId: string;
  isOpen: boolean;
}

interface PauseMerchantInput {
  merchantId: string;
  reason?: string;
}

interface MerchantAnalytics {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    monthlyChange: number;
  };
  orders: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    monthlyChange: number;
  };
  orderTrends: Array<{
    date: string;
    count: number;
  }>;
  popularProducts: Array<{
    id: string;
    name: string;
    category: string | null;
    totalSold: number;
    revenue: number;
  }>;
  deliveryMetrics: {
    avgDeliveryTimeMinutes: number | null;
    completedDeliveries: number;
    cancelledDeliveries: number;
  };
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

// ============================================
// MERCHANT ONBOARDING SERVICE
// ============================================

export class MerchantOnboardingService {
  /**
   * Register a new merchant with PENDING_APPROVAL status.
   * Validates required fields, creates Merchant + Document records, and audit log.
   */
  static async registerMerchant(data: RegisterMerchantInput) {
    // Validate required fields
    if (!data.name || !data.type || !data.phone || !data.address || !data.city) {
      throw new Error('Missing required fields: name, type, phone, address, city');
    }

    // Validate phone format
    if (!validatePhone(data.phone)) {
      throw new Error('Invalid phone format. Expected Ugandan number (+256 or 0 prefix, 10 digits)');
    }

    // Validate email format if provided
    if (data.email && !validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Check if merchant with same phone already exists
    const existingMerchant = await db.merchant.findFirst({
      where: { phone: data.phone },
    });
    if (existingMerchant) {
      throw new Error('A merchant with this phone number already exists');
    }

    // Check if merchant with same name already exists
    const existingName = await db.merchant.findFirst({
      where: { name: data.name },
    });
    if (existingName) {
      throw new Error('A merchant with this name already exists');
    }

    // Create merchant with PENDING_APPROVAL status
    const merchant = await db.merchant.create({
      data: {
        name: data.name,
        type: data.type as MerchantType,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        description: data.description || null,
        openingTime: data.openingTime || null,
        closingTime: data.closingTime || null,
        bankName: data.bankName || null,
        bankAccountName: data.bankAccountName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        logoUrl: data.logoUrl || null,
        coverImageUrl: data.coverImageUrl || null,
        status: MerchantStatus.PENDING_APPROVAL,
        isOpen: false,
      },
    });

    // Create Document records for uploaded documents
    const docPromises: Promise<unknown>[] = [];

    if (data.documents?.businessLicense) {
      docPromises.push(
        db.document.create({
          data: {
            merchantId: merchant.id,
            documentType: DocumentType.BUSINESS_LICENSE,
            fileName: 'business_license.jpg',
            fileUrl: data.documents.businessLicense,
            fileSize: Buffer.byteLength(data.documents.businessLicense, 'base64'),
            mimeType: 'image/jpeg',
            status: DocumentStatus.PENDING,
          },
        })
      );
    }

    if (data.documents?.nationalIdFront) {
      docPromises.push(
        db.document.create({
          data: {
            merchantId: merchant.id,
            documentType: DocumentType.NATIONAL_ID_FRONT,
            fileName: 'national_id_front.jpg',
            fileUrl: data.documents.nationalIdFront,
            fileSize: Buffer.byteLength(data.documents.nationalIdFront, 'base64'),
            mimeType: 'image/jpeg',
            status: DocumentStatus.PENDING,
          },
        })
      );
    }

    if (data.documents?.nationalIdBack) {
      docPromises.push(
        db.document.create({
          data: {
            merchantId: merchant.id,
            documentType: DocumentType.NATIONAL_ID_BACK,
            fileName: 'national_id_back.jpg',
            fileUrl: data.documents.nationalIdBack,
            fileSize: Buffer.byteLength(data.documents.nationalIdBack, 'base64'),
            mimeType: 'image/jpeg',
            status: DocumentStatus.PENDING,
          },
        })
      );
    }

    if (data.documents?.logo) {
      docPromises.push(
        db.document.create({
          data: {
            merchantId: merchant.id,
            documentType: DocumentType.OTHER,
            fileName: 'logo.jpg',
            fileUrl: data.documents.logo,
            fileSize: Buffer.byteLength(data.documents.logo, 'base64'),
            mimeType: 'image/jpeg',
            status: DocumentStatus.PENDING,
            description: 'Merchant logo',
          },
        })
      );
    }

    await Promise.all(docPromises);

    // Create audit log
    await createAuditLog({
      action: AuditActions.MERCHANT_REGISTERED,
      entityType: EntityTypes.MERCHANT,
      entityId: merchant.id,
      merchantId: merchant.id,
      actorType: 'MERCHANT',
      description: `New merchant registration: ${data.name} (${data.type})`,
      newValues: { status: MerchantStatus.PENDING_APPROVAL, name: data.name, type: data.type },
    });

    return merchant;
  }

  /**
   * Verify (approve or reject) a merchant.
   * On approve: sets verifiedAt, verifiedBy, status APPROVED.
   * On reject: sets rejection reason, status REJECTED.
   */
  static async verifyMerchant(data: VerifyMerchantInput) {
    const { merchantId, adminId, action, notes, reason } = data;

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Only PENDING_APPROVAL merchants can be verified
    if (merchant.status !== MerchantStatus.PENDING_APPROVAL) {
      throw new Error(`Cannot verify merchant with status ${merchant.status}. Only PENDING_APPROVAL merchants can be verified.`);
    }

    let newStatus: MerchantStatus;
    const updateData: Record<string, unknown> = {
      verifiedBy: adminId,
      verifiedAt: new Date(),
    };

    if (action === 'APPROVE') {
      newStatus = MerchantStatus.APPROVED;
      updateData.isOpen = true;
    } else if (action === 'REJECT') {
      newStatus = MerchantStatus.REJECTED;
      updateData.rejectionReason = reason || notes || 'Not specified';
    } else {
      throw new Error('Invalid action. Must be APPROVE or REJECT');
    }

    // Update merchant status
    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        status: newStatus,
        ...updateData,
      },
    });

    // If approving, update documents status as well
    if (action === 'APPROVE') {
      await db.document.updateMany({
        where: { merchantId },
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
      action: action === 'APPROVE' ? AuditActions.MERCHANT_APPROVED : AuditActions.MERCHANT_REJECTED,
      entityType: EntityTypes.MERCHANT,
      entityId: merchantId,
      merchantId,
      actorType: 'ADMIN',
      actorId: adminId,
      description: `Merchant ${action === 'APPROVE' ? 'approved' : 'rejected'}: ${merchant.name}${notes ? ` — ${notes}` : ''}`,
      oldValues: { status: merchant.status },
      newValues: { status: newStatus, verifiedBy: adminId },
    });

    // Create notification for merchant user
    const merchantUser = await db.user.findFirst({
      where: {
        phone: merchant.phone,
        role: 'MERCHANT',
      },
    });

    if (merchantUser) {
      await db.notification.create({
        data: {
          userId: merchantUser.id,
          title: action === 'APPROVE' ? 'Verification Approved!' : 'Verification Update',
          message:
            action === 'APPROVE'
              ? 'Your merchant account has been verified. You can now start receiving orders!'
              : `Your merchant application was not approved. Reason: ${reason || notes || 'Not specified'}`,
          type: 'VERIFICATION',
          referenceId: merchantId,
          referenceType: 'Merchant',
        },
      });
    }

    return updatedMerchant;
  }

  /**
   * Suspend an approved merchant.
   * Sets status to SUSPENDED and isOpen to false.
   */
  static async suspendMerchant(data: SuspendMerchantInput) {
    const { merchantId, adminId, reason } = data;

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Only APPROVED merchants can be suspended
    if (merchant.status !== MerchantStatus.APPROVED) {
      throw new Error(`Cannot suspend merchant with status ${merchant.status}. Only APPROVED merchants can be suspended.`);
    }

    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        status: MerchantStatus.SUSPENDED,
        isOpen: false,
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.MERCHANT_SUSPENDED,
      entityType: EntityTypes.MERCHANT,
      entityId: merchantId,
      merchantId,
      actorType: 'ADMIN',
      actorId: adminId,
      description: `Merchant suspended: ${merchant.name} — Reason: ${reason}`,
      oldValues: { status: merchant.status, isOpen: merchant.isOpen },
      newValues: { status: MerchantStatus.SUSPENDED, isOpen: false },
    });

    // Notify merchant user
    const merchantUser = await db.user.findFirst({
      where: {
        phone: merchant.phone,
        role: 'MERCHANT',
      },
    });

    if (merchantUser) {
      await db.notification.create({
        data: {
          userId: merchantUser.id,
          title: 'Account Suspended',
          message: `Your merchant account has been suspended. Reason: ${reason}`,
          type: 'SYSTEM',
          referenceId: merchantId,
          referenceType: 'Merchant',
        },
      });
    }

    return updatedMerchant;
  }

  /**
   * Update merchant availability (open/close store).
   * Only APPROVED merchants can open.
   */
  static async updateMerchantAvailability(data: UpdateAvailabilityInput) {
    const { merchantId, isOpen } = data;

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Only APPROVED merchants can open
    if (isOpen && merchant.status !== MerchantStatus.APPROVED) {
      throw new Error(`Cannot open store for merchant with status ${merchant.status}. Only APPROVED merchants can open.`);
    }

    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: { isOpen },
    });

    // Create audit log
    await createAuditLog({
      action: isOpen ? 'MERCHANT_OPENED' : 'MERCHANT_CLOSED',
      entityType: EntityTypes.MERCHANT,
      entityId: merchantId,
      merchantId,
      actorType: 'MERCHANT',
      description: `Merchant ${isOpen ? 'opened' : 'closed'} store: ${merchant.name}`,
      oldValues: { isOpen: merchant.isOpen },
      newValues: { isOpen },
    });

    return updatedMerchant;
  }

  /**
   * Pause a merchant (temporarily sets isOpen=false but keeps APPROVED status).
   */
  static async pauseMerchant(data: PauseMerchantInput) {
    const { merchantId, reason } = data;

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Only APPROVED merchants can be paused
    if (merchant.status !== MerchantStatus.APPROVED) {
      throw new Error(`Cannot pause merchant with status ${merchant.status}. Only APPROVED merchants can be paused.`);
    }

    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: { isOpen: false },
    });

    // Create audit log
    await createAuditLog({
      action: 'MERCHANT_PAUSED',
      entityType: EntityTypes.MERCHANT,
      entityId: merchantId,
      merchantId,
      actorType: 'MERCHANT',
      description: `Merchant paused: ${merchant.name}${reason ? ` — Reason: ${reason}` : ''}`,
      oldValues: { isOpen: merchant.isOpen },
      newValues: { isOpen: false },
    });

    return updatedMerchant;
  }

  /**
   * Reactivate a SUSPENDED merchant back to APPROVED status.
   */
  static async reactivateMerchant(merchantId: string, adminId: string) {
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (merchant.status !== MerchantStatus.SUSPENDED) {
      throw new Error(`Cannot reactivate merchant with status ${merchant.status}. Only SUSPENDED merchants can be reactivated.`);
    }

    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        status: MerchantStatus.APPROVED,
        isOpen: false,
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
    });

    // Create audit log
    await createAuditLog({
      action: 'MERCHANT_REACTIVATED',
      entityType: EntityTypes.MERCHANT,
      entityId: merchantId,
      merchantId,
      actorType: 'ADMIN',
      actorId: adminId,
      description: `Merchant reactivated: ${merchant.name}`,
      oldValues: { status: merchant.status },
      newValues: { status: MerchantStatus.APPROVED },
    });

    return updatedMerchant;
  }

  /**
   * Get merchant analytics with real database queries.
   * Includes: revenue summaries, order trends, popular products, delivery metrics.
   */
  static async getMerchantAnalytics(merchantId: string): Promise<MerchantAnalytics> {
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Revenue summaries from FinanceLog
    const [totalRevenueResult, thisMonthRevenueResult, lastMonthRevenueResult] = await Promise.all([
      db.financeLog.aggregate({
        where: { merchantId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      db.financeLog.aggregate({
        where: {
          merchantId,
          status: 'COMPLETED',
          createdAt: { gte: thisMonthStart },
        },
        _sum: { amount: true },
      }),
      db.financeLog.aggregate({
        where: {
          merchantId,
          status: 'COMPLETED',
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    const thisMonthRevenue = thisMonthRevenueResult._sum.amount || 0;
    const lastMonthRevenue = lastMonthRevenueResult._sum.amount || 0;
    const monthlyChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0 ? 100 : 0;

    // Order counts
    const [totalOrders, thisMonthOrders, lastMonthOrders] = await Promise.all([
      db.order.count({ where: { merchantId } }),
      db.order.count({ where: { merchantId, createdAt: { gte: thisMonthStart } } }),
      db.order.count({ where: { merchantId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    ]);

    const orderMonthlyChange = lastMonthOrders > 0
      ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
      : thisMonthOrders > 0 ? 100 : 0;

    // Order trends - count orders by day for last 30 days
    const ordersLast30Days = await db.order.findMany({
      where: {
        merchantId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    // Group orders by date
    const orderTrendMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      orderTrendMap.set(dateStr, 0);
    }

    for (const order of ordersLast30Days) {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      const current = orderTrendMap.get(dateStr) || 0;
      orderTrendMap.set(dateStr, current + 1);
    }

    const orderTrends = Array.from(orderTrendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Popular products - top selling MenuItems from OrderItem
    const popularItems = await db.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: { merchantId },
        menuItemId: { not: null },
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    // Get menu item details for the popular items
    const menuItemIds = popularItems.map((item) => item.menuItemId!).filter(Boolean);
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true, category: true },
    });

    const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));

    const popularProducts = popularItems
      .filter((item) => item.menuItemId && menuItemMap.has(item.menuItemId))
      .map((item) => {
        const mi = menuItemMap.get(item.menuItemId!)!;
        return {
          id: mi.id,
          name: mi.name,
          category: mi.category,
          totalSold: item._sum.quantity || 0,
          revenue: item._sum.totalPrice || 0,
        };
      });

    // Delivery metrics - avg delivery time from tasks
    const completedTasks = await db.task.findMany({
      where: {
        order: { merchantId },
        status: 'COMPLETED',
        completedAt: { not: null },
        createdAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
      take: 100,
      orderBy: { completedAt: 'desc' },
    });

    let totalDeliveryMinutes = 0;
    let validDeliveryCount = 0;
    for (const task of completedTasks) {
      if (task.completedAt && task.createdAt) {
        const diffMs = task.completedAt.getTime() - task.createdAt.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        // Filter out unreasonable values (> 24 hours)
        if (diffMinutes > 0 && diffMinutes < 1440) {
          totalDeliveryMinutes += diffMinutes;
          validDeliveryCount++;
        }
      }
    }

    const avgDeliveryTimeMinutes = validDeliveryCount > 0
      ? Math.round(totalDeliveryMinutes / validDeliveryCount)
      : null;

    const [completedDeliveries, cancelledDeliveries] = await Promise.all([
      db.task.count({
        where: {
          order: { merchantId },
          status: 'COMPLETED',
        },
      }),
      db.task.count({
        where: {
          order: { merchantId },
          status: 'CANCELLED',
        },
      }),
    ]);

    return {
      revenue: {
        total: totalRevenueResult._sum.amount || 0,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        monthlyChange: Math.round(monthlyChange * 100) / 100,
      },
      orders: {
        total: totalOrders,
        thisMonth: thisMonthOrders,
        lastMonth: lastMonthOrders,
        monthlyChange: Math.round(orderMonthlyChange * 100) / 100,
      },
      orderTrends,
      popularProducts,
      deliveryMetrics: {
        avgDeliveryTimeMinutes,
        completedDeliveries,
        cancelledDeliveries,
      },
    };
  }
}

export default MerchantOnboardingService;
