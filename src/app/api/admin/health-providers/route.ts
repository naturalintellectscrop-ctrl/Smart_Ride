import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/health-providers - List all health providers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: any = {};
    if (status) {
      where.verificationStatus = status;
    }
    if (type) {
      where.providerType = type;
    }

    const providers = await db.healthProvider.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            documentName: true,
            isVerified: true,
          },
        },
      },
    });

    const total = await db.healthProvider.count({ where });

    return NextResponse.json({
      providers,
      total,
      hasMore: offset + providers.length < total,
    });
  } catch (error) {
    console.error('Error fetching health providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health providers' },
      { status: 500 }
    );
  }
}

// POST /api/admin/health-providers - Create a new health provider (admin action)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessName,
      providerType,
      licenseNumber,
      licenseDocumentUrl,
      licenseExpiryDate,
      issuingAuthority,
      ownerFullName,
      ownerPhone,
      ownerEmail,
      ownerNIN,
      address,
      city,
      district,
      latitude,
      longitude,
      serviceRadius,
      facilityPhotoUrl,
      interiorPhotoUrl,
      operatingHours,
      is24Hours,
      supportsPrescription,
      supportsOTC,
      supportsDelivery,
      supportsPickup,
      offersConsultation,
      emergencyContactName,
      emergencyContactPhone,
      bankName,
      bankAccountName,
      bankAccountNumber,
      mobileMoneyNumber,
      mobileMoneyProvider,
      verificationStatus,
    } = body;

    // Validate required fields
    if (!businessName || !providerType || !licenseNumber || !ownerFullName || !ownerPhone || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: businessName, providerType, licenseNumber, ownerFullName, ownerPhone, address' },
        { status: 400 }
      );
    }

    // Check if license number is already used
    const existingLicense = await db.healthProvider.findFirst({
      where: { licenseNumber },
    });

    if (existingLicense) {
      return NextResponse.json(
        { error: 'License number already registered' },
        { status: 400 }
      );
    }

    // Create the provider
    const provider = await db.healthProvider.create({
      data: {
        businessName,
        providerType,
        licenseNumber,
        licenseDocumentUrl,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : undefined,
        issuingAuthority,
        ownerFullName,
        ownerPhone,
        ownerEmail,
        ownerNIN,
        address,
        city,
        district,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        serviceRadius: serviceRadius ? parseInt(serviceRadius) : 10,
        facilityPhotoUrl,
        interiorPhotoUrl,
        operatingHours: operatingHours ? JSON.stringify(operatingHours) : undefined,
        is24Hours: is24Hours || false,
        supportsPrescription: supportsPrescription ?? true,
        supportsOTC: supportsOTC ?? true,
        supportsDelivery: supportsDelivery ?? true,
        supportsPickup: supportsPickup ?? true,
        offersConsultation: offersConsultation || false,
        emergencyContactName,
        emergencyContactPhone,
        bankName,
        bankAccountName,
        bankAccountNumber,
        mobileMoneyNumber,
        mobileMoneyProvider,
        verificationStatus: verificationStatus || 'PENDING',
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        action: 'ADMIN_CREATED_PROVIDER',
        entityType: 'HealthProvider',
        entityId: provider.id,
        description: `Admin created health provider: ${businessName}`,
      },
    });

    return NextResponse.json({
      success: true,
      provider,
      message: 'Health provider created successfully',
    });
  } catch (error) {
    console.error('Error creating health provider:', error);
    return NextResponse.json(
      { error: 'Failed to create health provider' },
      { status: 500 }
    );
  }
}
