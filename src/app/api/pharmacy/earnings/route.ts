/**
 * Pharmacy earnings.
 *
 * SECURITY: same shape as the merchant earnings route — no authentication at
 * all, under setServiceRoleContext(). `summary`, `transactions` and
 * `analytics` aggregate every health provider on the platform; `providers`
 * and `payouts` take providerId straight from the query string. Both were
 * readable by anyone who knew the URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import { toNumber } from '@/lib/decimal-utils';

/**
 * Actions that aggregate across every provider on the platform.
 *
 * `summary` is deliberately NOT in this set. The mobile pharmacy app calls it
 * for its own earnings screen, and it used to answer with platform-wide totals
 * — every pharmacy was shown Smart Ride's whole health revenue as if it were
 * their own takings. It is now scoped to the caller below, so it is a
 * per-provider figure for a provider and a platform figure for an admin.
 */
const PLATFORM_WIDE_ACTIONS = new Set(['transactions', 'analytics']);

// GET - Fetch pharmacy earnings and financial data
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.statusCode || 401 }
    );
  }
  const user = auth.user;
  const admin = isAdmin(user.role);

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'summary';

  if (PLATFORM_WIDE_ACTIONS.has(action) && !admin) {
    return NextResponse.json(
      { success: false, error: 'Platform-wide earnings are restricted to administrators' },
      { status: 403 }
    );
  }

  await setServiceRoleContext();
  try {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Pinned to the caller's own pharmacy unless they are an admin.
    let providerId = searchParams.get('providerId');
    if (!admin) {
      const own = await db.healthProvider.findUnique({
        where: { userId: user.userId },
        select: { id: true },
      });
      if (!own) {
        return NextResponse.json(
          { success: false, error: 'No health provider account for this user' },
          { status: 403 }
        );
      }
      if (providerId && providerId !== own.id) {
        return NextResponse.json(
          { success: false, error: 'These earnings belong to another provider' },
          { status: 403 }
        );
      }
      providerId = own.id;
    }

    switch (action) {
      case 'summary':
        // providerId is null only for an admin who named no provider, which
        // is the one case that legitimately means "the whole platform".
        return await getEarningsSummary(providerId, startDate, endDate);

      case 'providers':
        return await getProviderEarnings(providerId, startDate, endDate);
      
      case 'transactions':
        return await getTransactionHistory(startDate, endDate);
      
      case 'payouts':
        return await getPayoutHistory(providerId);
      
      case 'analytics':
        return await getEarningsAnalytics(startDate, endDate);
      
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Pharmacy earnings API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch pharmacy earnings' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST - Record payout or update earnings
export async function POST(request: NextRequest) {
  // Payouts move money; commission rates change every future settlement.
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.statusCode || 401 }
    );
  }
  if (!isAdmin(auth.user.role)) {
    return NextResponse.json(
      { success: false, error: 'Administrator access required' },
      { status: 403 }
    );
  }

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'record-payout':
        return await recordPayout(body);
      
      case 'update-commission':
        return await updateCommissionRate(body);
      
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Pharmacy earnings POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// Get overall earnings summary for pharmacy service
async function getEarningsSummary(
  providerId?: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  // PHARM-13: read the table the orders are actually in.
  //
  // This summed `db.healthOrder`, which has zero rows platform-wide — real
  // pharmacy orders are ProviderOrder, and have been since the provider API was
  // written. So a pharmacy that had delivered and been paid for orders opened
  // its earnings screen and was shown UGX 0 across every figure, with an empty
  // transaction list underneath. Same wrong-table mistake that made the orders
  // screen and the catalogue look empty.
  const orders = await db.providerOrder.findMany({
    where: {
      status: 'DELIVERED',
      ...(Object.keys(dateFilter).length > 0 ? { deliveredAt: dateFilter } : {}),
      ...(providerId ? { providerId } : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      totalAmount: true,
      subtotal: true,
      deliveryFee: true,
      serviceFee: true,
      providerEarnings: true,
      paymentMethod: true,
      deliveredAt: true,
      createdAt: true,
    },
    orderBy: { deliveredAt: 'desc' },
  });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + toNumber(o.totalAmount), 0);
  const totalDeliveryFees = orders.reduce((sum, o) => sum + toNumber(o.deliveryFee), 0);
  const totalServiceFees = orders.reduce((sum, o) => sum + toNumber(o.serviceFee), 0);

  // providerEarnings is stored on the order at the moment it is placed, using
  // the provider's commission rate as it stood then. Recomputing it from the
  // rate today would silently restate history every time a rate changed.
  const totalProviderEarnings = orders.reduce((sum, o) => sum + toNumber(o.providerEarnings), 0);
  const totalPlatformCommission = totalRevenue - totalProviderEarnings - totalDeliveryFees;

  const activeProviders = await db.healthProvider.count({
    where: { verificationStatus: 'APPROVED', isOpenNow: true },
  });
  const totalProviders = await db.healthProvider.count({
    where: { verificationStatus: 'APPROVED' },
  });

  // Withdrawable balance. This aggregated EVERY pharmacy's pendingPayout with
  // no provider filter, so each pharmacy was shown the platform's entire
  // outstanding payout pool as its own available balance — both wrong and a
  // leak of what other pharmacies are owed.
  const pendingPayouts = await db.healthProvider.aggregate({
    _sum: { pendingPayout: true },
    where: providerId ? { id: providerId } : { pendingPayout: { gt: 0 } },
  });
  const availableBalance = toNumber(pendingPayouts._sum.pendingPayout);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysOrders = orders.filter(
    (o) => o.deliveredAt && new Date(o.deliveredAt) >= startOfToday
  );
  // The pharmacy's own take, not the customer's total — this reported
  // totalAmount, which includes the delivery fee the courier is paid from.
  const todayEarnings = todaysOrders.reduce((sum, o) => sum + toNumber(o.providerEarnings), 0);

  const since = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const sumSince = (days: number) =>
    orders
      .filter((o) => o.deliveredAt && new Date(o.deliveredAt) >= since(days))
      .reduce((sum, o) => sum + toNumber(o.providerEarnings), 0);

  const prescriptionOrders = orders.filter((o) => o.orderType === 'PRESCRIPTION_MEDICINE');
  const otcOrders = orders.filter((o) => o.orderType !== 'PRESCRIPTION_MEDICINE');

  return NextResponse.json({
    success: true,
    summary: {
      totalOrders,
      totalRevenue,
      totalDeliveryFees,
      totalServiceFees,
      totalProviderEarnings,
      totalPlatformCommission: totalPlatformCommission > 0 ? totalPlatformCommission : 0,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      todayEarnings,
      todayOrders: todaysOrders.length,
      weekEarnings: sumSince(6),
      monthEarnings: sumSince(29),
    },
    // The screen reads these at the top level.
    totalEarnings: totalProviderEarnings,
    todayEarnings,
    weekEarnings: sumSince(6),
    monthEarnings: sumSince(29),
    availableBalance,
    pendingPayouts: availableBalance,
    providers: { total: totalProviders, active: activeProviders },
    transactions: orders.slice(0, 30).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      amount: toNumber(o.providerEarnings),
      orderTotal: toNumber(o.totalAmount),
      paymentMethod: o.paymentMethod,
      date: o.deliveredAt ?? o.createdAt,
      type: o.orderType,
    })),
    orderTypes: {
      prescription: {
        count: prescriptionOrders.length,
        revenue: prescriptionOrders.reduce((sum, o) => sum + toNumber(o.totalAmount), 0),
      },
      otc: {
        count: otcOrders.length,
        revenue: otcOrders.reduce((sum, o) => sum + toNumber(o.totalAmount), 0),
      },
    },
  });
}

