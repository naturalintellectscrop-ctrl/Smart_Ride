/**
 * Menu Items API
 * GET /api/merchants/menu - Get all menu items for a merchant
 * POST /api/merchants/menu - Create a new menu item
 * PUT /api/merchants/menu - Update a menu item
 * DELETE /api/merchants/menu - Delete a menu item
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';

// GET - Fetch menu items for a merchant
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get merchant for this user
    const merchant = await db.merchant.findFirst({
      where: {
        OR: [
          { phone: decoded.phone },
          { email: decoded.email },
        ],
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const menuItems = await db.menuItem.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}

// POST - Create a new menu item
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get merchant for this user
    const merchant = await db.merchant.findFirst({
      where: {
        OR: [
          { phone: decoded.phone },
          { email: decoded.email },
        ],
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Check if merchant is approved
    if (merchant.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Merchant not approved. Please wait for verification.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, price, category, imageUrl, preparationTime, isAvailable } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const menuItem = await db.menuItem.create({
      data: {
        merchantId: merchant.id,
        name,
        description: description || null,
        price: parseFloat(price),
        category: category || null,
        imageUrl: imageUrl || null,
        preparationTime: preparationTime ? parseInt(preparationTime) : null,
        isAvailable: isAvailable !== false,
      },
    });

    return NextResponse.json({ 
      success: true, 
      menuItem,
      message: 'Menu item created successfully' 
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    );
  }
}

// PUT - Update a menu item
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get merchant for this user
    const merchant = await db.merchant.findFirst({
      where: {
        OR: [
          { phone: decoded.phone },
          { email: decoded.email },
        ],
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { itemId, ...updateData } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Verify the item belongs to this merchant
    const existingItem = await db.menuItem.findFirst({
      where: { id: itemId, merchantId: merchant.id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const dataToUpdate: Record<string, unknown> = {};
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.price !== undefined) dataToUpdate.price = parseFloat(updateData.price as string);
    if (updateData.category !== undefined) dataToUpdate.category = updateData.category;
    if (updateData.imageUrl !== undefined) dataToUpdate.imageUrl = updateData.imageUrl;
    if (updateData.preparationTime !== undefined) dataToUpdate.preparationTime = parseInt(updateData.preparationTime as string);
    if (updateData.isAvailable !== undefined) dataToUpdate.isAvailable = updateData.isAvailable;

    const updatedItem = await db.menuItem.update({
      where: { id: itemId },
      data: dataToUpdate,
    });

    return NextResponse.json({ 
      success: true, 
      menuItem: updatedItem,
      message: 'Menu item updated successfully' 
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a menu item
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get merchant for this user
    const merchant = await db.merchant.findFirst({
      where: {
        OR: [
          { phone: decoded.phone },
          { email: decoded.email },
        ],
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Verify the item belongs to this merchant
    const existingItem = await db.menuItem.findFirst({
      where: { id: itemId, merchantId: merchant.id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    await db.menuItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Menu item deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}
