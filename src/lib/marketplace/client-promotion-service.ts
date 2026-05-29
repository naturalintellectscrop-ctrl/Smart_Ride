// Client Promotion Fulfillment Service
// Handles client participation in promotions, cashback, and rewards

import { db } from '@/lib/db';
import { PromotionStatus, ClientPromotionStatus, PromotionType } from '@prisma/client';
import { createNotification } from '@/lib/services/notification.service';
import { creditCashbackToWallet, refundToWallet } from '@/lib/wallet/wallet-service';

// ============================================
// TYPES
// ============================================

export interface PromotionProgress {
  promotionId: string;
  promotionName: string;
  promotionType: PromotionType;
  promoCode: string;
  
  // Discount details
  discountPercent: number | null;
  discountAmount: number | null;
  maxDiscount: number | null;
  
  // Usage
  timesUsed: number;
  maxUsesPerUser: number | null;
  
  // Savings
  totalSaved: number;
  cashbackEarned: number;
  cashbackPending: number;
  
  // Timing
  endTime: Date;
  timeRemaining: number;
  
  // Status
  status: ClientPromotionStatus;
  isActive: boolean;
}

export interface ApplyPromotionInput {
  promotionId: string;
  userId: string;
  orderId: string;
  orderType: 'TASK' | 'ORDER' | 'HEALTH_ORDER';
  orderAmount: number;
  discountAmount: number;
}

export interface OrderCompletionData {
  userId: string;
  orderId: string;
  orderType: 'TASK' | 'ORDER' | 'HEALTH_ORDER';
  orderAmount: number;
  discountApplied: number;
  promotionId?: string;
  promoCode?: string;
}

// ============================================
// PROMOTION APPLICATION
// ============================================

/**
 * Get available promotions for a user
 */
