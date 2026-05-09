/**
 * Merchant Verification API
 * POST /api/admin/merchants/verify - Approve or reject merchant
 * GET /api/admin/merchants/verify - Get pending merchants
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { MerchantStatus, DocumentStatus } from '@prisma/client';

// GET - Fetch pending merchants
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
    const status = searchParams.get('status') || 'PENDING_APPROVAL';

    const merchants = await db.merchant.findMany({
      where: {
        status: status as MerchantStatus,
      },
      include: {
        documents: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ merchants });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchants' },
      { status: 500 }
    );
  }
}

// POST - Approve or reject merchant
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
    const { merchantId, action, notes, rejectionReason } = body;

    if (!merchantId || !action) {
      return NextResponse.json(
        { error: 'merchantId and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'suspend', 'activate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, suspend, or activate' },
        { status: 400 }
      );
    }

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    let newStatus: MerchantStatus;
    let updateData: any = {
      verifiedBy: decoded.userId,
      verifiedAt: new Date(),
    };

    switch (action) {
      case 'approve':
        newStatus = MerchantStatus.APPROVED;
        updateData.isOpen = true;
        break;
      case 'reject':
        newStatus = MerchantStatus.REJECTED;
        updateData.rejectionReason = rejectionReason || notes;
        break;
      case 'suspend':
        newStatus = MerchantStatus.SUSPENDED;
        updateData.isOpen = false;
        break;
      case 'activate':
        newStatus = MerchantStatus.APPROVED;
        updateData.isOpen = true;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update merchant
    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        status: newStatus,
        ...updateData,
      },
    });

    // Update documents status if approving
    if (action === 'approve') {
      await db.document.updateMany({
        where: { merchantId },
        data: {
          status: DocumentStatus.APPROVED,
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
        action: `MERCHANT_${action.toUpperCase()}`,
        entityType: 'Merchant',
        entityId: merchantId,
        description: `Merchant ${action}ed: ${merchant.name}`,
        oldValues: JSON.stringify({ status: merchant.status }),
        newValues: JSON.stringify({ status: newStatus }),
      },
    });

    // Create notification for merchant user
    const merchantUser = await db.user.findFirst({
      where: {
        phone: merchant.phone,
        role: 'MERCHANT',
      },
    });

    if (merchantUser) {
      await db.notification.create({
        data: {
          userId: merchantUser.id,
          title: action === 'approve' ? 'Verification Approved!' : 'Verification Update',
          message: action === 'approve' 
            ? 'Your merchant account has been verified. You can now start receiving orders!'
            : action === 'reject'
            ? `Your merchant application was not approved. Reason: ${rejectionReason || notes}`
            : `Your merchant account status has been updated.`,
          type: 'VERIFICATION',
          referenceId: merchantId,
          referenceType: 'Merchant',
        },
      });
    }

    return NextResponse.json({
      success: true,
      merchant: updatedMerchant,
      message: `Merchant ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Error verifying merchant:', error);
    return NextResponse.json(
      { error: 'Failed to verify merchant' },
      { status: 500 }
    );
  }
}
