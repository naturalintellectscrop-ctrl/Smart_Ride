import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch merchant earnings and financial data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const merchantId = searchParams.get('merchantId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    switch (action) {
      case 'summary':
        return await getEarningsSummary(startDate, endDate);
      
      case 'merchants':
        return await getMerchantEarnings(merchantId, startDate, endDate);
      
      case 'transactions':
        return await getTransactionHistory(startDate, endDate);
      
      case 'payouts':
        return await getPayoutHistory(merchantId);
      
      case 'analytics':
        return await getEarningsAnalytics(startDate, endDate);
      
      case 'by-type':
        return await getEarningsByMerchantType();
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Merchant earnings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchant earnings' },
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
    console.error('Merchant earnings POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Get overall earnings summary for merchant service
async function getEarningsSummary(startDate?: string | null, endDate?: string | null) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  // Get all orders with their financial data
  const orders = await db.order.findMany({
    where: {
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      status: 'DELIVERED',
      merchantId: { not: null },
    },
    include: {
      merchant: true,
      items: true,
    },
  });

  // Calculate summary statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalDeliveryFees = orders.reduce((sum, order) => sum + order.deliveryFee, 0);
  const totalServiceFees = orders.reduce((sum, order) => sum + (order.serviceFee || 0), 0);
  const totalSubtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);
  
  // Calculate merchant earnings and platform commission
  let totalMerchantEarnings = 0;
  let totalPlatformCommission = 0;
  
  orders.forEach(order => {
    const commissionRate = order.merchant?.commissionRate || 0.15;
    const merchantEarnings = order.subtotal * (1 - commissionRate);
    const platformCommission = order.subtotal * commissionRate;
    
    totalMerchantEarnings += merchantEarnings;
    totalPlatformCommission += platformCommission;
  });

  // Get active merchants count
  const activeMerchants = await db.merchant.count({
    where: {
      status: 'APPROVED',
      isOpen: true,
    },
  });

  // Get total approved merchants
  const totalMerchants = await db.merchant.count({
    where: {
      status: 'APPROVED',
    },
  });

  // Get today's earnings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = await db.order.findMany({
    where: {
      createdAt: { gte: today },
      status: 'DELIVERED',
      merchantId: { not: null },
    },
  });
  
  const todayEarnings = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Get orders by type
  const foodOrders = orders.filter(o => o.orderType === 'FOOD_DELIVERY');
  const shoppingOrders = orders.filter(o => o.orderType === 'SHOPPING');

  // Get merchant type breakdown
  const merchantsByType = await db.merchant.groupBy({
    by: ['type'],
    where: {
      status: 'APPROVED',
    },
    _count: {
      id: true,
    },
  });

  return NextResponse.json({
    summary: {
      totalOrders,
      totalRevenue,
      totalSubtotal,
      totalDeliveryFees,
      totalServiceFees,
      totalMerchantEarnings,
      totalPlatformCommission,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      todayEarnings,
      todayOrders: todayOrders.length,
    },
    merchants: {
      total: totalMerchants,
      active: activeMerchants,
    },
    orderTypes: {
      food: {
        count: foodOrders.length,
        revenue: foodOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      },
      shopping: {
        count: shoppingOrders.length,
        revenue: shoppingOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      },
    },
    merchantsByType: merchantsByType.map(m => ({
      type: m.type,
      count: m._count.id,
    })),
  });
}

// Get earnings for each merchant
async function getMerchantEarnings(merchantId?: string | null, startDate?: string | null, endDate?: string | null) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  if (merchantId) {
    // Get single merchant earnings
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        orders: {
          where: {
            createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
            status: 'DELIVERED',
          },
        },
        menuItems: {
          select: { id: true, name: true, price: true },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const orders = merchant.orders;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const merchantEarnings = orders.reduce((sum, order) => {
      return sum + (order.subtotal * (1 - merchant.commissionRate));
    }, 0);
    const platformCommission = orders.reduce((sum, order) => {
      return sum + (order.subtotal * merchant.commissionRate);
    }, 0);

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        type: merchant.type,
        commissionRate: merchant.commissionRate,
        totalOrders: orders.length,
        totalRevenue,
        merchantEarnings,
        platformCommission,
        rating: merchant.rating,
        isOpen: merchant.isOpen,
        address: merchant.address,
        averagePrepTime: merchant.averagePrepTime,
      },
      orders: orders.slice(0, 20),
      menuItems: merchant.menuItems,
    });
  }

  // Get all merchants earnings
  const merchants = await db.merchant.findMany({
    where: {
      status: 'APPROVED',
    },
    orderBy: {
      totalOrders: 'desc',
    },
  });

  const merchantEarningsData = await Promise.all(
    merchants.map(async (merchant) => {
      const orders = await db.order.findMany({
        where: {
          merchantId: merchant.id,
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          status: 'DELIVERED',
        },
      });

      const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const subtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);
      const earnings = subtotal * (1 - merchant.commissionRate);
      const commission = subtotal * merchant.commissionRate;

      return {
        id: merchant.id,
        name: merchant.name,
        type: merchant.type,
        commissionRate: merchant.commissionRate,
        totalOrders: orders.length,
        revenue,
        subtotal,
        earnings,
        commission,
        rating: merchant.rating,
        isOpen: merchant.isOpen,
        address: merchant.address,
      };
    })
  );

  return NextResponse.json({
    merchants: merchantEarningsData,
    total: merchants.length,
  });
}

