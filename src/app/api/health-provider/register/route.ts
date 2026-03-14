import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/health-provider/register - Get registration status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const provider = await db.healthProvider.findUnique({
      where: { userId },
      include: {
        documents: true,
      },
    });

    if (!provider) {
      return NextResponse.json({
        registered: false,
        provider: null,
      });
    }

    return NextResponse.json({
      registered: true,
      provider,
    });
  } catch (error) {
    console.error('Error fetching provider registration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registration status' },
      { status: 500 }
    );
  }
}

// POST /api/health-provider/register - Register a new health provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
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
      additionalPhotos,
      additionalDocuments,
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
    } = body;

    // Validate required fields
    if (!businessName || !providerType || !licenseNumber || !ownerFullName || !ownerPhone || !address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already has a provider registration
    const existingProvider = await db.healthProvider.findUnique({
      where: { userId },
    });

    if (existingProvider) {
      return NextResponse.json(
        { error: 'Provider already registered', provider: existingProvider },
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

    // Create the provider registration
    const provider = await db.healthProvider.create({
      data: {
        userId,
        businessName,
        providerType,
        licenseNumber,
        licenseDocumentUrl,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
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
        serviceRadius: serviceRadius || 10,
        facilityPhotoUrl,
        interiorPhotoUrl,
        additionalPhotos: additionalPhotos ? JSON.stringify(additionalPhotos) : null,
        additionalDocuments: additionalDocuments ? JSON.stringify(additionalDocuments) : null,
        operatingHours: operatingHours ? JSON.stringify(operatingHours) : null,
        is24Hours: is24Hours || false,
        supportsPrescription: supportsPrescription ?? true,
        supportsOTC: supportsOTC ?? true,
        supportsDelivery: supportsDelivery ?? true,
        supportsPickup: supportsPickup ?? true,
        offersConsultation: offersConsultation || false,
        verificationStatus: 'PENDING',
        emergencyContactName,
        emergencyContactPhone,
        bankName,
        bankAccountName,
        bankAccountNumber,
        mobileMoneyNumber,
        mobileMoneyProvider,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'USER',
        userId,
        action: 'PROVIDER_REGISTRATION',
        entityType: 'HealthProvider',
        entityId: provider.id,
        description: `Health provider registration submitted: ${businessName}`,
      },
    });

    // Log to fraud detection system
    await fetch('/api/fraud/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'PHARMACY',
        entityId: provider.id,
        activityType: 'PROVIDER_REGISTRATION',
        activityCategory: 'ACCOUNT_ACTIVITY',
        metadata: {
          providerType,
          licenseNumber,
          city,
          district,
        },
      }),
    });

    return NextResponse.json({
      success: true,
      provider,
      message: 'Registration submitted successfully. Awaiting verification.',
    });
  } catch (error) {
    console.error('Error registering health provider:', error);
    return NextResponse.json(
      { error: 'Failed to register health provider' },
      { status: 500 }
    );
  }
}

// PATCH /api/health-provider/register - Update provider registration
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, ...updateData } = body;

    if (!providerId) {
      return NextResponse.json(
        { error: 'providerId is required' },
        { status: 400 }
      );
    }

    const provider = await db.healthProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Only allow updates if status is PENDING or DOCUMENTS_REQUESTED
    if (!['PENDING', 'DOCUMENTS_REQUESTED'].includes(provider.verificationStatus)) {
      return NextResponse.json(
        { error: 'Cannot update registration in current status' },
        { status: 400 }
      );
    }

    // Prepare update data
    const data: any = {};
    
    // Basic info
    if (updateData.businessName) data.businessName = updateData.businessName;
    if (updateData.licenseNumber) data.licenseNumber = updateData.licenseNumber;
    if (updateData.licenseDocumentUrl) data.licenseDocumentUrl = updateData.licenseDocumentUrl;
    if (updateData.licenseExpiryDate) data.licenseExpiryDate = new Date(updateData.licenseExpiryDate);
    if (updateData.issuingAuthority) data.issuingAuthority = updateData.issuingAuthority;
    
    // Owner info
    if (updateData.ownerFullName) data.ownerFullName = updateData.ownerFullName;
    if (updateData.ownerPhone) data.ownerPhone = updateData.ownerPhone;
    if (updateData.ownerEmail) data.ownerEmail = updateData.ownerEmail;
    if (updateData.ownerNIN) data.ownerNIN = updateData.ownerNIN;
    
    // Location
    if (updateData.address) data.address = updateData.address;
    if (updateData.city) data.city = updateData.city;
    if (updateData.district) data.district = updateData.district;
    if (updateData.latitude) data.latitude = updateData.latitude;
    if (updateData.longitude) data.longitude = updateData.longitude;
    if (updateData.serviceRadius) data.serviceRadius = updateData.serviceRadius;
    
    // Photos
    if (updateData.facilityPhotoUrl) data.facilityPhotoUrl = updateData.facilityPhotoUrl;
    if (updateData.interiorPhotoUrl) data.interiorPhotoUrl = updateData.interiorPhotoUrl;
    if (updateData.additionalPhotos) data.additionalPhotos = JSON.stringify(updateData.additionalPhotos);
    if (updateData.additionalDocuments) data.additionalDocuments = JSON.stringify(updateData.additionalDocuments);
    
    // Operations
    if (updateData.operatingHours) data.operatingHours = JSON.stringify(updateData.operatingHours);
    if (updateData.is24Hours !== undefined) data.is24Hours = updateData.is24Hours;
    
    // Capabilities
    if (updateData.supportsPrescription !== undefined) data.supportsPrescription = updateData.supportsPrescription;
    if (updateData.supportsOTC !== undefined) data.supportsOTC = updateData.supportsOTC;
    if (updateData.supportsDelivery !== undefined) data.supportsDelivery = updateData.supportsDelivery;
    if (updateData.supportsPickup !== undefined) data.supportsPickup = updateData.supportsPickup;
    if (updateData.offersConsultation !== undefined) data.offersConsultation = updateData.offersConsultation;
    
    // Bank details
    if (updateData.bankName) data.bankName = updateData.bankName;
    if (updateData.bankAccountName) data.bankAccountName = updateData.bankAccountName;
    if (updateData.bankAccountNumber) data.bankAccountNumber = updateData.bankAccountNumber;
    if (updateData.mobileMoneyNumber) data.mobileMoneyNumber = updateData.mobileMoneyNumber;
    if (updateData.mobileMoneyProvider) data.mobileMoneyProvider = updateData.mobileMoneyProvider;

    const updatedProvider = await db.healthProvider.update({
      where: { id: providerId },
      data,
    });

    return NextResponse.json({
      success: true,
      provider: updatedProvider,
    });
  } catch (error) {
    console.error('Error updating provider registration:', error);
    return NextResponse.json(
      { error: 'Failed to update registration' },
      { status: 500 }
    );
  }
}