// Get earnings for each provider
async function getProviderEarnings(providerId?: string | null, startDate?: string | null, endDate?: string | null) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  if (providerId) {
    // Get single provider earnings
    const provider = await db.healthProvider.findUnique({
      where: { id: providerId },
      include: {
        healthOrders: {
          where: {
            createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
            status: 'DELIVERED',
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json({ success: false, error: 'Provider not found' }, { status: 404 });
    }

    const orders = provider.healthOrders;
    const totalRevenue = orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);
    const providerEarnings = orders.reduce((sum, order) => {
      return sum + toNumber(order.subtotal) * (1 - provider.commissionRate);
    }, 0);
    const platformCommission = orders.reduce((sum, order) => {
      return sum + toNumber(order.subtotal) * provider.commissionRate;
    }, 0);

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.businessName,
        type: provider.providerType,
        commissionRate: provider.commissionRate,
        totalOrders: orders.length,
        totalRevenue,
        providerEarnings,
        platformCommission,
        pendingPayout: toNumber(provider.pendingPayout),
        totalEarnings: toNumber(provider.totalEarnings),
        rating: provider.rating,
        isVerified: provider.verificationStatus === 'APPROVED',
      },
      orders: orders.slice(0, 20), // Last 20 orders
    });
  }

  // Get all providers earnings
  const providers = await db.healthProvider.findMany({
    where: {
      verificationStatus: 'APPROVED',
    },
    include: {
      _count: {
        select: {
          healthOrders: {
            where: {
              createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
              status: 'DELIVERED',
            },
          },
        },
      },
    },
    orderBy: {
      totalEarnings: 'desc',
    },
  });

  const providerEarningsData = await Promise.all(
    providers.map(async (provider) => {
      const orders = await db.healthOrder.findMany({
        where: {
          providerId: provider.id,
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          status: 'DELIVERED',
        },
      });

      const revenue = orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);
      const earnings = orders.reduce((sum, order) => sum + toNumber(order.subtotal) * (1 - provider.commissionRate), 0);
      const commission = orders.reduce((sum, order) => sum + toNumber(order.subtotal) * provider.commissionRate, 0);

      return {
        id: provider.id,
        name: provider.businessName,
        type: provider.providerType,
        commissionRate: provider.commissionRate,
        totalOrders: orders.length,
        revenue,
        earnings,
        commission,
        pendingPayout: toNumber(provider.pendingPayout),
        totalEarnings: toNumber(provider.totalEarnings),
        rating: provider.rating,
        isOpen: provider.isOpenNow,
      };
    })
  );

  return NextResponse.json({
    providers: providerEarningsData,
    total: providers.length,
  });
}

