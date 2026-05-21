import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth/guards';
import { documentTracker, getExpiryUrgency } from '@/lib/compliance/document-tracker';

// ============================================================================
// Validation Schemas
// ============================================================================

const suspendExpiredSchema = z.object({
  confirm: z.boolean().refine((val) => val === true, {
    message: 'Confirmation required to suspend riders',
  }),
});

// ============================================================================
// GET /api/compliance/expiring - Get expiring/expired documents
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'expiring';
    const withinDays = parseInt(searchParams.get('withinDays') || '30', 10);
    const riderId = searchParams.get('riderId');

    // Get expired documents
    if (action === 'expired') {
      const expiredDocs = await documentTracker.getExpiredDocuments();

      // Group by urgency
      const critical = expiredDocs.filter((d) => d.daysUntilExpiry <= 0);

      return successResponse({
        expired: expiredDocs,
        summary: {
          total: expiredDocs.length,
          critical: critical.length,
        },
      });
    }

    // Get compliance status for a specific rider
    if (action === 'compliance' && riderId) {
      const status = await documentTracker.getRiderComplianceStatus(riderId);

      if (!status) {
        return errorResponse('Rider not found');
      }

      return successResponse({ status });
    }

    // Get all riders with compliance status
    if (action === 'all-riders') {
      const status = searchParams.get('status');
      const lowComplianceOnly = searchParams.get('lowComplianceOnly') === 'true';
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const result = await documentTracker.getAllRiderComplianceStatus({
        status: status as any,
        lowComplianceOnly,
        limit,
        offset,
      });

      return successResponse(result);
    }

    // Get expiry alerts
    if (action === 'alerts') {
      const alerts = await documentTracker.generateExpiryAlerts();

      // Group by alert type
      const expired = alerts.filter((a) => a.alertType === 'EXPIRED');
      const expiringSoon = alerts.filter((a) => a.alertType === 'EXPIRING_SOON');
      const warning = alerts.filter((a) => a.alertType === 'EXPIRING_WARNING');

      return successResponse({
        alerts,
        summary: {
          total: alerts.length,
          expired: expired.length,
          expiringSoon: expiringSoon.length,
          warning: warning.length,
        },
        grouped: {
          expired,
          expiringSoon,
          warning,
        },
      });
    }

    // Get expiring documents (default)
    const expiringDocs = await documentTracker.getExpiringDocuments(withinDays);

    // Group by urgency
    const critical = expiringDocs.filter(
      (d) => getExpiryUrgency(d.daysUntilExpiry) === 'CRITICAL'
    );
    const warning = expiringDocs.filter(
      (d) => getExpiryUrgency(d.daysUntilExpiry) === 'WARNING'
    );
    const attention = expiringDocs.filter(
      (d) => getExpiryUrgency(d.daysUntilExpiry) === 'ATTENTION'
    );

    // Group by document type
    const byType: Record<string, typeof expiringDocs> = {};
    for (const doc of expiringDocs) {
      const type = doc.documentType;
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(doc);
    }

    return successResponse({
      expiring: expiringDocs,
      withinDays,
      summary: {
        total: expiringDocs.length,
        critical: critical.length,
        warning: warning.length,
        attention: attention.length,
        byType: Object.fromEntries(
          Object.entries(byType).map(([type, docs]) => [type, docs.length])
        ),
      },
      grouped: {
        critical,
        warning,
        attention,
      },
      byType,
    });
  } catch (error) {
    console.error('Error getting expiring documents:', error);
    return serverErrorResponse('Failed to get expiring documents');
  }
}

// ============================================================================
// POST /api/compliance/expiring - Actions on expiring documents
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const admin = authResult.user!;

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Suspend riders with expired critical documents
    if (action === 'suspend-expired') {
      const validatedData = suspendExpiredSchema.parse(body);

      const result = await documentTracker.suspendRidersWithExpiredDocuments(admin.userId);

      return successResponse({
        message: `Suspended ${result.suspended} riders with expired documents`,
        ...result,
      });
    }

    return errorResponse('Invalid action. Use: suspend-expired.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0]?.message || 'Validation error');
    }
    console.error('Error processing expiring documents action:', error);
    return serverErrorResponse('Failed to process action');
  }
}
