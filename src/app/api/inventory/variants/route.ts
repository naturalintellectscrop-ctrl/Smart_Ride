/**
 * Inventory Variants API Route
 * POST: Create product variant. Body: { menuItemId, variantName, variantValue, priceModifier?, stockQuantity?, isAvailable?, sku? }
 * GET: Get variants for a product. Query: ?menuItemId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/lib/inventory/inventory-service';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get('menuItemId');

    if (!menuItemId) {
      return NextResponse.json(
        { error: 'menuItemId is required' },
        { status: 400 }
      );
    }

    const variants = await db.productVariant.findMany({
      where: { menuItemId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      variants,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[InventoryAPI] GET /inventory/variants failed:', message);
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
      variantName?: string;
      variantValue?: string;
      priceModifier?: number;
      stockQuantity?: number;
      isAvailable?: boolean;
      sku?: string;
    };

    if (!body.menuItemId) {
      return NextResponse.json(
        { error: 'menuItemId is required' },
        { status: 400 }
      );
    }

    if (!body.variantName) {
      return NextResponse.json(
        { error: 'variantName is required' },
        { status: 400 }
      );
    }

    if (!body.variantValue) {
      return NextResponse.json(
        { error: 'variantValue is required' },
        { status: 400 }
      );
    }

    const result = await InventoryService.createProductVariant(
      body.menuItemId,
      {
        variantName: body.variantName,
        variantValue: body.variantValue,
        priceModifier: body.priceModifier,
        stockQuantity: body.stockQuantity,
        isAvailable: body.isAvailable,
        sku: body.sku,
      }
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        variantId: result.variantId,
      }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[InventoryAPI] POST /inventory/variants failed:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
