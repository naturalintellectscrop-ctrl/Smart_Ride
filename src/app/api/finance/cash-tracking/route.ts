/**
 * Cash Tracking API Routes
 * Manage cash collections, deposits, and reconciliation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recordCashCollection,
  recordCashDeposit,
  getRiderCashSummary,
  verifyCashCollection,
  reconcileCashCollections,
  getHighCashRiders,
  getPendingCashCollections,
  recordCashAdjustment,
  getCashCollectionSummary,
  MAX_CASH_HOLDING,
  LARGE_COLLECTION_THRESHOLD,
  DEPOSIT_REMINDER_THRESHOLD,
} from '@/lib/finance/cash-tracking-service';
import { CollectionType } from '@prisma/client';

// ============================================
// GET /api/finance/cash-tracking
// Get cash tracking data
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const riderId = searchParams.get('riderId') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Get admin dashboard summary
    if (action === 'summary') {
      const summary = await getCashCollectionSummary();
      return NextResponse.json({
        success: true,
        summary,
        thresholds: {
          maxCashHolding: MAX_CASH_HOLDING,
          largeCollectionThreshold: LARGE_COLLECTION_THRESHOLD,
          depositReminderThreshold: DEPOSIT_REMINDER_THRESHOLD,
        },
      });
    }

    // Get high cash riders (alerts)
    if (action === 'alerts') {
      const alerts = await getHighCashRiders();
      return NextResponse.json({
        success: true,
        alerts,
        totalAlerts: alerts.length,
      });
    }

    // Get cash summary for a specific rider
    if (action === 'rider-summary' && riderId) {
      const summary = await getRiderCashSummary(riderId);
      return NextResponse.json({
        success: true,
        summary,
      });
    }

    // Get pending cash collections
    if (action === 'pending') {
      const result = await getPendingCashCollections({
        riderId,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Get reconciliation report
    if (action === 'reconcile' && riderId) {
      const periodStart = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const periodEnd = endDate ? new Date(endDate) : new Date();

      const reconciliation = await reconcileCashCollections(riderId, periodStart, periodEnd);

      return NextResponse.json({
        success: true,
        reconciliation,
      });
    }

    // Get configuration
    if (action === 'config') {
      return NextResponse.json({
        success: true,
        config: {
          maxCashHolding: MAX_CASH_HOLDING,
          largeCollectionThreshold: LARGE_COLLECTION_THRESHOLD,
          depositReminderThreshold: DEPOSIT_REMINDER_THRESHOLD,
        },
      });
    }

    // Default: get pending cash collections
    const result = await getPendingCashCollections({
      riderId,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Cash tracking API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cash tracking data',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/finance/cash-tracking
// Record cash collections, deposits, and adjustments
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Record a cash collection
    if (action === 'collect') {
      const {
        riderId,
        taskId,
        userId,
        amount,
        collectionType,
        notes,
      } = data;

      if (!riderId || !amount) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: riderId, amount' },
          { status: 400 }
        );
      }

      const collection = await recordCashCollection({
        riderId,
        taskId,
        userId,
        amount: parseFloat(amount),
        collectionType: (collectionType as CollectionType) || 'COD_PAYMENT',
        notes,
      });

      // Check if this triggers any alerts
      const summary = await getRiderCashSummary(riderId);
      const alerts: string[] = [];

      if (summary.pendingCash >= MAX_CASH_HOLDING) {
        alerts.push('Mandatory deposit required - cash limit exceeded');
      } else if (summary.pendingCash >= DEPOSIT_REMINDER_THRESHOLD) {
        alerts.push('Deposit recommended - approaching cash limit');
      }

      if (parseFloat(amount) >= LARGE_COLLECTION_THRESHOLD) {
        alerts.push('Large collection recorded');
      }

      return NextResponse.json({
        success: true,
        collection,
        alerts: alerts.length > 0 ? alerts : undefined,
        currentPendingCash: summary.pendingCash,
      });
    }

    // Record a cash deposit
    if (action === 'deposit') {
      const {
        riderId,
        amount,
        depositReference,
        notes,
      } = data;

      if (!riderId || !amount) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: riderId, amount' },
          { status: 400 }
        );
      }

      const deposit = await recordCashDeposit({
        riderId,
        amount: parseFloat(amount),
        depositReference,
        notes,
      });

      // Get updated summary
      const summary = await getRiderCashSummary(riderId);

      return NextResponse.json({
        success: true,
        deposit,
        message: 'Deposit recorded successfully',
        remainingPendingCash: summary.pendingCash,
      });
    }

    // Verify a cash collection
    if (action === 'verify') {
      const { collectionId, verifiedBy } = data;

      if (!collectionId || !verifiedBy) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: collectionId, verifiedBy' },
          { status: 400 }
        );
      }

      const collection = await verifyCashCollection(collectionId, verifiedBy);

      return NextResponse.json({
        success: true,
        collection,
        message: 'Collection verified successfully',
      });
    }

    // Record an adjustment
    if (action === 'adjust') {
      const { riderId, amount, reason } = data;

      if (!riderId || !amount || !reason) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: riderId, amount, reason' },
          { status: 400 }
        );
      }

      const adjustment = await recordCashAdjustment(riderId, parseFloat(amount), reason);

      return NextResponse.json({
        success: true,
        adjustment,
        message: 'Adjustment recorded successfully',
      });
    }

    // Run reconciliation
    if (action === 'reconcile') {
      const { riderId, periodStart, periodEnd } = data;

      if (!riderId || !periodStart || !periodEnd) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: riderId, periodStart, periodEnd' },
          { status: 400 }
        );
      }

      const reconciliation = await reconcileCashCollections(
        riderId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      return NextResponse.json({
        success: true,
        reconciliation,
        hasDiscrepancy: reconciliation.discrepancy !== 0,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use: collect, deposit, verify, adjust, or reconcile' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Cash tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process cash tracking request',
      },
      { status: 500 }
    );
  }
}