export async function getAvailablePromotions(userId: string): Promise<PromotionProgress[]> {
  const now = new Date();

  // Get all active promotions
  const promotions = await db.riderPromotion.findMany({
    where: {
      status: PromotionStatus.ACTIVE,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: { zone: true },
  });

  // Get user's participations
  const participations = await db.clientPromotionParticipation.findMany({
    where: { userId },
  });

  const participationMap = new Map(participations.map(p => [p.promotionId, p]));

  const result: PromotionProgress[] = [];

  for (const promo of promotions) {
    const participation = participationMap.get(promo.id);

    // Check if user has exceeded max uses
    if (promo.maxUsesPerUser && participation && participation.timesUsed >= promo.maxUsesPerUser) {
      continue;
    }

    const progress: PromotionProgress = {
      promotionId: promo.id,
      promotionName: promo.name,
      promotionType: promo.promotionType,
      promoCode: promo.promoCode,
      discountPercent: promo.discountPercent,
      discountAmount: promo.discountAmount,
      maxDiscount: promo.maxDiscount,
      timesUsed: participation?.timesUsed || 0,
      maxUsesPerUser: promo.maxUsesPerUser,
      totalSaved: participation?.totalSaved || 0,
      cashbackEarned: participation?.cashbackEarned || 0,
      cashbackPending: 0,
      endTime: promo.endTime,
      timeRemaining: Math.max(0, (promo.endTime.getTime() - now.getTime()) / 1000),
      status: participation?.status || ClientPromotionStatus.ACTIVE,
      isActive: true,
    };

    result.push(progress);
  }

  return result;
}

/**
 * Apply promotion to an order
 */
export async function applyPromotionToOrder(input: ApplyPromotionInput): Promise<{
  success: boolean;
  finalDiscount: number;
  cashbackAmount?: number;
  participation?: { id: string; timesUsed: number };
  error?: string;
}> {
  try {
    // Get promotion
    const promotion = await db.riderPromotion.findUnique({
      where: { id: input.promotionId },
    });

    if (!promotion) {
      return { success: false, finalDiscount: 0, error: 'Promotion not found' };
    }

    // Check if promotion is active
    if (promotion.status !== PromotionStatus.ACTIVE) {
      return { success: false, finalDiscount: 0, error: 'Promotion is not active' };
    }

    // Check timing
    const now = new Date();
    if (now < promotion.startTime || now > promotion.endTime) {
      return { success: false, finalDiscount: 0, error: 'Promotion has expired' };
    }

    // Check valid days if specified
    if (promotion.validDays) {
      const validDays = JSON.parse(promotion.validDays);
      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      if (!validDays.includes(dayNames[now.getDay()])) {
        return { success: false, finalDiscount: 0, error: 'Promotion not valid today' };
      }
    }

    // Check valid hours if specified
    if (promotion.validHoursStart !== null && promotion.validHoursEnd !== null) {
      const hour = now.getHours();
      if (hour < promotion.validHoursStart || hour >= promotion.validHoursEnd) {
        return { success: false, finalDiscount: 0, error: 'Promotion not valid at this time' };
      }
    }

    // Check minimum order value
    if (promotion.minOrderValue && input.orderAmount < promotion.minOrderValue) {
      return { success: false, finalDiscount: 0, error: `Minimum order value is ${promotion.minOrderValue}` };
    }

    // Check max uses globally
    if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
      return { success: false, finalDiscount: 0, error: 'Promotion has reached maximum uses' };
    }

    // Get or create participation
    let participation = await db.clientPromotionParticipation.findUnique({
      where: {
        promotionId_userId: { promotionId: input.promotionId, userId: input.userId },
      },
    });

    // Check max uses per user
    if (participation && promotion.maxUsesPerUser && participation.timesUsed >= promotion.maxUsesPerUser) {
      return { success: false, finalDiscount: 0, error: 'You have reached the maximum uses for this promotion' };
    }

    // Calculate final discount (cap at maxDiscount)
    let finalDiscount = input.discountAmount;
    if (promotion.maxDiscount && finalDiscount > promotion.maxDiscount) {
      finalDiscount = promotion.maxDiscount;
    }

    // Calculate cashback if applicable
    let cashbackAmount = 0;
    if (promotion.promotionType === PromotionType.CASHBACK && promotion.discountPercent) {
      cashbackAmount = (input.orderAmount - finalDiscount) * (promotion.discountPercent / 100);
    }

    // Update or create participation
    if (participation) {
      participation = await db.clientPromotionParticipation.update({
        where: { id: participation.id },
        data: {
          timesUsed: { increment: 1 },
          totalSaved: { increment: finalDiscount },
          lastUsedAt: now,
          usedOnOrders: {
            set: JSON.stringify([
              ...(JSON.parse(participation.usedOnOrders || '[]') as string[]),
              input.orderId,
            ]),
          },
        },
      });
    } else {
      participation = await db.clientPromotionParticipation.create({
        data: {
          promotionId: input.promotionId,
          userId: input.userId,
          promoCode: promotion.promoCode,
          timesUsed: 1,
          totalSaved: finalDiscount,
          totalSpent: input.orderAmount,
          firstUsedAt: now,
          lastUsedAt: now,
          usedOnOrders: JSON.stringify([input.orderId]),
          status: ClientPromotionStatus.ACTIVE,
        },
      });
    }

    // Update promotion usage count
    await db.riderPromotion.update({
      where: { id: input.promotionId },
      data: {
        currentUses: { increment: 1 },
        totalSavings: { increment: finalDiscount },
        totalRides: { increment: 1 },
      },
    });

    return {
      success: true,
      finalDiscount,
      cashbackAmount,
      participation: { id: participation.id, timesUsed: participation.timesUsed },
    };
  } catch (error) {
    console.error('Error applying promotion:', error);
    return { success: false, finalDiscount: 0, error: 'Failed to apply promotion' };
  }
}

/**
 * Process order completion for cashback/promotions
 */
