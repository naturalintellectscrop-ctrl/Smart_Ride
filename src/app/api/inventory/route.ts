/**
 * Inventory API Route
 * GET: Check availability. Query: ?menuItemId=xxx&quantity=2&variantId=yyy
 * POST: Reserve stock. Body: { menuItemId, quantity, variantId?, orderId?, taskId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/lib/inventory/inventory-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get('menuItemId');
    const quantityStr = searchParams.get('quantity');
    const variantId = searchParams.get('variantId');

    if (!menuItemId) {
      return NextResponse.json(
        { error: 'menuItemId is required' },
        { status: 400 }
      );
    }

    const quantity = quantityStr ? parseInt(quantityStr, 10) : 1;

    if (isNaN(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: 'quantity must be a positive integer' },
        { status: 400 }
      );
    }

    const result = await InventoryService.checkAvailability(
      menuItemId,
      quantity,
      variantId || undefined
    );

    return NextResponse.json({
      available: result.available,
      menuItemId: result.menuItemId,
      requestedQuantity: result.requestedQuantity,
      availableQuantity: result.availableQuantity,
      isAvailable: result.isAvailable,
      variantAvailable: result.variantAvailable,
      variantAvailableQuantity: result.variantAvailableQuantity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[InventoryAPI] GET /inventory failed:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      menuItemId?: string;
      quantity?: number;
      variantId?: string;
      orderId?: string;
      taskId?: string;
    };

    if (!body.menuItemId) {
      return NextResponse.json(
        { error: 'menuItemId is required' },
        { status: 400 }
      );
    }

    if (!body.quantity || body.quantity < 1) {
      return NextResponse.json(
        { error: 'quantity is required and must be a positive integer' },
        { status: 400 }
      );
    }

    const result = await InventoryService.reserveStock(
      body.menuItemId,
      body.quantity,
      {
        variantId: body.variantId,
        orderId: body.orderId,
        taskId: body.taskId,
      }
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        reservationId: result.reservationId,
      }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 409 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[InventoryAPI] POST /inventory failed:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
