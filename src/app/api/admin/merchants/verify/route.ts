/**
 * Merchant Verification API
 * POST /api/admin/merchants/verify - Approve or reject merchant
 * GET /api/admin/merchants/verify - Get pending merchants
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { MerchantStatus, DocumentStatus, PharmacyStatus, Prisma } from '@prisma/client';

// GET - Fetch pending merchants
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded || !['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING_APPROVAL';

    const merchants = await db.merchant.findMany({
      // status=all returns every merchant/pharmacy (admin list with filters).
      where: status === 'all' ? {} : { status: status as MerchantStatus },
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Document has no Prisma relation to Merchant (scalar merchantId), so fetch
    // documents + pharmacy records separately and attach them for the admin UI.
    const ids = merchants.map((m) => m.id);
    const [docs, pharmacies] = await Promise.all([
      db.document.findMany({ where: { merchantId: { in: ids } } }),
      db.pharmacy.findMany({ where: { merchantId: { in: ids } } }),
    ]);
    const withDocs = merchants.map((m) => ({
      ...m,
      documents: docs.filter((d) => d.merchantId === m.id),
      pharmacy: pharmacies.find((p) => p.merchantId === m.id) || null,
    }));

    return NextResponse.json({ merchants: withDocs });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch merchants' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST - Approve or reject merchant
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded || !['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const body = await request.json();
    const { merchantId, action, notes, rejectionReason } = body;

    if (!merchantId || !action) {
      return NextResponse.json({ success: false, error: 'merchantId and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'suspend', 'activate'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action. Must be: approve, reject, suspend, or activate' },
        { status: 400 }
      );
    }

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      return NextResponse.json({ success: false, error: 'Merchant not found' },
        { status: 404 }
      );
    }

    let newStatus: MerchantStatus;
    let updateData: Prisma.MerchantUpdateInput & Record<string, unknown> = {
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
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
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

    // Cascade to the linked Pharmacy record (a PHARMACY merchant is a pharmacist).
    // Without this the mobile pharmacist gate would stay "under review" forever.
    if (merchant.type === 'PHARMACY') {
      const pharmacyStatus =
        action === 'reject' ? PharmacyStatus.REJECTED
        : action === 'suspend' ? PharmacyStatus.SUSPENDED
        : PharmacyStatus.APPROVED;
      await db.pharmacy.updateMany({
        where: { merchantId },
        data: { status: pharmacyStatus, isOpen: pharmacyStatus === PharmacyStatus.APPROVED },
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

    // Create notification for the owner. Prefer the linked userId (works for
    // both MERCHANT and PHARMACIST); fall back to phone for legacy records.
    const merchantUser = merchant.userId
      ? await db.user.findUnique({ where: { id: merchant.userId } })
      : await db.user.findFirst({ where: { phone: merchant.phone } });

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
    return NextResponse.json({ success: false, error: 'Failed to verify merchant' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
