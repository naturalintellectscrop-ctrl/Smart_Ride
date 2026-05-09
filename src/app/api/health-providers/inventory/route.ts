/**
 * Health Provider Inventory API
 * GET /api/health-providers/inventory - Get all medicines for a provider
 * POST /api/health-providers/inventory - Create a new medicine
 * PUT /api/health-providers/inventory - Update a medicine
 * DELETE /api/health-providers/inventory - Delete a medicine
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';

// GET - Fetch medicines for a health provider
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

    // Get health provider for this user
    const provider = await db.healthProvider.findFirst({
      where: {
        OR: [
          { ownerPhone: decoded.phone },
          { ownerEmail: decoded.email },
          { userId: decoded.userId },
        ],
      },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Health provider not found' }, { status: 404 });
    }

    const medicines = await db.medicineCatalog.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ medicines });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medicines' },
      { status: 500 }
    );
  }
}

// POST - Create a new medicine
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

    // Get health provider for this user
    const provider = await db.healthProvider.findFirst({
      where: {
        OR: [
          { ownerPhone: decoded.phone },
          { ownerEmail: decoded.email },
          { userId: decoded.userId },
        ],
      },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Health provider not found' }, { status: 404 });
    }

    // Check if provider is approved
    if (provider.verificationStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Provider not approved. Please wait for verification.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      genericName, 
      description, 
      category, 
      manufacturer, 
      price, 
      stockQuantity,
      requiresPrescription,
      storageCondition,
      handlingInstructions,
      imageUrl,
      isAvailable 
    } = body;

    if (!name || !price || !category) {
      return NextResponse.json(
        { error: 'Name, price, and category are required' },
        { status: 400 }
      );
    }

    const medicine = await db.medicineCatalog.create({
      data: {
        providerId: provider.id,
        name,
        genericName: genericName || null,
        description: description || null,
        category: category as any,
        manufacturer: manufacturer || null,
        price: parseFloat(price),
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : null,
        requiresPrescription: requiresPrescription === true,
        storageCondition: storageCondition || null,
        handlingInstructions: handlingInstructions || null,
        imageUrl: imageUrl || null,
        isAvailable: isAvailable !== false,
      },
    });

    return NextResponse.json({ 
      success: true, 
      medicine,
      message: 'Medicine added successfully' 
    });
  } catch (error) {
    console.error('Error creating medicine:', error);
    return NextResponse.json(
      { error: 'Failed to add medicine' },
      { status: 500 }
    );
  }
}

// PUT - Update a medicine
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

    // Get health provider for this user
    const provider = await db.healthProvider.findFirst({
      where: {
        OR: [
          { ownerPhone: decoded.phone },
          { ownerEmail: decoded.email },
          { userId: decoded.userId },
        ],
      },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Health provider not found' }, { status: 404 });
    }

    const body = await request.json();
    const { medicineId, ...updateData } = body;

    if (!medicineId) {
      return NextResponse.json(
        { error: 'Medicine ID is required' },
        { status: 400 }
      );
    }

    // Verify the medicine belongs to this provider
    const existingMedicine = await db.medicineCatalog.findFirst({
      where: { id: medicineId, providerId: provider.id },
    });

    if (!existingMedicine) {
      return NextResponse.json(
        { error: 'Medicine not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const dataToUpdate: Record<string, unknown> = {};
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.genericName !== undefined) dataToUpdate.genericName = updateData.genericName;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.category !== undefined) dataToUpdate.category = updateData.category;
    if (updateData.manufacturer !== undefined) dataToUpdate.manufacturer = updateData.manufacturer;
    if (updateData.price !== undefined) dataToUpdate.price = parseFloat(updateData.price as string);
    if (updateData.stockQuantity !== undefined) dataToUpdate.stockQuantity = parseInt(updateData.stockQuantity as string);
    if (updateData.requiresPrescription !== undefined) dataToUpdate.requiresPrescription = updateData.requiresPrescription;
    if (updateData.storageCondition !== undefined) dataToUpdate.storageCondition = updateData.storageCondition;
    if (updateData.handlingInstructions !== undefined) dataToUpdate.handlingInstructions = updateData.handlingInstructions;
    if (updateData.imageUrl !== undefined) dataToUpdate.imageUrl = updateData.imageUrl;
    if (updateData.isAvailable !== undefined) dataToUpdate.isAvailable = updateData.isAvailable;

    const updatedMedicine = await db.medicineCatalog.update({
      where: { id: medicineId },
      data: dataToUpdate,
    });

    return NextResponse.json({ 
      success: true, 
      medicine: updatedMedicine,
      message: 'Medicine updated successfully' 
    });
  } catch (error) {
    console.error('Error updating medicine:', error);
    return NextResponse.json(
      { error: 'Failed to update medicine' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a medicine
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

    // Get health provider for this user
    const provider = await db.healthProvider.findFirst({
      where: {
        OR: [
          { ownerPhone: decoded.phone },
          { ownerEmail: decoded.email },
          { userId: decoded.userId },
        ],
      },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Health provider not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const medicineId = searchParams.get('medicineId');

    if (!medicineId) {
      return NextResponse.json(
        { error: 'Medicine ID is required' },
        { status: 400 }
      );
    }

    // Verify the medicine belongs to this provider
    const existingMedicine = await db.medicineCatalog.findFirst({
      where: { id: medicineId, providerId: provider.id },
    });

    if (!existingMedicine) {
      return NextResponse.json(
        { error: 'Medicine not found' },
        { status: 404 }
      );
    }

    await db.medicineCatalog.delete({
      where: { id: medicineId },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Medicine deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    return NextResponse.json(
      { error: 'Failed to delete medicine' },
      { status: 500 }
    );
  }
}