// Get transaction history
async function getTransactionHistory(startDate?: string | null, endDate?: string | null) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const transactions = await db.financeLog.findMany({
    where: {
      transactionType: 'HEALTH_ORDER_PAYMENT',
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  return NextResponse.json({
    transactions,
    total: transactions.length,
  });
}

// Get outstanding payouts (real data). There is no separate completed-payout
// history model, so this returns providers with a real pending balance awaiting
// disbursement — never fabricated figures.
async function getPayoutHistory(providerId?: string | null) {
  const providers = await db.healthProvider.findMany({
    where: {
      pendingPayout: { gt: 0 },
      ...(providerId && { id: providerId }),
    },
    select: {
      id: true,
      businessName: true,
      pendingPayout: true,
      totalEarnings: true,
      mobileMoneyNumber: true,
      mobileMoneyProvider: true,
      bankName: true,
      bankAccountNumber: true,
    },
  });

  return NextResponse.json({
    pendingPayouts: providers,
    totalPending: providers.reduce((sum, p) => sum + toNumber(p.pendingPayout), 0),
  });
}

// Get earnings analytics
async function getEarningsAnalytics(startDate?: string | null, endDate?: string | null) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  // Get daily earnings for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orders = await db.healthOrder.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      status: 'DELIVERED',
    },
    select: {
      totalAmount: true,
      createdAt: true,
      orderType: true,
    },
  });

  // Group by date
  const dailyEarnings: Record<string, { revenue: number; orders: number }> = {};
  
  orders.forEach(order => {
    const dateKey = order.createdAt.toISOString().split('T')[0];
    if (!dailyEarnings[dateKey]) {
      dailyEarnings[dateKey] = { revenue: 0, orders: 0 };
    }
    dailyEarnings[dateKey].revenue += toNumber(order.totalAmount);
    dailyEarnings[dateKey].orders += 1;
  });

  // Convert to array for chart data
  const chartData = Object.entries(dailyEarnings)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get top performing providers
  const topProviders = await db.healthProvider.findMany({
    where: {
      verificationStatus: 'APPROVED',
    },
    take: 5,
    orderBy: {
      totalEarnings: 'desc',
    },
    select: {
      id: true,
      businessName: true,
      totalEarnings: true,
      totalOrders: true,
      rating: true,
    },
  });

  // Get earnings by provider type
  const providerTypes = await db.healthProvider.groupBy({
    by: ['providerType'],
    where: {
      verificationStatus: 'APPROVED',
    },
    _sum: {
      totalEarnings: true,
      pendingPayout: true,
    },
    _count: {
      id: true,
    },
  });

  return NextResponse.json({
    chartData,
    topProviders,
    providerTypes: providerTypes.map(pt => ({
      type: pt.providerType,
      count: pt._count.id,
      totalEarnings: toNumber(pt._sum.totalEarnings),
      pendingPayout: toNumber(pt._sum.pendingPayout),
    })),
  });
}

// Record a payout
async function recordPayout(data: { providerId: string; amount: number; reference?: string }) {
  const { providerId, amount, reference } = data;

  const provider = await db.healthProvider.findUnique({
    where: { id: providerId },
  });

  if (!provider) {
    return NextResponse.json({ success: false, error: 'Provider not found' }, { status: 404 });
  }

  if (toNumber(provider.pendingPayout) < amount) {
    return NextResponse.json({ success: false, error: 'Insufficient pending payout balance' }, { status: 400 });
  }

  // Update provider's pending payout
  const updatedProvider = await db.healthProvider.update({
    where: { id: providerId },
    data: {
      pendingPayout: { decrement: amount },
    },
  });

  // Log the payout
  await db.financeLog.create({
    data: {
      transactionType: 'MERCHANT_PAYOUT',
      referenceId: providerId,
      amount,
      merchantId: providerId,
      status: 'COMPLETED',
      description: `Payout to ${provider.businessName}${reference ? ` - Ref: ${reference}` : ''}`,
    },
  });

  return NextResponse.json({
    success: true,
    provider: {
      id: updatedProvider.id,
      name: updatedProvider.businessName,
      paidOut: amount,
      remainingPending: updatedProvider.pendingPayout,
    },
  });
}

// Update commission rate for a provider
async function updateCommissionRate(data: { providerId: string; commissionRate: number }) {
  const { providerId, commissionRate } = data;

  if (commissionRate < 0 || commissionRate > 1) {
    return NextResponse.json({ success: false, error: 'Commission rate must be between 0 and 1' }, { status: 400 });
  }

  const provider = await db.healthProvider.update({
    where: { id: providerId },
    data: { commissionRate },
  });

  return NextResponse.json({
    success: true,
    provider: {
      id: provider.id,
      name: provider.businessName,
      commissionRate: provider.commissionRate,
    },
  });
}
