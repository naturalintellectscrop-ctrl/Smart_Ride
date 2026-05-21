/**
 * Settlement API Routes
 * Manage rider settlements and payouts
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateRiderEarnings,
  createSettlement,
  processSettlement,
  processBatchSettlements,
  getSettlements,
  getPendingSettlementsSummary,
  retrySettlement,
  generateSettlementReport,
  MINIMUM_PAYOUT_AMOUNT,
} from '@/lib/finance/settlement-service';
import { PayoutStatus } from '@prisma/client';

// ============================================
// GET /api/finance/settlements
// Get settlements with filtering
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const riderId = searchParams.get('riderId') || undefined;
    const status = searchParams.get('status') as PayoutStatus | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Get pending settlements summary
    if (action === 'pending-summary') {
      const summary = await getPendingSettlementsSummary();
      return NextResponse.json({
        success: true,
        summary,
      });
    }

    // Get earnings for a specific rider
    if (action === 'earnings' && riderId) {
      const periodStart = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const periodEnd = endDate ? new Date(endDate) : new Date();

      const earnings = await calculateRiderEarnings(riderId, {
        startDate: periodStart,
        endDate: periodEnd,
      });

      return NextResponse.json({
        success: true,
        earnings,
        period: {
          startDate: periodStart,
          endDate: periodEnd,
        },
      });
    }

    // Get settlement report
    if (action === 'report') {
      const periodStart = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const periodEnd = endDate ? new Date(endDate) : new Date();

      const report = await generateSettlementReport({
        startDate: periodStart,
        endDate: periodEnd,
      });

      return NextResponse.json({
        success: true,
        report,
      });
    }

    // Get minimum payout info
    if (action === 'config') {
      return NextResponse.json({
        success: true,
        config: {
          minimumPayoutAmount: MINIMUM_PAYOUT_AMOUNT,
          supportedPaymentMethods: ['MTN_MOMO', 'AIRTEL_MONEY', 'BANK_TRANSFER'],
        },
      });
    }

    // Default: get settlements with filtering
    const filter = {
      riderId,
      status: status || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    };

    const result = await getSettlements(filter);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Settlement API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settlements',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/finance/settlements
// Create and process settlements
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Create a new settlement
    if (action === 'create') {
      const {
        riderId,
        periodStart,
        periodEnd,
        paymentMethod,
        phoneNumber,
      } = data;

      if (!riderId || !periodStart || !periodEnd || !paymentMethod) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: riderId, periodStart, periodEnd, paymentMethod' },
          { status: 400 }
        );
      }

      const settlement = await createSettlement(
        riderId,
        {
          startDate: new Date(periodStart),
          endDate: new Date(periodEnd),
        },
        paymentMethod,
        phoneNumber
      );

      return NextResponse.json({
        success: true,
        settlement,
        message: 'Settlement created successfully',
      });
    }

    // Process a single settlement
    if (action === 'process') {
      const { settlementId } = data;

      if (!settlementId) {
        return NextResponse.json(
          { success: false, error: 'settlementId is required' },
          { status: 400 }
        );
      }

      const result = await processSettlement(settlementId);

      return NextResponse.json({
        success: true,
        settlement: result,
        message: result.status === 'COMPLETED' ? 'Settlement processed successfully' : 'Settlement processing',
      });
    }

    // Process batch settlements
    if (action === 'batch') {
      const {
        riderIds,
        periodStart,
        periodEnd,
        paymentMethod,
      } = data;

      if (!riderIds || !Array.isArray(riderIds) || riderIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'riderIds must be a non-empty array' },
          { status: 400 }
        );
      }

      if (!periodStart || !periodEnd || !paymentMethod) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: periodStart, periodEnd, paymentMethod' },
          { status: 400 }
        );
      }

      const result = await processBatchSettlements(
        riderIds,
        {
          startDate: new Date(periodStart),
          endDate: new Date(periodEnd),
        },
        paymentMethod
      );

      return NextResponse.json({
        success: true,
        result,
        message: `Processed ${result.successful}/${result.totalPayouts} settlements successfully`,
      });
    }

    // Retry a failed settlement
    if (action === 'retry') {
      const { settlementId } = data;

      if (!settlementId) {
        return NextResponse.json(
          { success: false, error: 'settlementId is required' },
          { status: 400 }
        );
      }

      const result = await retrySettlement(settlementId);

      return NextResponse.json({
        success: true,
        settlement: result,
        message: 'Settlement retry initiated',
      });
    }

    // Calculate earnings preview
    if (action === 'calculate') {
      const { riderId, periodStart, periodEnd } = data;

      if (!riderId || !periodStart || !periodEnd) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: riderId, periodStart, periodEnd' },
          { status: 400 }
        );
      }

      const earnings = await calculateRiderEarnings(riderId, {
        startDate: new Date(periodStart),
        endDate: new Date(periodEnd),
      });

      return NextResponse.json({
        success: true,
        earnings,
        canPayout: earnings.netEarnings >= MINIMUM_PAYOUT_AMOUNT,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use: create, process, batch, retry, or calculate' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Settlement processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process settlement',
      },
      { status: 500 }
    );
  }
}
