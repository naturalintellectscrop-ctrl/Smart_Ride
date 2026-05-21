/**
 * Rider Verification Service
 *
 * Handles the multi-step rider verification workflow:
 * 1. Document verification (ID, License, Insurance, Registration)
 * 2. Verification status tracking
 * 3. Approval/rejection with notes
 * 4. Escalation for suspicious documents
 *
 * Uses existing Document model from Prisma schema
 */

import { db } from '@/lib/db';
import { DocumentStatus, RiderStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/api/audit';

// ============================================================================
// Types
// ============================================================================

export type VerificationDecision = 'APPROVED' | 'REJECTED' | 'PENDING' | 'ESCALATED';

export interface VerificationResult {
  success: boolean;
  status: VerificationDecision;
  message: string;
  missingDocuments?: string[];
  issues?: string[];
}

export interface DocumentVerificationInput {
  documentId: string;
  adminId: string;
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  notes?: string;
  rejectionReason?: string;
  suspiciousIndicators?: string[];
}

export interface RiderVerificationSummary {
  riderId: string;
  fullName: string;
  status: RiderStatus;
  verificationProgress: number;
  documents: DocumentSummary[];
  allDocumentsVerified: boolean;
  hasExpiredDocuments: boolean;
  pendingDocuments: string[];
  complianceScore: number;
}

export interface DocumentSummary {
  id: string;
  documentType: string;
  status: DocumentStatus;
  fileName: string;
  fileUrl: string;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  verificationNotes?: string | null;
  expiresAt?: Date | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export interface VerificationStep {
  step: number;
  name: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  completedAt?: Date;
  notes?: string;
}

// Required documents by rider role
const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  BIKE_RIDER: [
    'NATIONAL_ID_FRONT',
    'NATIONAL_ID_BACK',
    'DRIVER_LICENSE',
    'FACE_PHOTO',
  ],
  CAR_DRIVER: [
    'NATIONAL_ID_FRONT',
    'NATIONAL_ID_BACK',
    'DRIVER_LICENSE',
    'FACE_PHOTO',
    'VEHICLE_REGISTRATION',
    'INSURANCE_DOCUMENT',
  ],
  TRUCK_DRIVER: [
    'NATIONAL_ID_FRONT',
    'NATIONAL_ID_BACK',
    'DRIVER_LICENSE',
    'FACE_PHOTO',
    'VEHICLE_REGISTRATION',
    'INSURANCE_DOCUMENT',
  ],
  COURIER: [
    'NATIONAL_ID_FRONT',
    'NATIONAL_ID_BACK',
    'FACE_PHOTO',
  ],
};

// ============================================================================
// Verification Service Class
// ============================================================================

export class RiderVerificationService {
  /**
   * Get verification summary for a rider
   */
  async getVerificationSummary(riderId: string): Promise<RiderVerificationSummary | null> {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      include: {
        vehicle: true,
        user: true,
      },
    });

    if (!rider) return null;

    // Get all documents for this rider
    const documents = await db.document.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
    });

    // Get required documents based on rider role
    const requiredDocs = REQUIRED_DOCUMENTS[rider.riderRole] || REQUIRED_DOCUMENTS.BIKE_RIDER;

    // Build document summaries
    const documentSummaries: DocumentSummary[] = documents.map((doc) => {
      const expiresAt = (doc as any).expiresAt as Date | null;
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      return {
        id: doc.id,
        documentType: doc.documentType,
        status: doc.status,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        verifiedAt: doc.verifiedAt,
        verifiedBy: doc.verifiedBy,
        rejectionReason: doc.rejectionReason,
        verificationNotes: doc.verificationNotes,
        expiresAt,
        isExpired: expiresAt ? expiresAt < now : false,
        isExpiringSoon: expiresAt ? expiresAt < thirtyDaysFromNow && expiresAt >= now : false,
      };
    });

    // Check which required documents are missing
    const existingDocTypes = new Set(documents.map((d) => d.documentType));
    const missingDocs = requiredDocs.filter((req) => !existingDocTypes.has(req as any));

    // Calculate verification progress
    const verifiedCount = documents.filter((d) => d.status === 'APPROVED').length;
    const verificationProgress = Math.round((verifiedCount / requiredDocs.length) * 100);

    // Check for expired documents
    const hasExpiredDocuments = documentSummaries.some((d) => d.isExpired);

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(
      documentSummaries,
      requiredDocs,
      missingDocs
    );

    return {
      riderId: rider.id,
      fullName: rider.fullName,
      status: rider.status,
      verificationProgress,
      documents: documentSummaries,
      allDocumentsVerified: missingDocs.length === 0 && verifiedCount === requiredDocs.length,
      hasExpiredDocuments,
      pendingDocuments: missingDocs,
      complianceScore,
    };
  }

  /**
   * Verify a single document
   */
  async verifyDocument(input: DocumentVerificationInput): Promise<{ success: boolean; message: string }> {
    const document = await db.document.findUnique({
      where: { id: input.documentId },
      include: { rider: true },
    });

    if (!document) {
      return { success: false, message: 'Document not found' };
    }

    // Update document status
    const updatedDoc = await db.document.update({
      where: { id: input.documentId },
      data: {
        status: input.decision as DocumentStatus,
        verifiedAt: input.decision === 'APPROVED' ? new Date() : null,
        verifiedBy: input.adminId,
        verificationNotes: input.notes || null,
        rejectionReason: input.decision === 'REJECTED' ? input.rejectionReason : null,
      },
    });

    // Create audit log
    await createAuditLog({
      action: `DOCUMENT_${input.decision}`,
      entityType: 'Document',
      entityId: input.documentId,
      actorType: 'ADMIN',
      actorId: input.adminId,
      riderId: document.riderId || undefined,
      description: `Document ${document.documentType} ${input.decision.toLowerCase()}${input.notes ? `: ${input.notes}` : ''}`,
      newValues: {
        status: input.decision,
        notes: input.notes,
        rejectionReason: input.rejectionReason,
        suspiciousIndicators: input.suspiciousIndicators,
      },
    });

    // If escalated, create a flag
    if (input.decision === 'ESCALATED' && input.suspiciousIndicators) {
      await this.createEscalationRecord(document.riderId!, input);
    }

    // Check if all documents are now verified for this rider
    if (document.riderId) {
      await this.checkAndUpdateRiderStatus(document.riderId, input.adminId);
    }

    return { success: true, message: `Document ${input.decision.toLowerCase()} successfully` };
  }

  /**
   * Bulk verify multiple documents
   */
  async bulkVerifyDocuments(
    documentIds: string[],
    adminId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    for (const docId of documentIds) {
      const result = await this.verifyDocument({
        documentId: docId,
        adminId,
        decision,
        notes,
      });

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Get all pending verifications (for admin dashboard)
   */
  async getPendingVerifications(options?: {
    limit?: number;
    offset?: number;
    riderRole?: string;
  }): Promise<{
    riders: RiderVerificationSummary[];
    total: number;
  }> {
    // Find riders pending approval
    const where: any = { status: 'PENDING_APPROVAL' };
    if (options?.riderRole) {
      where.riderRole = options.riderRole;
    }

    const riders = await db.rider.findMany({
      where,
      include: {
        vehicle: true,
      },
      orderBy: { createdAt: 'asc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });

    const total = await db.rider.count({ where });

    const summaries: RiderVerificationSummary[] = [];
    for (const rider of riders) {
      const summary = await this.getVerificationSummary(rider.id);
      if (summary) {
        summaries.push(summary);
      }
    }

    return { riders: summaries, total };
  }

  /**
   * Get verification workflow steps for a rider
   */
  async getVerificationSteps(riderId: string): Promise<VerificationStep[]> {
    const summary = await this.getVerificationSummary(riderId);
    if (!summary) return [];

    const steps: VerificationStep[] = [
      {
        step: 1,
        name: 'Profile Completion',
        description: 'Basic profile information submitted',
        status: 'COMPLETED', // Rider wouldn't be in system without this
      },
      {
        step: 2,
        name: 'Document Upload',
        description: 'All required documents uploaded',
        status: summary.pendingDocuments.length === 0 ? 'COMPLETED' : 'IN_PROGRESS',
      },
      {
        step: 3,
        name: 'Document Verification',
        description: 'Documents verified by compliance team',
        status: summary.allDocumentsVerified ? 'COMPLETED' : 'PENDING',
      },
      {
        step: 4,
        name: 'Vehicle Inspection',
        description: 'Vehicle and equipment inspection',
        status: 'PENDING', // Would be updated by inspection service
      },
      {
        step: 5,
        name: 'Final Approval',
        description: 'Rider approved and activated',
        status: summary.status === 'APPROVED' ? 'COMPLETED' : 'PENDING',
      },
    ];

    return steps;
  }

  /**
   * Escalate a rider for manual review
   */
  async escalateForReview(
    riderId: string,
    adminId: string,
    reason: string,
    indicators?: string[]
  ): Promise<{ success: boolean }> {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      return { success: false };
    }

    // Update rider status to indicate escalation
    await db.rider.update({
      where: { id: riderId },
      data: {
        verificationNotes: `ESCALATED: ${reason}`,
      },
    });

    // Create audit log
    await createAuditLog({
      action: 'RIDER_ESCALATED',
      entityType: 'Rider',
      entityId: riderId,
      actorType: 'ADMIN',
      actorId: adminId,
      riderId,
      description: `Rider escalated for review: ${reason}`,
      newValues: {
        reason,
        indicators,
      },
    });

    return { success: true };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async checkAndUpdateRiderStatus(riderId: string, adminId: string): Promise<void> {
    const summary = await this.getVerificationSummary(riderId);
    if (!summary) return;

    // Only auto-approve if all documents are verified
    if (summary.allDocumentsVerified && !summary.hasExpiredDocuments) {
      // Get rider to check vehicle inspection status
      const rider = await db.rider.findUnique({
        where: { id: riderId },
        include: { vehicle: true },
      });

      if (rider) {
        // For riders with vehicles, check if vehicle inspection is done
        // This would be integrated with inspection service
        // For now, we just update verification notes
        await db.rider.update({
          where: { id: riderId },
          data: {
            verificationNotes: 'All documents verified. Pending final approval.',
          },
        });

        await createAuditLog({
          action: 'DOCUMENTS_VERIFIED',
          entityType: 'Rider',
          entityId: riderId,
          actorType: 'ADMIN',
          actorId: adminId,
          riderId,
          description: 'All documents verified for rider',
        });
      }
    }
  }

  private async createEscalationRecord(
    riderId: string,
    input: DocumentVerificationInput
  ): Promise<void> {
    // Create a record for the escalation - this could be a separate model
    // For now, we log it in the audit trail
    await createAuditLog({
      action: 'DOCUMENT_ESCALATION',
      entityType: 'Document',
      entityId: input.documentId,
      actorType: 'ADMIN',
      actorId: input.adminId,
      riderId,
      description: `Document escalated due to suspicious indicators: ${input.suspiciousIndicators?.join(', ')}`,
      newValues: {
        suspiciousIndicators: input.suspiciousIndicators,
        notes: input.notes,
      },
    });
  }

  private calculateComplianceScore(
    documents: DocumentSummary[],
    requiredDocs: string[],
    missingDocs: string[]
  ): number {
    if (requiredDocs.length === 0) return 100;

    // Base score starts at 100
    let score = 100;

    // Deduct for missing documents (15 points each)
    score -= missingDocs.length * 15;

    // Deduct for pending documents (5 points each)
    const pendingDocs = documents.filter((d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW');
    score -= pendingDocs.length * 5;

    // Deduct for rejected documents (10 points each)
    const rejectedDocs = documents.filter((d) => d.status === 'REJECTED');
    score -= rejectedDocs.length * 10;

    // Deduct for expired documents (20 points each)
    const expiredDocs = documents.filter((d) => d.isExpired);
    score -= expiredDocs.length * 20;

    // Deduct for expiring soon documents (5 points each)
    const expiringDocs = documents.filter((d) => d.isExpiringSoon && !d.isExpired);
    score -= expiringDocs.length * 5;

    return Math.max(0, Math.min(100, score));
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const verificationService = new RiderVerificationService();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a rider can be approved based on verification status
 */
export async function canApproveRider(riderId: string): Promise<{
  canApprove: boolean;
  reasons: string[];
}> {
  const summary = await verificationService.getVerificationSummary(riderId);
  const reasons: string[] = [];

  if (!summary) {
    return { canApprove: false, reasons: ['Rider not found'] };
  }

  if (summary.pendingDocuments.length > 0) {
    reasons.push(`Missing documents: ${summary.pendingDocuments.join(', ')}`);
  }

  if (!summary.allDocumentsVerified) {
    reasons.push('Not all documents have been verified');
  }

  if (summary.hasExpiredDocuments) {
    reasons.push('Some documents have expired');
  }

  return {
    canApprove: reasons.length === 0,
    reasons,
  };
}

/**
 * Get required documents for a rider role
 */
export function getRequiredDocuments(riderRole: string): string[] {
  return REQUIRED_DOCUMENTS[riderRole] || REQUIRED_DOCUMENTS.BIKE_RIDER;
}
