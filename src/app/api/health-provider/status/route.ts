import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const userId = searchParams.get('userId');

    if (!providerId && !userId) {
      return NextResponse.json(
        { error: 'Provider ID or User ID is required' },
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
          verifiedAt: true,
          rejectionReason: true,
          createdAt: true,
        },
      });
    }

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
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
    return NextResponse.json(
      { error: 'Failed to fetch provider status' },
      { status: 500 }
    );
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
