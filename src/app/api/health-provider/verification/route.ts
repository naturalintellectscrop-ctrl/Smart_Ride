import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/health-provider/verification - Get providers pending verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const providerType = searchParams.get('providerType');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status !== 'ALL') {
      where.verificationStatus = status;
    }
    if (providerType) {
      where.providerType = providerType;
    }

    const providers = await db.healthProvider.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    const total = await db.healthProvider.count({ where });

    return NextResponse.json({
      providers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + providers.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching providers for verification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

// PATCH /api/health-provider/verification - Update verification status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, action, adminId, notes, rejectionReason } = body;

    if (!providerId || !action || !adminId) {
      return NextResponse.json(
        { error: 'providerId, action, and adminId are required' },
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

    let updateData: any = {
      verifiedBy: adminId,
      verifiedAt: new Date(),
      verificationNotes: notes,
    };

    switch (action) {
      case 'APPROVE':
        updateData.verificationStatus = 'APPROVED';
        break;

      case 'REJECT':
        updateData.verificationStatus = 'REJECTED';
        updateData.rejectionReason = rejectionReason;
        break;

      case 'REQUEST_DOCUMENTS':
        updateData.verificationStatus = 'DOCUMENTS_REQUESTED';
        updateData.verificationNotes = notes || 'Additional documents required';
        break;

      case 'SUSPEND':
        updateData.verificationStatus = 'SUSPENDED';
        break;

      case 'REACTIVATE':
        updateData.verificationStatus = 'APPROVED';
        updateData.isFlagged = false;
        updateData.flagReason = null;
        updateData.flaggedAt = null;
        updateData.flaggedBy = null;
        break;

      case 'START_REVIEW':
        updateData.verificationStatus = 'UNDER_REVIEW';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedProvider = await db.healthProvider.update({
      where: { id: providerId },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminId,
        action: `PROVIDER_${action}`,
        entityType: 'HealthProvider',
        entityId: providerId,
        description: `Provider verification action: ${action} for ${provider.businessName}`,
        metadata: JSON.stringify({
          previousStatus: provider.verificationStatus,
          newStatus: updateData.verificationStatus,
          notes,
        }),
      },
    });

    // Log to fraud detection system
    if (action === 'REJECT' || action === 'SUSPEND') {
      await fetch('/api/fraud/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: provider.providerType === 'PHARMACY' ? 'PHARMACY' : 'HEALTH_PROVIDER',
          entityId: providerId,
          activityType: action === 'REJECT' ? 'VERIFICATION_REJECTED' : 'ACCOUNT_SUSPENDED',
          activityCategory: 'ACCOUNT_ACTIVITY',
          metadata: {
            businessName: provider.businessName,
            providerType: provider.providerType,
            licenseNumber: provider.licenseNumber,
            reason: rejectionReason || notes,
          },
        }),
      });
    }

    // Send notification to provider
    // TODO: Implement notification system

    return NextResponse.json({
      success: true,
      provider: updatedProvider,
      message: `Provider ${action.toLowerCase()}d successfully`,
    });
  } catch (error) {
    console.error('Error updating provider verification:', error);
    return NextResponse.json(
      { error: 'Failed to update verification status' },
      { status: 500 }
    );
  }
}
