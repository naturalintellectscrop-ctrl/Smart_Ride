/**
 * Health Provider Verification API
 * POST /api/admin/health-providers/verify - Approve or reject health provider
 * GET /api/admin/health-providers/verify - Get pending health providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { VerificationStatus } from '@prisma/client';

// GET - Fetch pending health providers
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const providerType = searchParams.get('providerType');

    const where: any = {
      verificationStatus: status as VerificationStatus,
    };

    if (providerType) {
      where.providerType = providerType;
    }

    const providers = await db.healthProvider.findMany({
      where,
      include: {
        documents: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Error fetching health providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health providers' },
      { status: 500 }
    );
  }
}

// POST - Approve or reject health provider
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { providerId, action, notes, rejectionReason } = body;

    if (!providerId || !action) {
      return NextResponse.json(
        { error: 'providerId and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'suspend', 'activate', 'request_documents'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, suspend, activate, or request_documents' },
        { status: 400 }
      );
    }

    const provider = await db.healthProvider.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Health provider not found' },
        { status: 404 }
      );
    }

    let newStatus: VerificationStatus;
    let updateData: any = {
      verifiedBy: decoded.userId,
      verifiedAt: new Date(),
    };

    switch (action) {
      case 'approve':
        newStatus = VerificationStatus.APPROVED;
        updateData.isOpenNow = true;
        updateData.verificationNotes = notes;
        break;
      case 'reject':
        newStatus = VerificationStatus.REJECTED;
        updateData.rejectionReason = rejectionReason || notes;
        break;
      case 'suspend':
        newStatus = VerificationStatus.SUSPENDED;
        updateData.isOpenNow = false;
        break;
      case 'activate':
        newStatus = VerificationStatus.APPROVED;
        updateData.isOpenNow = true;
        break;
      case 'request_documents':
        newStatus = VerificationStatus.DOCUMENTS_REQUESTED;
        updateData.verificationNotes = notes;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update provider
    const updatedProvider = await db.healthProvider.update({
      where: { id: providerId },
      data: {
        verificationStatus: newStatus,
        ...updateData,
      },
    });

    // Update documents status if approving
    if (action === 'approve') {
      await db.document.updateMany({
        where: { providerId },
        data: {
          status: 'APPROVED',
          verifiedBy: decoded.userId,
          verifiedAt: new Date(),
          verificationNotes: notes,
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        userId: decoded.userId,
        action: `PROVIDER_${action.toUpperCase()}`,
        entityType: 'HealthProvider',
        entityId: providerId,
        description: `Health provider ${action}ed: ${provider.businessName}`,
        oldValues: JSON.stringify({ status: provider.verificationStatus }),
        newValues: JSON.stringify({ status: newStatus }),
      },
    });

    // Create notification for provider user
    if (provider.user) {
      await db.notification.create({
        data: {
          userId: provider.user.id,
          title: action === 'approve' ? 'Verification Approved!' : 'Verification Update',
          message: action === 'approve' 
            ? 'Your health provider account has been verified. You can now start receiving orders!'
            : action === 'reject'
            ? `Your provider application was not approved. Reason: ${rejectionReason || notes}`
            : action === 'request_documents'
            ? 'Additional documents are required for verification. Please check your dashboard.'
            : `Your provider account status has been updated.`,
          type: 'VERIFICATION',
          referenceId: providerId,
          referenceType: 'HealthProvider',
        },
      });
    }

    return NextResponse.json({
      success: true,
      provider: updatedProvider,
      message: `Health provider ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Error verifying health provider:', error);
    return NextResponse.json(
      { error: 'Failed to verify health provider' },
      { status: 500 }
    );
  }
}