// Get transaction history
async function getTransactionHistory(startDate?: string | null, endDate?: string | null) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const transactions = await db.financeLog.findMany({
    where: {
      transactionType: { in: ['FOOD_ORDER_PAYMENT', 'SHOPPING_ORDER_PAYMENT'] },
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
async function getPayoutHistory(merchantId?: string | null) {
  const payouts = await db.financeLog.findMany({
    where: {
      transactionType: 'MERCHANT_PAYOUT',
      ...(merchantId && { merchantId }),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  // Get merchants with pending payouts (simulated - in production you'd have a pendingPayout field)
  const merchants = await db.merchant.findMany({
    where: {
      status: 'APPROVED',
    },
    select: {
      id: true,
      name: true,
      type: true,
      totalOrders: true,
      bankName: true,
      bankAccountNumber: true,
    },
  });

  return NextResponse.json({
    payouts,
    merchants,
    totalPayouts: payouts.reduce((sum, p) => sum + p.amount, 0),
  });
}

// Get earnings analytics
async function getEarningsAnalytics(startDate?: string | null, endDate?: string | null) {
  // Get daily earnings for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      status: 'DELIVERED',
      merchantId: { not: null },
    },
    select: {
      totalAmount: true,
      subtotal: true,
      createdAt: true,
      orderType: true,
      merchantId: true,
    },
  });

  // Group by date
  const dailyEarnings: Record<string, { revenue: number; orders: number; subtotal: number }> = {};
  
  orders.forEach(order => {
    const dateKey = order.createdAt.toISOString().split('T')[0];
    if (!dailyEarnings[dateKey]) {
      dailyEarnings[dateKey] = { revenue: 0, orders: 0, subtotal: 0 };
    }
    dailyEarnings[dateKey].revenue += order.totalAmount;
    dailyEarnings[dateKey].subtotal += order.subtotal;
    dailyEarnings[dateKey].orders += 1;
  });

  // Convert to array for chart data
  const chartData = Object.entries(dailyEarnings)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
      subtotal: data.subtotal,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get top performing merchants
  const topMerchants = await db.merchant.findMany({
    where: {
      status: 'APPROVED',
    },
    take: 5,
    orderBy: {
      totalOrders: 'desc',
    },
    select: {
      id: true,
      name: true,
      type: true,
      totalOrders: true,
      rating: true,
      commissionRate: true,
    },
  });

  // Calculate earnings for top merchants
  const topMerchantsWithEarnings = await Promise.all(
    topMerchants.map(async (merchant) => {
      const merchantOrders = orders.filter(o => o.merchantId === merchant.id);
      const revenue = merchantOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const subtotal = merchantOrders.reduce((sum, o) => sum + o.subtotal, 0);
      
      return {
        ...merchant,
        revenue,
        earnings: subtotal * (1 - merchant.commissionRate),
        orderCount: merchantOrders.length,
      };
    })
  );

  return NextResponse.json({
    chartData,
    topMerchants: topMerchantsWithEarnings,
  });
}

// Get earnings by merchant type
async function getEarningsByMerchantType() {
  const merchantTypes = await db.merchant.groupBy({
    by: ['type'],
    where: {
      status: 'APPROVED',
    },
    _count: {
      id: true,
    },
    _sum: {
      totalOrders: true,
    },
  });

  // Get orders for each type
  const typeEarnings = await Promise.all(
    merchantTypes.map(async (type) => {
      const merchants = await db.merchant.findMany({
        where: {
          type: type.type,
          status: 'APPROVED',
        },
        select: {
          id: true,
          commissionRate: true,
        },
      });

      const merchantIds = merchants.map(m => m.id);
      
      const orders = await db.order.findMany({
        where: {
          merchantId: { in: merchantIds },
          status: 'DELIVERED',
        },
        select: {
          subtotal: true,
          totalAmount: true,
          merchantId: true,
        },
      });

      const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
      
      // Calculate commission
      let totalCommission = 0;
      orders.forEach(order => {
        const merchant = merchants.find(m => m.id === order.merchantId);
        if (merchant) {
          totalCommission += order.subtotal * merchant.commissionRate;
        }
      });

      return {
        type: type.type,
        merchantCount: type._count.id,
        totalOrders: orders.length,
        totalRevenue,
        totalSubtotal,
        platformCommission: totalCommission,
        merchantEarnings: totalSubtotal - totalCommission,
      };
    })
  );

  return NextResponse.json({
    types: typeEarnings,
    total: typeEarnings.reduce((sum, t) => sum + t.totalRevenue, 0),
  });
}

// Record a payout
async function recordPayout(data: { merchantId: string; amount: number; reference?: string }) {
  const { merchantId, amount, reference } = data;

  const merchant = await db.merchant.findUnique({
    where: { id: merchantId },
  });

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  // Log the payout
  const payout = await db.financeLog.create({
    data: {
      transactionType: 'MERCHANT_PAYOUT',
      referenceId: merchantId,
      amount,
      merchantId: merchantId,
      status: 'COMPLETED',
      description: `Payout to ${merchant.name}${reference ? ` - Ref: ${reference}` : ''}`,
    },
  });

  return NextResponse.json({
    success: true,
    payout: {
      id: payout.id,
      merchantId: merchant.id,
      merchantName: merchant.name,
      amount,
      reference,
      processedAt: payout.createdAt,
    },
  });
}

// Update commission rate for a merchant
async function updateCommissionRate(data: { merchantId: string; commissionRate: number }) {
  const { merchantId, commissionRate } = data;

  if (commissionRate < 0 || commissionRate > 1) {
    return NextResponse.json({ error: 'Commission rate must be between 0 and 1' }, { status: 400 });
  }

  const merchant = await db.merchant.update({
    where: { id: merchantId },
    data: { commissionRate },
  });

  return NextResponse.json({
    success: true,
    merchant: {
      id: merchant.id,
      name: merchant.name,
      commissionRate: merchant.commissionRate,
    },
  });
}
