/**
 * Commission API Routes
 * Calculate and manage platform commissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateCommission, calculateAndRecordCommission, getPlatformEarningsSummary, estimateCommission, getCommissionConfig } from '@/lib/finance/commission-engine';
import { TaskType } from '@prisma/client';

// ============================================
// GET /api/finance/commission
// Get commission configuration or earnings summary
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const serviceType = searchParams.get('serviceType') as TaskType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get commission configuration for a service type
    if (action === 'config' && serviceType) {
      const config = await getCommissionConfig(serviceType);
      return NextResponse.json({
        success: true,
        config,
      });
    }

    // Get platform earnings summary
    if (action === 'summary') {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const summary = await getPlatformEarningsSummary(start, end);
      return NextResponse.json({
        success: true,
        summary,
        period: {
          startDate: start,
          endDate: end,
        },
      });
    }

    // Default: return all commission configurations
    const configs = await Promise.all(
      Object.values(TaskType).map(async (type) => ({
        serviceType: type,
        config: await getCommissionConfig(type),
      }))
    );

    return NextResponse.json({
      success: true,
      configs,
    });
  } catch (error) {
    console.error('Commission API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get commission data',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/finance/commission
// Calculate commission for a task
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Estimate commission for preview
    if (action === 'estimate') {
      const { taskType, totalAmount, isNight, isPeak } = data;

      if (!taskType || !totalAmount) {
        return NextResponse.json(
          { success: false, error: 'taskType and totalAmount are required' },
          { status: 400 }
        );
      }

      const estimate = estimateCommission(
        taskType as TaskType,
        parseFloat(totalAmount),
        isNight || false,
        isPeak || false
      );

      return NextResponse.json({
        success: true,
        estimate: {
          ...estimate,
          taskType,
          totalAmount: parseFloat(totalAmount),
          isNight: isNight || false,
          isPeak: isPeak || false,
        },
      });
    }

    // Calculate commission without recording
    if (action === 'calculate') {
      const {
        taskId,
        taskType,
        totalAmount,
        distanceKm,
        durationMinutes,
        merchantId,
        riderId,
        clientId,
        paymentMethod,
        isNightRide,
        isPeakHours,
        customCommissionRate,
      } = data;

      if (!taskId || !taskType || !totalAmount || !clientId || !paymentMethod) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: taskId, taskType, totalAmount, clientId, paymentMethod' },
          { status: 400 }
        );
      }

      const breakdown = await calculateCommission({
        taskId,
        taskType: taskType as TaskType,
        totalAmount: parseFloat(totalAmount),
        distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        merchantId,
        riderId,
        clientId,
        paymentMethod,
        isNightRide,
        isPeakHours,
        customCommissionRate: customCommissionRate ? parseFloat(customCommissionRate) : undefined,
      });

      return NextResponse.json({
        success: true,
        breakdown,
      });
    }

    // Calculate and record commission
    if (action === 'record') {
      const {
        taskId,
        taskType,
        totalAmount,
        distanceKm,
        durationMinutes,
        merchantId,
        riderId,
        clientId,
        paymentMethod,
        isNightRide,
        isPeakHours,
        customCommissionRate,
      } = data;

      if (!taskId || !taskType || !totalAmount || !clientId || !paymentMethod) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: taskId, taskType, totalAmount, clientId, paymentMethod' },
          { status: 400 }
        );
      }

      const breakdown = await calculateAndRecordCommission({
        taskId,
        taskType: taskType as TaskType,
        totalAmount: parseFloat(totalAmount),
        distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        merchantId,
        riderId,
        clientId,
        paymentMethod,
        isNightRide,
        isPeakHours,
        customCommissionRate: customCommissionRate ? parseFloat(customCommissionRate) : undefined,
      });

      return NextResponse.json({
        success: true,
        breakdown,
        message: 'Commission recorded successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use: estimate, calculate, or record' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Commission calculation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate commission',
      },
      { status: 500 }
    );
  }
}
