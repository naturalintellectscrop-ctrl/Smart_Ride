/**
 * Inventory Reservation API Route
 * PATCH: Confirm or release a reservation. Body: { action: 'confirm' | 'release', orderId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/lib/inventory/inventory-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json() as {
      action?: 'confirm' | 'release';
      orderId?: string;
    };

    if (!body.action || !['confirm', 'release'].includes(body.action)) {
      return NextResponse.json(
        { error: 'action is required and must be "confirm" or "release"' },
        { status: 400 }
      );
    }

    if (body.action === 'confirm') {
      const result = await InventoryService.confirmReservation(id, body.orderId);

      if (result.success) {
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 409 }
      );
    }

    if (body.action === 'release') {
      const result = await InventoryService.releaseReservation(id);

      if (result.success) {
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[InventoryAPI] PATCH /inventory/reservation/[id] failed:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
