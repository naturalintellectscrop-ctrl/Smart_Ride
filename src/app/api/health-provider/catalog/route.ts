import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/health-provider/catalog - Get medicine catalog for provider
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const requiresPrescription = searchParams.get('requiresPrescription');
    const isAvailable = searchParams.get('isAvailable');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!providerId) {
      return NextResponse.json(
        { error: 'providerId is required' },
        { status: 400 }
      );
    }

    const where: any = { providerId };
    if (category) where.category = category;
    if (requiresPrescription !== null) {
      where.requiresPrescription = requiresPrescription === 'true';
    }
    if (isAvailable !== null) {
      where.isAvailable = isAvailable === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ];
    }

    const medicines = await db.medicineCatalog.findMany({
      where,
      orderBy: [{ timesOrdered: 'desc' }, { name: 'asc' }],
      take: limit,
      skip: offset,
    });

    const total = await db.medicineCatalog.count({ where });

    // Get low stock alerts
    const lowStockMedicines = await db.medicineCatalog.findMany({
      where: {
        providerId,
        stockQuantity: { lte: db.medicineCatalog.fields.lowStockThreshold },
        isAvailable: true,
      },
    });

    return NextResponse.json({
      medicines,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + medicines.length < total,
      },
      alerts: {
        lowStock: lowStockMedicines,
        lowStockCount: lowStockMedicines.length,
      },
    });
  } catch (error) {
    console.error('Error fetching medicine catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medicine catalog' },
      { status: 500 }
    );
  }
}

// POST /api/health-provider/catalog - Add medicine to catalog
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      providerId,
      name,
      genericName,
      description,
      category,
      manufacturer,
      dosageForm,
      strength,
      packSize,
      price,
      discountedPrice,
      isAvailable,
      stockQuantity,
      lowStockThreshold,
      requiresPrescription,
      isControlled,
      controlledLevel,
      storageCondition,
      handlingInstructions,
      shelfLife,
      imageUrl,
      searchKeywords,
    } = body;

    if (!providerId || !name || !category || price === undefined) {
      return NextResponse.json(
        { error: 'providerId, name, category, and price are required' },
        { status: 400 }
      );
    }

    // Verify provider exists and is approved
    const provider = await db.healthProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (provider.verificationStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Provider is not verified' },
        { status: 403 }
      );
    }

    const medicine = await db.medicineCatalog.create({
      data: {
        providerId,
        name,
        genericName,
        description,
        category,
        manufacturer,
        dosageForm,
        strength,
        packSize,
        price,
        discountedPrice,
        isAvailable: isAvailable ?? true,
        stockQuantity,
        lowStockThreshold: lowStockThreshold || 10,
        requiresPrescription: requiresPrescription ?? false,
        isControlled: isControlled ?? false,
        controlledLevel,
        storageCondition,
        handlingInstructions,
        shelfLife,
        imageUrl,
        searchKeywords,
      },
    });

    // Log to fraud detection if controlled substance
    if (isControlled) {
      await fetch('/api/fraud/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: provider.providerType === 'PHARMACY' ? 'PHARMACY' : 'HEALTH_PROVIDER',
          entityId: providerId,
          activityType: 'CONTROLLED_MEDICINE_ADDED',
          activityCategory: 'PRESCRIPTION_ACTIVITY',
          metadata: {
            medicineId: medicine.id,
            medicineName: name,
            controlledLevel,
            providerType: provider.providerType,
          },
        }),
      });
    }

    return NextResponse.json({
      success: true,
      medicine,
    });
  } catch (error) {
    console.error('Error adding medicine to catalog:', error);
    return NextResponse.json(
      { error: 'Failed to add medicine to catalog' },
      { status: 500 }
    );
  }
}

// PATCH /api/health-provider/catalog - Update medicine in catalog
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { medicineId, ...updateData } = body;

    if (!medicineId) {
      return NextResponse.json(
        { error: 'medicineId is required' },
        { status: 400 }
      );
    }

    const medicine = await db.medicineCatalog.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      return NextResponse.json(
        { error: 'Medicine not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const data: any = {};
    
    // Basic fields
    const updatableFields = [
      'name', 'genericName', 'description', 'category', 'manufacturer',
      'dosageForm', 'strength', 'packSize', 'price', 'discountedPrice',
      'isAvailable', 'stockQuantity', 'lowStockThreshold',
      'requiresPrescription', 'isControlled', 'controlledLevel',
      'storageCondition', 'handlingInstructions', 'shelfLife',
      'imageUrl', 'searchKeywords'
    ];

    for (const field of updatableFields) {
      if (updateData[field] !== undefined) {
        data[field] = updateData[field];
      }
    }

    // Track stock changes
    if (updateData.stockQuantity !== undefined && updateData.stockQuantity !== medicine.stockQuantity) {
      data.lastRestockedAt = new Date();
    }

    const updatedMedicine = await db.medicineCatalog.update({
      where: { id: medicineId },
      data,
    });

    return NextResponse.json({
      success: true,
      medicine: updatedMedicine,
    });
  } catch (error) {
    console.error('Error updating medicine:', error);
    return NextResponse.json(
      { error: 'Failed to update medicine' },
      { status: 500 }
    );
  }
}

// DELETE /api/health-provider/catalog - Remove medicine from catalog
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const medicineId = searchParams.get('medicineId');

    if (!medicineId) {
      return NextResponse.json(
        { error: 'medicineId is required' },
        { status: 400 }
      );
    }

    // Check if medicine is part of any active orders
    const activeOrders = await db.healthOrderItem.count({
      where: {
        medicineCatalogId: medicineId,
        healthOrder: {
          status: { in: ['ORDER_PLACED', 'PHARMACY_REVIEW', 'PREPARING_ORDER', 'READY_FOR_PICKUP'] },
        },
      },
    });

    if (activeOrders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete medicine with active orders. Mark as unavailable instead.' },
        { status: 400 }
      );
    }

    await db.medicineCatalog.delete({
      where: { id: medicineId },
    });

    return NextResponse.json({
      success: true,
      message: 'Medicine removed from catalog',
    });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    return NextResponse.json(
      { error: 'Failed to delete medicine' },
      { status: 500 }
    );
  }
}
