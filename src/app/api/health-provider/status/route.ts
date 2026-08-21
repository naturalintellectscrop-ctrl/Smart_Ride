import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import { announceProviderAvailability } from '@/lib/realtime/storefront';

export async function GET(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    // Fall back to the caller's own account (PHARM-7). This required an
    // explicit providerId or userId in the query, unlike
    // /health-provider/orders which resolves the provider from the token — so
    // the pharmacist app, which does not know its own provider id, got a 400
    // every time it asked for its own status. Asking "what is MY status" should
    // not require knowing an id the client was never given.
    const auth = requireAuth(request);
    const userId = searchParams.get('userId') ?? (auth.success ? auth.user?.userId ?? null : null);

    if (!providerId && !userId) {
      return NextResponse.json({ success: false, error: 'Provider ID or User ID is required' },
        { status: 400 }
      );
    }

    let provider;

    if (providerId) {
      provider = await db.healthProvider.findUnique({
        where: { id: providerId },
        select: {
          id: true,
          businessName: true,
          providerType: true,
          verificationStatus: true,
          // The dashboard pill reads this; without it the pharmacy always
          // rendered CLOSED however it had been set.
          isOpenNow: true,
          verifiedAt: true,
          rejectionReason: true,
          createdAt: true,
        },
      });
    } else if (userId) {
      provider = await db.healthProvider.findFirst({
        where: { userId },
        select: {
          id: true,
          businessName: true,
          providerType: true,
          verificationStatus: true,
          // The dashboard pill reads this; without it the pharmacy always
          // rendered CLOSED however it had been set.
          isOpenNow: true,
          verifiedAt: true,
          rejectionReason: true,
          createdAt: true,
        },
      });
    }

    if (!provider) {
      return NextResponse.json({ success: false, error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Calculate estimated review time based on status
    const estimatedReviewTime = getEstimatedReviewTime(provider.verificationStatus);

    // Get timeline events
    const timeline = [
      { 
        step: 'Application Submitted', 
        completed: true, 
        date: provider.createdAt 
      },
      { 
        step: 'Initial Review', 
        completed: ['UNDER_REVIEW', 'APPROVED', 'DOCUMENTS_REQUESTED'].includes(provider.verificationStatus),
        date: provider.verificationStatus !== 'PENDING' ? new Date() : null
      },
      { 
        step: 'Document Verification', 
        completed: provider.verificationStatus === 'APPROVED',
        current: provider.verificationStatus === 'UNDER_REVIEW'
      },
      { 
        step: 'Final Approval', 
        completed: provider.verificationStatus === 'APPROVED',
        date: provider.verifiedAt
      },
    ];

    return NextResponse.json({
      success: true,
      provider: {
        ...provider,
        estimatedReviewTime,
        timeline,
      },
    });
  } catch (error) {
    console.error('Error fetching provider status:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch provider status' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

function getEstimatedReviewTime(status: string): string {
  switch (status) {
    case 'PENDING':
      return '1-3 business days';
    case 'UNDER_REVIEW':
      return 'Within 24 hours';
    case 'DOCUMENTS_REQUESTED':
      return 'Pending additional documents';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'SUSPENDED':
      return 'Account suspended';
    default:
      return 'Unknown';
  }
}

/**
 * PATCH /api/health-provider/status — open or close the pharmacy.
 *
 * The pharmacist dashboard has always had an OPEN/CLOSED pill, and it has never
 * done anything: this route was GET-only, and no other health-provider route
 * writes an open state, so tapping it changed the label and nothing else.
 * Reported from the device.
 *
 * `HealthProvider.isOpenNow` already existed for exactly this — it is even
 * indexed — so nothing new is modelled here; the field simply had no writer.
 *
 * The provider is resolved from the caller's token rather than an id in the
 * query, matching /health-provider/orders. An admin may act on a named provider.
 */
export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.statusCode || 401 }
    );
  }
  const caller = auth.user;

  await setServiceRoleContext();
  try {
    const body = await request.json().catch(() => ({}));

    // Accept either shape the clients use: { isOpen } or { status: 'OPEN' }.
    const isOpen =
      typeof body.isOpen === 'boolean'
        ? body.isOpen
        : typeof body.status === 'string'
          ? body.status.toUpperCase() === 'OPEN'
          : null;

    if (isOpen === null) {
      return NextResponse.json(
        { success: false, error: 'Provide { isOpen: boolean } or { status: "OPEN" | "CLOSED" }' },
        { status: 400 }
      );
    }

    const requestedId = new URL(request.url).searchParams.get('providerId');
    let providerId: string;

    if (isAdmin(caller.role)) {
      if (!requestedId) {
        return NextResponse.json({ success: false, error: 'providerId is required' }, { status: 400 });
      }
      providerId = requestedId;
    } else {
      const own = await db.healthProvider.findUnique({
        where: { userId: caller.userId },
        select: { id: true },
      });
      if (!own) {
        return NextResponse.json(
          { success: false, error: 'No health provider account for this user' },
          { status: 403 }
        );
      }
      if (requestedId && requestedId !== own.id) {
        return NextResponse.json(
          { success: false, error: 'That pharmacy belongs to another provider' },
          { status: 403 }
        );
      }
      providerId = own.id;
    }

    const updated = await db.healthProvider.update({
      where: { id: providerId },
      data: { isOpenNow: isOpen },
      select: { id: true, isOpenNow: true, businessName: true },
    });

    // Tell anyone browsing. A customer sitting on a pharmacy that has just shut
    // would otherwise keep seeing OPEN until they pulled to refresh, and find
    // out only when their order was refused.
    announceProviderAvailability({
      providerId: updated.id,
      isOpen: updated.isOpenNow,
      businessName: updated.businessName,
    });

    return NextResponse.json({
      success: true,
      data: { id: updated.id, isOpen: updated.isOpenNow, name: updated.businessName },
    });
  } catch (error) {
    console.error('Error updating provider open state:', error);
    return NextResponse.json({ success: false, error: 'Failed to update status' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}
