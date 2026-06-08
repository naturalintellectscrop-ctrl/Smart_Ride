// ============================================
// SMART RIDE - AVAILABLE TASKS API
// ============================================
// Returns tasks available for a rider to accept.
// Only riders can access this endpoint.
// Filters tasks by MATCHING/SEARCHING status and
// matches the rider's vehicle/capability type.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TaskStatus, RiderRole, TaskType } from '@prisma/client';
import { requireAuthWithRLS } from '@/lib/auth/guards';
import { db, resetRLSContext } from '@/lib/db';
import { canRiderPerformTask } from '@/lib/services/enhanced-task-state-machine.service';

// GET /api/tasks/available - Get available tasks for rider
export async function GET(request: NextRequest) {
  const authResult = await requireAuthWithRLS(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }

  const user = authResult.user;

  // Only riders can view available tasks
  if (user.role !== 'RIDER') {
    return NextResponse.json(
      { success: false, error: 'Only riders can view available tasks' },
      { status: 403 }
    );
  }

  try {
    // Find the rider profile
    const rider = await db.rider.findFirst({
      where: { userId: user.userId },
      select: {
        id: true,
        riderRole: true,
        vehicleType: true,
        status: true,
        isOnline: true,
      },
    });

    if (!rider) {
      return NextResponse.json(
        { success: false, error: 'Rider profile not found' },
        { status: 404 }
      );
    }

    // Rider must be approved and online to see available tasks
    if (rider.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Rider account not approved' },
        { status: 403 }
      );
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Query tasks with MATCHING or SEARCHING status
    const availableTasks = await db.task.findMany({
      where: {
        status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
        riderId: null, // Not yet assigned
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Filter tasks by rider capability
    const filteredTasks = availableTasks.filter((task) =>
      canRiderPerformTask(rider.riderRole, task.taskType)
    );

    // Get total count for pagination
    const totalCount = await db.task.count({
      where: {
        status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
        riderId: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: filteredTasks,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Get available tasks error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
