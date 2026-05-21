import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { DocumentStatus } from '@prisma/client';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse, paginatedResponse } from '@/lib/api/response';
import { createAuditLog } from '@/lib/api/audit';
import { requireAdmin } from '@/lib/auth/guards';
import { documentTracker } from '@/lib/compliance/document-tracker';

// ============================================================================
// Validation Schemas
// ============================================================================

const updateDocumentSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
  verificationNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  expiresAt: z.string().optional(), // ISO date string
});

const reverifySchema = z.object({
  documentTypes: z.array(z.string()).min(1),
  reason: z.string().min(5),
  deadline: z.string().optional(), // ISO date string
});

const setExpirySchema = z.object({
  expiresAt: z.string(), // ISO date string
});

// ============================================================================
// GET /api/compliance/documents - Get documents
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
    const documentId = searchParams.get('documentId');
    const status = searchParams.get('status') as DocumentStatus | null;
    const documentType = searchParams.get('documentType');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Get specific document
    if (documentId) {
      const document = await db.document.findUnique({
        where: { id: documentId },
        include: {
          rider: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              status: true,
            },
          },
        },
      });

      if (!document) {
        return notFoundResponse('Document');
      }

      // Calculate expiry info
      const expiresAt = (document as any).expiresAt as Date | null;
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      return successResponse({
        document: {
          ...document,
          expiresAt,
          isExpired: expiresAt ? expiresAt < now : false,
          isExpiringSoon: expiresAt ? expiresAt < thirtyDaysFromNow && expiresAt >= now : false,
        },
      });
    }

    // Build query
    const where: any = {};

    if (riderId) where.riderId = riderId;
    if (status) where.status = status;
    if (documentType) where.documentType = documentType;

    // Get paginated documents
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        include: {
          rider: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.document.count({ where }),
    ]);

    // Add expiry info to documents
    const documentsWithExpiry = documents.map((doc) => {
      const expiresAt = (doc as any).expiresAt as Date | null;
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      return {
        ...doc,
        expiresAt,
        isExpired: expiresAt ? expiresAt < now : false,
        isExpiringSoon: expiresAt ? expiresAt < thirtyDaysFromNow && expiresAt >= now : false,
      };
    });

    return paginatedResponse(documentsWithExpiry, page, limit, total);
  } catch (error) {
    console.error('Error getting documents:', error);
    return serverErrorResponse('Failed to get documents');
  }
}

// ============================================================================
// POST /api/compliance/documents - Request re-verification
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
    const riderId = searchParams.get('riderId');
    const action = searchParams.get('action') || 'reverify';

    // Request re-verification
    if (action === 'reverify') {
      if (!riderId) {
        return errorResponse('Rider ID is required');
      }

      const validatedData = reverifySchema.parse(body);

      const deadline = validatedData.deadline
        ? new Date(validatedData.deadline)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days default

      const result = await documentTracker.requestReverification(
        {
          riderId,
          documentTypes: validatedData.documentTypes as any[],
          reason: validatedData.reason,
          deadline,
        },
        admin.userId
      );

      if (!result.success) {
        return errorResponse(result.message);
      }

      return successResponse({ message: result.message });
    }

    // Set expiry date
    if (action === 'set-expiry') {
      const documentId = searchParams.get('documentId');
      if (!documentId) {
        return errorResponse('Document ID is required');
      }

      const validatedData = setExpirySchema.parse(body);
      const expiresAt = new Date(validatedData.expiresAt);

      const result = await documentTracker.setDocumentExpiry(
        documentId,
        expiresAt,
        admin.userId
      );

      if (!result.success) {
        return errorResponse(result.message);
      }

      return successResponse({ message: result.message });
    }

    return errorResponse('Invalid action. Use: reverify or set-expiry.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0]?.message || 'Validation error');
    }
    console.error('Error processing document request:', error);
    return serverErrorResponse('Failed to process document request');
  }
}

// ============================================================================
// PATCH /api/compliance/documents - Update document
// ============================================================================

export async function PATCH(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return errorResponse('Document ID is required');
    }

    const body = await request.json();
    const validatedData = updateDocumentSchema.parse(body);

    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return notFoundResponse('Document');
    }

    // Build update data
    const updateData: any = {};

    if (validatedData.status) {
      updateData.status = validatedData.status;

      if (validatedData.status === 'APPROVED') {
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = admin.userId;
      }
    }

    if (validatedData.verificationNotes) {
      updateData.verificationNotes = validatedData.verificationNotes;
    }

    if (validatedData.rejectionReason) {
      updateData.rejectionReason = validatedData.rejectionReason;
    }

    // Update document
    const updatedDocument = await db.document.update({
      where: { id: documentId },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      action: 'DOCUMENT_UPDATED',
      entityType: 'Document',
      entityId: documentId,
      actorType: 'ADMIN',
      actorId: admin.userId,
      riderId: document.riderId || undefined,
      description: `Document ${document.documentType} updated`,
      oldValues: {
        status: document.status,
      },
      newValues: updateData,
    });

    return successResponse(updatedDocument, 'Document updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0]?.message || 'Validation error');
    }
    console.error('Error updating document:', error);
    return serverErrorResponse('Failed to update document');
  }
}

// ============================================================================
// DELETE /api/compliance/documents - Delete document
// ============================================================================

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return errorResponse('Document ID is required');
    }

    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return notFoundResponse('Document');
    }

    // Create audit log before deletion
    await createAuditLog({
      action: 'DOCUMENT_DELETED',
      entityType: 'Document',
      entityId: documentId,
      actorType: 'ADMIN',
      actorId: admin.userId,
      riderId: document.riderId || undefined,
      description: `Document ${document.documentType} deleted`,
      oldValues: {
        fileName: document.fileName,
        documentType: document.documentType,
        status: document.status,
      },
    });

    // Delete document
    await db.document.delete({
      where: { id: documentId },
    });

    return successResponse({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return serverErrorResponse('Failed to delete document');
  }
}
