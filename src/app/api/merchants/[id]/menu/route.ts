/**
 * Public Menu API - Client-facing
 * GET /api/merchants/[id]/menu - Get menu items for a specific merchant (no auth required)
 * This endpoint is used by customers browsing restaurants
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/merchants/[id]/menu
 * Get all available menu items for a specific merchant
 * Public endpoint - no authentication required
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const availableOnly = searchParams.get('available') !== 'false'; // Default: true

    // Verify merchant exists and is approved
    const merchant = await db.merchant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        phone: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        isOpen: true,
        averagePrepTime: true,
        rating: true,
        totalOrders: true,
        openingTime: true,
        closingTime: true,
        logoUrl: true,
        coverImageUrl: true,
        status: true,
      },
    });

    if (!merchant) {
      return notFoundResponse('Merchant');
    }

    if (merchant.status !== 'APPROVED') {
      return notFoundResponse('Merchant');
    }

    // Build where clause for menu items
    const where: Record<string, unknown> = {
      merchantId: id,
    };

    if (availableOnly) {
      where.isAvailable = true;
    }

    if (category) {
      where.category = category;
    }

    // Fetch menu items
    const menuItems = await db.menuItem.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Extract unique categories from menu items
    const categories = [...new Set(
      menuItems
        .map(item => item.category)
        .filter(Boolean) as string[]
    )].sort();

    return successResponse({
      merchant,
      menuItems,
      categories,
      itemCount: menuItems.length,
    });
  } catch (error) {
    console.error('Error fetching merchant menu:', error);
    return serverErrorResponse('Failed to fetch menu');
  }
}
