import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { requireAdmin } from '@/lib/auth/guards';
import {
  verificationService,
  canApproveRider,
  getRequiredDocuments,
} from '@/lib/compliance/verification-service';

// ============================================================================
// Validation Schemas
// ============================================================================

const verifyDocumentSchema = z.object({
  documentId: z.string(),
  decision: z.enum(['APPROVED', 'REJECTED', 'ESCALATED']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  suspiciousIndicators: z.array(z.string()).optional(),
});

const bulkVerifySchema = z.object({
  documentIds: z.array(z.string()).min(1),
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional(),
});

const escalateSchema = z.object({
  reason: z.string().min(5),
  indicators: z.array(z.string()).optional(),
});

// ============================================================================
// GET /api/compliance/verify-rider - Get verification summary
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
    const riderId = searchParams.get('riderId');
    const action = searchParams.get('action');

    // Get pending verifications list
    if (action === 'pending') {
      const riderRole = searchParams.get('riderRole') || undefined;
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const result = await verificationService.getPendingVerifications({
        limit,
        offset,
        riderRole,
      });

      return successResponse(result);
    }

    // Get verification steps for a rider
    if (action === 'steps' && riderId) {
      const steps = await verificationService.getVerificationSteps(riderId);
      return successResponse({ steps });
    }

    // Get required documents for a role
    if (action === 'required-docs') {
      const role = searchParams.get('role') || 'BIKE_RIDER';
      const docs = getRequiredDocuments(role);
      return successResponse({ role, requiredDocuments: docs });
    }

    // Get verification summary for a specific rider
    if (riderId) {
      const summary = await verificationService.getVerificationSummary(riderId);

      if (!summary) {
        return notFoundResponse('Rider');
      }

      // Also check if rider can be approved
      const approvalCheck = await canApproveRider(riderId);

      return successResponse({
        summary,
        approvalCheck,
      });
    }

    return errorResponse('Missing required parameters. Provide riderId or action.');
  } catch (error) {
    console.error('Error getting verification data:', error);
    return serverErrorResponse('Failed to get verification data');
  }
}

// ============================================================================
// POST /api/compliance/verify-rider - Verify document or escalate
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
    const action = searchParams.get('action') || 'verify';

    // Verify a single document
    if (action === 'verify') {
      const validatedData = verifyDocumentSchema.parse(body);

      const result = await verificationService.verifyDocument({
        documentId: validatedData.documentId,
        adminId: admin.userId,
        decision: validatedData.decision,
        notes: validatedData.notes,
        rejectionReason: validatedData.rejectionReason,
        suspiciousIndicators: validatedData.suspiciousIndicators,
      });

      if (!result.success) {
        return errorResponse(result.message);
      }

      return successResponse({ message: result.message });
    }

    // Bulk verify documents
    if (action === 'bulk-verify') {
      const validatedData = bulkVerifySchema.parse(body);

      const result = await verificationService.bulkVerifyDocuments(
        validatedData.documentIds,
        admin.userId,
        validatedData.decision,
        validatedData.notes
      );

      return successResponse({
        message: `Processed ${result.success} documents successfully, ${result.failed} failed`,
        ...result,
      });
    }

    // Escalate rider for review
    if (action === 'escalate') {
      const riderId = searchParams.get('riderId');
      if (!riderId) {
        return errorResponse('Rider ID is required for escalation');
      }

      const validatedData = escalateSchema.parse(body);

      const result = await verificationService.escalateForReview(
        riderId,
        admin.userId,
        validatedData.reason,
        validatedData.indicators
      );

      if (!result.success) {
        return errorResponse('Failed to escalate rider');
      }

      return successResponse({ message: 'Rider escalated for review' });
    }

    return errorResponse('Invalid action. Use: verify, bulk-verify, or escalate.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0]?.message || 'Validation error');
    }
    console.error('Error processing verification:', error);
    return serverErrorResponse('Failed to process verification');
  }
}
