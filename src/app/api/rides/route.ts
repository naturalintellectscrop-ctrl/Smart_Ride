import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { TaskStatus } from '@prisma/client';
import {
  generateTaskNumber,
  EnhancedTaskStateMachine,
} from '@/lib/services/enhanced-task-state-machine.service';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { runAfterResponse } from '@/lib/api/after-response';
import { sendTaskUpdateNotification } from '@/lib/services/notification.service';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    await setRLSContext({ userId: payload.userId, role: payload.role });

    // Use Task model for rides (ride-type tasks)
    // Prisma field is `taskType`, not `type`; enum values are SMART_BODA_RIDE / SMART_CAR_RIDE
    const rides = await db.task.findMany({
      where: {
        clientId: payload.userId,
        taskType: { in: ['SMART_BODA_RIDE', 'SMART_CAR_RIDE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ success: true, data: rides });
  } catch (error) {
    console.error('Rides GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rides' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    await setRLSContext({ userId: payload.userId, role: payload.role });

    const body = await req.json();
    const {
      taskType = 'SMART_BODA_RIDE',
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      dropoffAddress,
      dropoffLatitude,
      dropoffLongitude,
      totalAmount,
      baseFare,
      distanceKm,
      estimatedDuration,
      paymentMethod = 'CASH',
    } = body;

    if (!pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { success: false, error: 'Pickup and dropoff locations are required' },
        { status: 400 }
      );
    }

    // Validate taskType against the TaskType enum
    const validTaskTypes = ['SMART_BODA_RIDE', 'SMART_CAR_RIDE', 'FOOD_DELIVERY', 'SHOPPING', 'ITEM_DELIVERY', 'SMART_HEALTH_DELIVERY'];
    if (!validTaskTypes.includes(taskType)) {
      return NextResponse.json(
        { success: false, error: `Invalid taskType. Must be one of: ${validTaskTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate paymentMethod against the PaymentMethod enum
    const validPaymentMethods = ['CASH', 'MTN_MOMO', 'AIRTEL_MONEY', 'VISA', 'MASTERCARD', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: `Invalid paymentMethod. Must be one of: ${validPaymentMethods.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate a unique task number
    const taskNumber = `SR${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create a ride task using the Task model with correct Prisma field names
    const ride = await db.task.create({
      data: {
        taskNumber,
        clientId: payload.userId,
        taskType,
        status: 'CREATED',       // CREATED is the valid initial status in TaskStatus enum (not 'PENDING')
        pickupAddress,
        pickupLatitude: pickupLatitude || 0.3476,
        pickupLongitude: pickupLongitude || 32.5825,
        dropoffAddress,
        dropoffLatitude: dropoffLatitude || 0.3576,
        dropoffLongitude: dropoffLongitude || 32.5925,
        baseFare: baseFare || 0,            // Required Float field
        totalAmount: totalAmount || 0,       // Required Float field (was `fare`)
        distanceKm: distanceKm || null,      // Optional Float (was `distance`)
        estimatedDuration: estimatedDuration || null, // Optional Int (was `duration`)
        paymentMethod,
        paymentStatus: 'PENDING',
      },
    });

    // ============================================================
    // AUTO-TRANSITION to MATCHING (mirrors /api/tasks POST).
    // Previously this endpoint left the task stuck in CREATED, which
    // meant the dispatch service never picked it up.
    // ============================================================
    let matchingRide = ride;
    try {
      const transitionResult = await EnhancedTaskStateMachine.transition(
        ride.id,
        TaskStatus.MATCHING,
        { triggeredByType: 'SYSTEM', reason: 'Ride created, starting dispatch' }
      );
      if (transitionResult.success && transitionResult.task) {
        matchingRide = transitionResult.task;
      } else {
        console.error(`[Rides] Failed to transition ride ${ride.id} to MATCHING:`, transitionResult.error);
      }
    } catch (err) {
      console.error(`[Rides] Exception transitioning ride ${ride.id} to MATCHING:`, err);
    }

    // Audit log for ride creation
    try {
      await createAuditLog({
        action: AuditActions.TASK_CREATED,
        entityType: EntityTypes.TASK,
        entityId: ride.id,
        actorType: 'USER',
        userId: payload.userId,
        taskId: ride.id,
        description: `Ride created: ${ride.taskNumber} (${taskType})`,
      });
    } catch (auditErr) {
      console.error('[Rides] Audit log failed (non-blocking):', auditErr);
    }

    // Notify client about MATCHING status
    try {
      await sendTaskUpdateNotification(
        payload.userId,
        ride.id,
        ride.taskNumber,
        'MATCHING'
      );
    } catch (notifErr) {
      console.error('[Rides] MATCHING notification failed (non-blocking):', notifErr);
    }

    // Auto-dispatch: find and offer the ride to the nearest rider, after the
    // response but not lost with it. The match starts as PENDING; the rider must
    // explicitly accept via /api/dispatch/[id]/accept — only then does the task
    // transition to ASSIGNED.
    //
    // This was a bare floating promise. The invocation is frozen once the
    // response returns, and the `finally` below resets the RLS context on the
    // single pooled connection the dispatch is still using — so the search
    // either never started or died on 42704. Same defect, same shape, as the
    // merchant and pharmacy dispatch paths.
    runAfterResponse(`dispatch ${ride.taskNumber}`, () =>
      DispatchService.findAndAssign({
        taskId: ride.id,
        taskType,
        pickupLatitude: pickupLatitude || 0,
        pickupLongitude: pickupLongitude || 0,
      }).then(async (result) => {
      if (result.success && result.match) {
        try {
          await createAuditLog({
            action: AuditActions.DISPATCH_ASSIGNED,
            entityType: EntityTypes.DISPATCH,
            entityId: result.match.id,
            actorType: 'SYSTEM',
            taskId: ride.id,
            description: `Dispatch match created for ride ${ride.taskNumber}, awaiting rider acceptance`,
          });
        } catch {}
      } else if (result.noRidersAvailable) {
        // No riders available - transition to SEARCHING
        try {
          await EnhancedTaskStateMachine.transition(
            ride.id,
            TaskStatus.SEARCHING,
            { triggeredByType: 'SYSTEM', reason: 'No riders available, continuing search' }
          );
        } catch {}
      }
      })
    );

    return NextResponse.json({ success: true, data: matchingRide }, { status: 201 });
  } catch (error) {
    console.error('Rides POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create ride' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
