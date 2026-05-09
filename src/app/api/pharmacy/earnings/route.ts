import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch pharmacy earnings and financial data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const providerId = searchParams.get('providerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    switch (action) {
      case 'summary':
        return await getEarningsSummary(startDate, endDate);
      
      case 'providers':
        return await getProviderEarnings(providerId, startDate, endDate);
      
      case 'transactions':
        return await getTransactionHistory(startDate, endDate);
      
      case 'payouts':
        return await getPayoutHistory(providerId);
      
      case 'analytics':
        return await getEarningsAnalytics(startDate, endDate);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Pharmacy earnings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pharmacy earnings' },
      { status: 500 }
    );
  }
}

// POST - Record payout or update earnings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'record-payout':
        return await recordPayout(body);
      
      case 'update-commission':
        return await updateCommissionRate(body);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Pharmacy earnings POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Get overall earnings summary for pharmacy service
async function getEarningsSummary(startDate?: string | null, endDate?: string | null) {
  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  // Get all health orders with their financial data
  const healthOrders = await db.healthOrder.findMany({
    where: {
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      status: 'DELIVERED',
    },
    include: {
      provider: true,
      items: true,
    },
  });

  // Calculate summary statistics
  const totalOrders = healthOrders.length;
  const totalRevenue = healthOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalDeliveryFees = healthOrders.reduce((sum, order) => sum + order.deliveryFee, 0);
  const totalServiceFees = healthOrders.reduce((sum, order) => sum + (order.serviceFee || 0), 0);
  
  // Calculate provider earnings and platform commission
  let totalProviderEarnings = 0;
  let totalPlatformCommission = 0;
  
  healthOrders.forEach(order => {
    const commissionRate = order.provider?.commissionRate || 0.10;
    const providerEarnings = order.subtotal * (1 - commissionRate);
    const platformCommission = order.subtotal * commissionRate;
    
    totalProviderEarnings += providerEarnings;
    totalPlatformCommission += platformCommission;
  });

  // Get active providers count
  const activeProviders = await db.healthProvider.count({
    where: {
      verificationStatus: 'APPROVED',
      isOpenNow: true,
    },
  });

  // Get total verified providers
  const totalProviders = await db.healthProvider.count({
    where: {
      verificationStatus: 'APPROVED',
    },
  });

  // Get pending payouts
  const pendingPayouts = await db.healthProvider.aggregate({
    _sum: {
      pendingPayout: true,
    },
    where: {
      pendingPayout: { gt: 0 },
    },
  });

  // Get today's earnings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = await db.healthOrder.findMany({
    where: {
      createdAt: { gte: today },
      status: 'DELIVERED',
    },
  });
  
  const todayEarnings = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Get earnings by order type
  const prescriptionOrders = healthOrders.filter(o => o.orderType === 'PRESCRIPTION_MEDICINE');
  const otcOrders = healthOrders.filter(o => o.orderType === 'OVER_THE_COUNTER');

  return NextResponse.json({
    summary: {
      totalOrders,
      totalRevenue,
      totalDeliveryFees,
      totalServiceFees,
      totalProviderEarnings,
      totalPlatformCommission,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      todayEarnings,
      todayOrders: todayOrders.length,
    },
    providers: {
      total: totalProviders,
      active: activeProviders,
    },
    pendingPayouts: pendingPayouts._sum.pendingPayout || 0,
    orderTypes: {
      prescription: {
        count: prescriptionOrders.length,
        revenue: prescriptionOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      },
      otc: {
        count: otcOrders.length,
        revenue: otcOrders.reduce((sum, o) => sum + o.totalAmount, 0),
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
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const orders = provider.healthOrders;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const providerEarnings = orders.reduce((sum, order) => {
      return sum + (order.subtotal * (1 - provider.commissionRate));
    }, 0);
    const platformCommission = orders.reduce((sum, order) => {
      return sum + (order.subtotal * provider.commissionRate);
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
        pendingPayout: provider.pendingPayout,
        totalEarnings: provider.totalEarnings,
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

      const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const earnings = orders.reduce((sum, order) => sum + (order.subtotal * (1 - provider.commissionRate)), 0);
      const commission = orders.reduce((sum, order) => sum + (order.subtotal * provider.commissionRate), 0);

      return {
        id: provider.id,
        name: provider.businessName,
        type: provider.providerType,
        commissionRate: provider.commissionRate,
        totalOrders: orders.length,
        revenue,
        earnings,
        commission,
        pendingPayout: provider.pendingPayout,
        totalEarnings: provider.totalEarnings,
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

// Get payout history
async function getPayoutHistory(providerId?: string | null) {
  // For now, return mock payout history since we don't have a dedicated payout model for providers
  // In production, you would have a HealthProviderPayout model
  
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
    totalPending: providers.reduce((sum, p) => sum + p.pendingPayout, 0),
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
    dailyEarnings[dateKey].revenue += order.totalAmount;
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
      totalEarnings: pt._sum.totalEarnings || 0,
      pendingPayout: pt._sum.pendingPayout || 0,
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
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  if (provider.pendingPayout < amount) {
    return NextResponse.json({ error: 'Insufficient pending payout balance' }, { status: 400 });
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
    return NextResponse.json({ error: 'Commission rate must be between 0 and 1' }, { status: 400 });
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
