import { NextRequest, NextResponse } from 'next/server';
import { enumParam, requireEnumParam } from '@/lib/api/enum-params';
import { VerificationStatus } from '@prisma/client';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { verifyAccessToken } from '@/lib/auth/jwt';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN'];

// POST /api/health-provider/verify - Admin approves/rejects provider
// SECURITY: Requires an authenticated admin. adminId is derived from the JWT,
// NOT accepted from the request body.
export async function POST(request: NextRequest) {
  // SECURITY: Require admin authentication BEFORE any DB access.
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(decoded.role)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { providerId, action, notes, rejectionReason } = body;

    // adminId comes from the JWT — never trust the request body.
    const adminId = decoded.userId;

    if (!providerId || !action) {
      return NextResponse.json({ success: false, error: 'Provider ID and action are required' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['approve', 'reject', 'suspend', 'request_documents', 'reactivate'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action. Valid actions: approve, reject, suspend, request_documents, reactivate' },
        { status: 400 }
      );
    }

    // Get current provider status
    const currentProvider = await db.healthProvider.findUnique({
      where: { id: providerId },
      select: { verificationStatus: true, businessName: true },
    });

    if (!currentProvider) {
      return NextResponse.json({ success: false, error: 'Provider not found' },
        { status: 404 }
      );
    }

    let newStatus: VerificationStatus;
    let updateData: Prisma.HealthProviderUpdateInput = {
      verifiedBy: adminId,
      verificationNotes: notes,
    };

    switch (action) {
      case 'approve':
        newStatus = 'APPROVED';
        updateData.verifiedAt = new Date();
        break;
      case 'reject':
        newStatus = 'REJECTED';
        updateData.rejectionReason = rejectionReason;
        break;
      case 'suspend':
        newStatus = 'SUSPENDED';
        break;
      case 'request_documents':
        newStatus = 'DOCUMENTS_REQUESTED';
        break;
      case 'reactivate':
        newStatus = 'APPROVED';
        break;
      default:
        newStatus = currentProvider.verificationStatus;
    }

    // Update provider status
    const updatedProvider = await db.healthProvider.update({
      where: { id: providerId },
      data: {
        verificationStatus: newStatus,
        ...updateData,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: adminId,
        actorType: 'ADMIN',
        action: `PROVIDER_${action.toUpperCase()}`,
        entityType: 'HEALTH_PROVIDER',
        entityId: providerId,
        description: `Provider ${currentProvider.businessName} ${action}d by admin`,
        oldValues: JSON.stringify({ status: currentProvider.verificationStatus }),
        newValues: JSON.stringify({ status: newStatus }),
      },
    });

    // If approved, create a notification for the provider (if they have a user account)
    if (action === 'approve' && updatedProvider.userId) {
      await db.notification.create({
        data: {
          userId: updatedProvider.userId,
          title: 'Application Approved!',
          message: `Congratulations! Your health provider application for ${currentProvider.businessName} has been approved. You can now start accepting orders.`,
          type: 'VERIFICATION',
          referenceId: providerId,
          referenceType: 'HEALTH_PROVIDER',
        },
      });
    }

    return NextResponse.json({
      success: true,
      provider: updatedProvider,
      message: `Provider ${action}d successfully`,
    });
  } catch (error) {
    console.error('Error updating provider verification:', error);
    return NextResponse.json({ success: false, error: 'Failed to update provider verification' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// GET /api/health-provider/verify - Get pending providers for admin review
// SECURITY: Requires admin authentication. Returns owner PII + license numbers.
export async function GET(request: NextRequest) {
  // Require admin authentication.
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(decoded.role)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.HealthProviderWhereInput = {};
    
    const verificationStatus = enumParam(VerificationStatus, status);
    if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }

    const [providers, total] = await Promise.all([
      db.healthProvider.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          businessName: true,
          providerType: true,
          verificationStatus: true,
          licenseNumber: true,
          ownerFullName: true,
          ownerPhone: true,
          ownerEmail: true,
          address: true,
          city: true,
          district: true,
          createdAt: true,
          verifiedAt: true,
          verificationNotes: true,
          rejectionReason: true,
          facilityPhotoUrl: true,
          licenseDocumentUrl: true,
        },
      }),
      db.healthProvider.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      providers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching providers for verification:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch providers' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