export async function processOrderCompletion(data: OrderCompletionData): Promise<void> {
  try {
    if (!data.promotionId) return;

    // Get participation
    const participation = await db.clientPromotionParticipation.findFirst({
      where: {
        promotionId: data.promotionId,
        userId: data.userId,
      },
      include: { promotion: true },
    });

    if (!participation) return;

    // Process cashback if applicable
    if (participation.promotion.promotionType === PromotionType.CASHBACK && 
        participation.promotion.discountPercent) {
      
      const cashbackAmount = data.orderAmount * (participation.promotion.discountPercent / 100);
      
      if (cashbackAmount > 0) {
        // Credit cashback to wallet
        await creditCashbackToWallet({
          ownerId: data.userId,
          ownerType: 'USER',
          amount: cashbackAmount,
          referenceId: data.orderId,
          referenceType: data.orderType,
          description: `Cashback from ${participation.promotion.name}`,
        });

        // Update participation
        await db.clientPromotionParticipation.update({
          where: { id: participation.id },
          data: {
            cashbackEarned: { increment: cashbackAmount },
            cashbackCreditedAt: new Date(),
          },
        });

        // Notify user
        await createNotification({
          userId: data.userId,
          title: '💰 Cashback Credited!',
          message: `You received ${formatCurrency(cashbackAmount)} cashback from your recent order. It has been added to your wallet.`,
          type: 'PAYMENT',
          referenceId: data.orderId,
          referenceType: 'CASHBACK',
        });
      }
    }

    // Update total spent
    await db.clientPromotionParticipation.update({
      where: { id: participation.id },
      data: {
        totalSpent: { increment: data.orderAmount },
      },
    });
  } catch (error) {
    console.error('Error processing order completion for promotions:', error);
  }
}

/**
 * Validate promo code
 */
export async function validatePromoCode(
  promoCode: string,
  userId: string,
  orderAmount: number
): Promise<{
  valid: boolean;
  promotion?: {
    id: string;
    name: string;
    type: PromotionType;
    discountPercent: number | null;
    discountAmount: number | null;
    maxDiscount: number | null;
    minOrderValue: number | null;
  };
  estimatedDiscount: number;
  estimatedCashback: number;
  error?: string;
}> {
  try {
    const promotion = await db.riderPromotion.findUnique({
      where: { promoCode },
    });

    if (!promotion) {
      return { valid: false, estimatedDiscount: 0, estimatedCashback: 0, error: 'Invalid promo code' };
    }

    // Check status
    if (promotion.status !== PromotionStatus.ACTIVE) {
      return { valid: false, estimatedDiscount: 0, estimatedCashback: 0, error: 'Promotion is not active' };
    }

    // Check timing
    const now = new Date();
    if (now < promotion.startTime || now > promotion.endTime) {
      return { valid: false, estimatedDiscount: 0, estimatedCashback: 0, error: 'Promotion has expired' };
    }

    // Check minimum order value
    if (promotion.minOrderValue && orderAmount < promotion.minOrderValue) {
      return { valid: false, estimatedDiscount: 0, estimatedCashback: 0, error: `Minimum order value is ${formatCurrency(promotion.minOrderValue)}` };
    }

    // Check max uses globally
    if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
      return { valid: false, estimatedDiscount: 0, estimatedCashback: 0, error: 'Promotion has reached maximum uses' };
    }

    // Check user's usage count
    const participation = await db.clientPromotionParticipation.findUnique({
      where: {
        promotionId_userId: { promotionId: promotion.id, userId },
      },
    });

    if (participation && promotion.maxUsesPerUser && participation.timesUsed >= promotion.maxUsesPerUser) {
      return { valid: false, estimatedDiscount: 0, estimatedCashback: 0, error: 'You have already used this promotion the maximum number of times' };
    }

    // Calculate estimated discount
    let estimatedDiscount = 0;
    if (promotion.discountPercent) {
      estimatedDiscount = orderAmount * (promotion.discountPercent / 100);
    } else if (promotion.discountAmount) {
      estimatedDiscount = promotion.discountAmount;
    }

    // Cap at max discount
    if (promotion.maxDiscount && estimatedDiscount > promotion.maxDiscount) {
      estimatedDiscount = promotion.maxDiscount;
    }

    // Calculate estimated cashback
    let estimatedCashback = 0;
    if (promotion.promotionType === PromotionType.CASHBACK && promotion.discountPercent) {
      estimatedCashback = (orderAmount - estimatedDiscount) * (promotion.discountPercent / 100);
    }

    return {
      valid: true,
      promotion: {
        id: promotion.id,
        name: promotion.name,
        type: promotion.promotionType,
        discountPercent: promotion.discountPercent,
        discountAmount: promotion.discountAmount,
        maxDiscount: promotion.maxDiscount,
        minOrderValue: promotion.minOrderValue,
      },
      estimatedDiscount,
      estimatedCashback,
    };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return { valid: false, estimatedDiscount: 0, estimatedCashback: 0, error: 'Failed to validate promo code' };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// EXPORTS
// ============================================

export {
  getAvailablePromotions,
  applyPromotionToOrder,
  processOrderCompletion,
  validatePromoCode,
};
