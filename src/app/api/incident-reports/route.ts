import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/incident-reports - List incident reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const incidentType = searchParams.get('incidentType');
    const userId = searchParams.get('userId');
    const riderId = searchParams.get('riderId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (incidentType) where.incidentType = incidentType;
    if (userId) where.userId = userId;
    if (riderId) where.riderId = riderId;

    const reports = await db.incidentReport.findMany({
      where,
      include: {
        sosAlert: {
          include: {
            locationUpdates: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.incidentReport.count({ where });

    return NextResponse.json({
      reports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + reports.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching incident reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incident reports' },
      { status: 500 }
    );
  }
}

// POST /api/incident-reports - Update incident report (add notes, recordings)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sosAlertId,
      description,
      audioRecordingUrl,
      audioDuration,
      photos,
    } = body;

    if (!sosAlertId) {
      return NextResponse.json(
        { error: 'SOS Alert ID is required' },
        { status: 400 }
      );
    }

    const report = await db.incidentReport.findFirst({
      where: { sosAlertId },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Incident report not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (description) updateData.description = description;
    if (audioRecordingUrl) {
      updateData.audioRecordingUrl = audioRecordingUrl;
      updateData.audioDuration = audioDuration;
    }
    if (photos) updateData.photos = JSON.stringify(photos);

    const updatedReport = await db.incidentReport.update({
      where: { id: report.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error('Error updating incident report:', error);
    return NextResponse.json(
      { error: 'Failed to update incident report' },
      { status: 500 }
    );
  }
}
