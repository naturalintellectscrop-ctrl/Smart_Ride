import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import { enumParam, requireEnumParam } from '@/lib/api/enum-params';
import { MedicineCategory } from '@prisma/client';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// GET /api/health-provider/catalog - Get medicine catalog for provider

/**
 * Only the provider that owns a catalogue may change it.
 *
 * GET is left open deliberately — a customer browses medicines before signing
 * in, and the catalogue is the storefront. The writes were open too, which is
 * what this closes: anyone could add, reprice or delete another pharmacy's
 * stock, including changing whether an item requires a prescription.
 */
async function ownsProvider(
  request: NextRequest,
  providerId: string | null | undefined
): Promise<NextResponse | null> {
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.statusCode || 401 }
    );
  }
  if (isAdmin(auth.user.role)) return null;

  const own = await db.healthProvider.findUnique({
    where: { userId: auth.user.userId },
    select: { id: true },
  });
  if (!own) {
    return NextResponse.json(
      { success: false, error: 'No health provider account for this user' },
      { status: 403 }
    );
  }
  if (providerId && providerId !== own.id) {
    return NextResponse.json(
      { success: false, error: 'This catalogue belongs to another provider' },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  await setServiceRoleContext();
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
      return NextResponse.json({ success: false, error: 'providerId is required' },
        { status: 400 }
      );
    }

    const where: Prisma.MedicineCatalogWhereInput = { providerId };
    const categoryFilter = enumParam(MedicineCategory, category);
    if (categoryFilter) where.category = categoryFilter;
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
    return NextResponse.json({ success: false, error: 'Failed to fetch medicine catalog' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST /api/health-provider/catalog - Add medicine to catalog
export async function POST(request: NextRequest) {
  const denied = await ownsProvider(request, new URL(request.url).searchParams.get('providerId'));
  if (denied) return denied;

  await setServiceRoleContext();
  try {
    const body = await request.json();

    const medicineCatalogSchema = z.object({
      providerId: z.string().min(1),
      name: z.string().min(1).max(200),
      genericName: z.string().max(200).optional(),
      description: z.string().max(1000).optional(),
      // Must be a real MedicineCategory — a free string here reached Prisma
      // and threw on an unknown value.
      category: z.enum(MedicineCategory),
      manufacturer: z.string().max(200).optional(),
      dosageForm: z.string().max(100).optional(),
      strength: z.string().max(100).optional(),
      packSize: z.string().max(50).optional(),
      price: z.number().positive(),
      discountedPrice: z.number().positive().optional(),
      isAvailable: z.boolean().optional(),
      stockQuantity: z.number().int().min(0).optional(),
      lowStockThreshold: z.number().int().min(0).optional(),
      requiresPrescription: z.boolean().optional(),
      isControlled: z.boolean().optional(),
      controlledLevel: z.string().max(50).optional(),
      storageCondition: z.string().max(200).optional(),
      handlingInstructions: z.string().max(500).optional(),
      shelfLife: z.string().max(100).optional(),
      imageUrl: z.string().url().optional(),
      // Stored as a single string column; accept an array and join it.
      searchKeywords: z.array(z.string()).optional(),
    });

    const parsed = medicineCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    // providerId arrives in the BODY here, not the query string, so it has to
    // be re-checked after parsing — the guard above only saw the URL.
    const bodyDenied = await ownsProvider(request, parsed.data.providerId);
    if (bodyDenied) return bodyDenied;

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
    } = parsed.data;

    // Verify provider exists and is approved
    const provider = await db.healthProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json({ success: false, error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (provider.verificationStatus !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'Provider is not verified' },
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
        searchKeywords: searchKeywords?.join(','),
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
    return NextResponse.json({ success: false, error: 'Failed to add medicine to catalog' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// PATCH /api/health-provider/catalog - Update medicine in catalog
export async function PATCH(request: NextRequest) {
  const denied = await ownsProvider(request, new URL(request.url).searchParams.get('providerId'));
  if (denied) return denied;

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { medicineId, ...updateData } = body;

    if (!medicineId) {
      return NextResponse.json({ success: false, error: 'medicineId is required' },
        { status: 400 }
      );
    }

    const medicine = await db.medicineCatalog.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      return NextResponse.json({ success: false, error: 'Medicine not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const data: Prisma.MedicineCatalogUpdateInput = {};
    
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
    return NextResponse.json({ success: false, error: 'Failed to update medicine' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// DELETE /api/health-provider/catalog - Remove medicine from catalog
export async function DELETE(request: NextRequest) {
  const denied = await ownsProvider(request, new URL(request.url).searchParams.get('providerId'));
  if (denied) return denied;

  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);
    const medicineId = searchParams.get('medicineId');

    if (!medicineId) {
      return NextResponse.json({ success: false, error: 'medicineId is required' },
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
      return NextResponse.json({ success: false, error: 'Cannot delete medicine with active orders. Mark as unavailable instead.' },
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
    return NextResponse.json({ success: false, error: 'Failed to delete medicine' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
