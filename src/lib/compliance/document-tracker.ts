/**
 * Document Tracker Service
 *
 * Tracks all rider documents with:
 * - Document expiry calculations
 * - Automated expiry alerts
 * - Document re-verification workflow
 * - Compliance score calculation
 */

import { db } from '@/lib/db';
import { DocumentStatus, DocumentType, RiderStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/api/audit';

// ============================================================================
// Types
// ============================================================================

export interface ExpiringDocument {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  documentType: DocumentType;
  fileName: string;
  expiresAt: Date;
  daysUntilExpiry: number;
  urgency: 'CRITICAL' | 'WARNING' | 'ATTENTION';
}

export interface DocumentExpiryAlert {
  riderId: string;
  documentId: string;
  documentType: DocumentType;
  alertType: 'EXPIRED' | 'EXPIRING_SOON' | 'EXPIRING_WARNING';
  daysUntilExpiry: number;
  message: string;
}

export interface RiderComplianceStatus {
  riderId: string;
  riderName: string;
  status: RiderStatus;
  complianceScore: number;
  totalDocuments: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  expiredDocuments: number;
  expiringDocuments: number;
  documents: TrackedDocument[];
  isCompliant: boolean;
  issues: string[];
}

export interface TrackedDocument {
  id: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  status: DocumentStatus;
  uploadedAt: Date;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  needsReverification: boolean;
}

export interface ReverificationRequest {
  riderId: string;
  documentTypes: DocumentType[];
  reason: string;
  deadline: Date;
}

// ============================================================================
// Configuration
// ============================================================================

// Document types that have expiry dates
const EXPIRABLE_DOCUMENTS: Partial<Record<DocumentType, number>> = {
  DRIVER_LICENSE: 365 * 5, // 5 years default
  VEHICLE_REGISTRATION: 365, // 1 year
  INSURANCE_DOCUMENT: 365, // 1 year
  // Add more as needed
};

// Alert thresholds (in days)
const ALERT_THRESHOLDS = {
  CRITICAL: 7, // Within 7 days
  WARNING: 30, // Within 30 days
  ATTENTION: 60, // Within 60 days
};

// ============================================================================
// Document Tracker Service Class
// ============================================================================

export class DocumentTrackerService {
  /**
   * Get all documents expiring within the specified days
   */
  async getExpiringDocuments(withinDays = 30): Promise<ExpiringDocument[]> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    // Get all documents with expiry dates
    // Note: The Document model doesn't have expiresAt, but we'll check for it
    // This would need a schema update to add expiresAt to Document model
    const documents = await db.document.findMany({
      where: {
        status: 'APPROVED',
        // We'll need to check expiry differently based on schema
      },
      include: {
        rider: true,
      },
    });

    const expiringDocs: ExpiringDocument[] = [];

    for (const doc of documents) {
      // Check if document has an expiry date (would need schema update)
      const expiresAt = (doc as any).expiresAt as Date | null;

      if (!expiresAt) continue;

      const daysUntilExpiry = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= withinDays) {
        let urgency: 'CRITICAL' | 'WARNING' | 'ATTENTION' = 'ATTENTION';
        if (daysUntilExpiry <= ALERT_THRESHOLDS.CRITICAL) {
          urgency = 'CRITICAL';
        } else if (daysUntilExpiry <= ALERT_THRESHOLDS.WARNING) {
          urgency = 'WARNING';
        }

        expiringDocs.push({
          id: doc.id,
          riderId: doc.riderId || '',
          riderName: doc.rider?.fullName || 'Unknown',
          riderPhone: doc.rider?.phone || 'Unknown',
          documentType: doc.documentType,
          fileName: doc.fileName,
          expiresAt,
          daysUntilExpiry: Math.max(0, daysUntilExpiry),
          urgency,
        });
      }
    }

    // Sort by urgency and days until expiry
    return expiringDocs.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  /**
   * Get expired documents that need immediate attention
   */
  async getExpiredDocuments(): Promise<ExpiringDocument[]> {
    const expiring = await this.getExpiringDocuments(30);
    return expiring.filter((doc) => doc.daysUntilExpiry <= 0);
  }

  /**
   * Get compliance status for a specific rider
   */
  async getRiderComplianceStatus(riderId: string): Promise<RiderComplianceStatus | null> {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      include: {
        vehicle: true,
      },
    });

    if (!rider) return null;

    const documents = await db.document.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const trackedDocs: TrackedDocument[] = documents.map((doc) => {
      const expiresAt = (doc as any).expiresAt as Date | null;
      const daysUntilExpiry = expiresAt
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        status: doc.status,
        uploadedAt: doc.createdAt,
        verifiedAt: doc.verifiedAt,
        expiresAt,
        daysUntilExpiry,
        isExpired: expiresAt ? expiresAt < now : false,
        isExpiringSoon: expiresAt ? expiresAt < thirtyDaysFromNow && expiresAt >= now : false,
        needsReverification: false, // Would be set based on re-verification workflow
      };
    });

    // Calculate counts
    const totalDocuments = documents.length;
    const verifiedDocuments = documents.filter((d) => d.status === 'APPROVED').length;
    const pendingDocuments = documents.filter(
      (d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW'
    ).length;
    const rejectedDocuments = documents.filter((d) => d.status === 'REJECTED').length;
    const expiredDocuments = trackedDocs.filter((d) => d.isExpired).length;
    const expiringDocuments = trackedDocs.filter((d) => d.isExpiringSoon && !d.isExpired).length;

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(trackedDocs);

    // Build issues list
    const issues: string[] = [];
    if (expiredDocuments > 0) {
      issues.push(`${expiredDocuments} document(s) have expired`);
    }
    if (expiringDocuments > 0) {
      issues.push(`${expiringDocuments} document(s) expiring soon`);
    }
    if (pendingDocuments > 0) {
      issues.push(`${pendingDocuments} document(s) pending verification`);
    }
    if (rejectedDocuments > 0) {
      issues.push(`${rejectedDocuments} document(s) were rejected`);
    }

    return {
      riderId: rider.id,
      riderName: rider.fullName,
      status: rider.status,
      complianceScore,
      totalDocuments,
      verifiedDocuments,
      pendingDocuments,
      rejectedDocuments,
      expiredDocuments,
      expiringDocuments,
      documents: trackedDocs,
      isCompliant: issues.length === 0 && complianceScore >= 70,
      issues,
    };
  }

  /**
   * Get compliance status for all riders (for admin dashboard)
   */
  async getAllRiderComplianceStatus(options?: {
    status?: RiderStatus;
    lowComplianceOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    riders: RiderComplianceStatus[];
    total: number;
  }> {
    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }

    const riders = await db.rider.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    const total = await db.rider.count({ where });

    const statuses: RiderComplianceStatus[] = [];
    for (const rider of riders) {
      const status = await this.getRiderComplianceStatus(rider.id);
      if (status) {
        if (!options?.lowComplianceOnly || status.complianceScore < 70) {
          statuses.push(status);
        }
      }
    }

    return { riders: statuses, total };
  }

  /**
   * Generate expiry alerts for documents
   */
  async generateExpiryAlerts(): Promise<DocumentExpiryAlert[]> {
    const expiringDocs = await this.getExpiringDocuments(60);
    const alerts: DocumentExpiryAlert[] = [];

    for (const doc of expiringDocs) {
      let alertType: 'EXPIRED' | 'EXPIRING_SOON' | 'EXPIRING_WARNING';

      if (doc.daysUntilExpiry <= 0) {
        alertType = 'EXPIRED';
      } else if (doc.daysUntilExpiry <= ALERT_THRESHOLDS.WARNING) {
        alertType = 'EXPIRING_SOON';
      } else {
        alertType = 'EXPIRING_WARNING';
      }

      alerts.push({
        riderId: doc.riderId,
        documentId: doc.id,
        documentType: doc.documentType,
        alertType,
        daysUntilExpiry: doc.daysUntilExpiry,
        message: this.generateAlertMessage(doc, alertType),
      });
    }

    return alerts;
  }

  /**
   * Request document re-verification
   */
  async requestReverification(request: ReverificationRequest, adminId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const rider = await db.rider.findUnique({
      where: { id: request.riderId },
    });

    if (!rider) {
      return { success: false, message: 'Rider not found' };
    }

    // Mark existing documents as needing re-verification
    await db.document.updateMany({
      where: {
        riderId: request.riderId,
        documentType: { in: request.documentTypes as any[] },
      },
      data: {
        status: 'PENDING',
        verificationNotes: `Re-verification requested: ${request.reason}`,
      },
    });

    // Create audit log
    await createAuditLog({
      action: 'DOCUMENT_REVERIFICATION_REQUESTED',
      entityType: 'Rider',
      entityId: request.riderId,
      actorType: 'ADMIN',
      actorId: adminId,
      riderId: request.riderId,
      description: `Re-verification requested for: ${request.documentTypes.join(', ')}. Reason: ${request.reason}`,
      newValues: {
        documentTypes: request.documentTypes,
        reason: request.reason,
        deadline: request.deadline,
      },
    });

    return {
      success: true,
      message: `Re-verification requested for ${request.documentTypes.length} document type(s)`,
    };
  }

  /**
   * Suspend riders with expired critical documents
   */
  async suspendRidersWithExpiredDocuments(adminId: string): Promise<{
    suspended: number;
    errors: string[];
  }> {
    const expiredDocs = await this.getExpiredDocuments();
    const criticalDocTypes = ['DRIVER_LICENSE', 'INSURANCE_DOCUMENT', 'VEHICLE_REGISTRATION'];

    const riderIdsToSuspend = new Set<string>();

    for (const doc of expiredDocs) {
      if (criticalDocTypes.includes(doc.documentType)) {
        riderIdsToSuspend.add(doc.riderId);
      }
    }

    const result = { suspended: 0, errors: [] as string[] };

    for (const riderId of riderIdsToSuspend) {
      try {
        const rider = await db.rider.findUnique({
          where: { id: riderId },
        });

        if (rider && rider.status === 'APPROVED') {
          await db.rider.update({
            where: { id: riderId },
            data: {
              status: 'SUSPENDED',
              verificationNotes: 'Auto-suspended due to expired documents',
            },
          });

          await createAuditLog({
            action: 'RIDER_AUTO_SUSPENDED',
            entityType: 'Rider',
            entityId: riderId,
            actorType: 'SYSTEM',
            actorId: adminId,
            riderId,
            description: `Rider auto-suspended due to expired critical documents`,
          });

          result.suspended++;
        }
      } catch (error) {
        result.errors.push(`Failed to suspend rider ${riderId}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Set expiry date for a document
   */
  async setDocumentExpiry(
    documentId: string,
    expiresAt: Date,
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return { success: false, message: 'Document not found' };
    }

    // Note: This would require adding expiresAt to Document model
    // For now, we store it in verificationNotes or create a separate tracking

    await db.document.update({
      where: { id: documentId },
      data: {
        verificationNotes: `Expires: ${expiresAt.toISOString()}`,
      },
    });

    await createAuditLog({
      action: 'DOCUMENT_EXPIRY_SET',
      entityType: 'Document',
      entityId: documentId,
      actorType: 'ADMIN',
      actorId: adminId,
      riderId: document.riderId || undefined,
      description: `Expiry date set for ${document.documentType}: ${expiresAt.toISOString()}`,
    });

    return { success: true, message: 'Expiry date set successfully' };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateComplianceScore(documents: TrackedDocument[]): number {
    if (documents.length === 0) return 0;

    let score = 100;
    const now = new Date();

    for (const doc of documents) {
      // Deduct for non-verified documents
      if (doc.status === 'PENDING') score -= 10;
      if (doc.status === 'UNDER_REVIEW') score -= 5;
      if (doc.status === 'REJECTED') score -= 20;
      if (doc.status === 'EXPIRED') score -= 25;

      // Deduct for expired documents
      if (doc.isExpired) score -= 30;

      // Deduct for expiring soon
      if (doc.isExpiringSoon && !doc.isExpired) {
        const daysLeft = doc.daysUntilExpiry || 30;
        if (daysLeft <= 7) score -= 15;
        else if (daysLeft <= 14) score -= 10;
        else score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateAlertMessage(
    doc: ExpiringDocument,
    alertType: 'EXPIRED' | 'EXPIRING_SOON' | 'EXPIRING_WARNING'
  ): string {
    const docName = doc.documentType.replace(/_/g, ' ').toLowerCase();

    switch (alertType) {
      case 'EXPIRED':
        return `URGENT: ${doc.riderName}'s ${docName} has expired. Immediate action required.`;
      case 'EXPIRING_SOON':
        return `WARNING: ${doc.riderName}'s ${docName} expires in ${doc.daysUntilExpiry} days.`;
      case 'EXPIRING_WARNING':
        return `ATTENTION: ${doc.riderName}'s ${docName} will expire in ${doc.daysUntilExpiry} days.`;
    }
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const documentTracker = new DocumentTrackerService();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a document type requires expiry tracking
 */
export function isExpirableDocument(documentType: DocumentType): boolean {
  return documentType in EXPIRABLE_DOCUMENTS;
}

/**
 * Get default expiry period for a document type
 */
export function getDefaultExpiryPeriod(documentType: DocumentType): number | null {
  return EXPIRABLE_DOCUMENTS[documentType] || null;
}

/**
 * Calculate days until expiry
 */
export function calculateDaysUntilExpiry(expiresAt: Date): number {
  const now = new Date();
  return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Determine urgency level for expiring document
 */
export function getExpiryUrgency(daysUntilExpiry: number): 'CRITICAL' | 'WARNING' | 'ATTENTION' | 'OK' {
  if (daysUntilExpiry <= 0) return 'CRITICAL';
  if (daysUntilExpiry <= ALERT_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (daysUntilExpiry <= ALERT_THRESHOLDS.WARNING) return 'WARNING';
  if (daysUntilExpiry <= ALERT_THRESHOLDS.ATTENTION) return 'ATTENTION';
  return 'OK';
}
