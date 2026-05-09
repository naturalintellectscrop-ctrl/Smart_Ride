/**
 * ML Model Training API Endpoints
 * 
 * POST /api/fraud/train - Start a new training job
 * GET /api/fraud/train - Get training status
 * GET /api/fraud/train?metrics=true - Get model performance metrics
 * GET /api/fraud/train?versions=true - Get all model versions
 * DELETE /api/fraud/train - Stop scheduled training
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ModelTrainingService,
  ScheduledTrainingService,
  FeatureExtractor,
  DEFAULT_TRAINING_CONFIG,
  TrainingConfig,
} from '@/lib/fraud/ml-training-pipeline';
import { db } from '@/lib/db';

// ============================================
// POST - Start Training
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Merge provided config with defaults
    const config: TrainingConfig = {
      ...DEFAULT_TRAINING_CONFIG,
      ...body.config,
    };

    // Validate config
    if (config.fraudSampleRatio < 0.1 || config.fraudSampleRatio > 0.5) {
      return NextResponse.json(
        { error: 'fraudSampleRatio must be between 0.1 and 0.5' },
        { status: 400 }
      );
    }

    if (config.trainTestSplit < 0.5 || config.trainTestSplit > 0.9) {
      return NextResponse.json(
        { error: 'trainTestSplit must be between 0.5 and 0.9' },
        { status: 400 }
      );
    }

    // Start training
    const job = await ModelTrainingService.startTraining(config);

    // Log training start
    await db.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'ML_TRAINING_STARTED',
        entityType: 'ML_MODEL',
        entityId: job.id,
        description: `ML model training started with config: ${JSON.stringify(config)}`,
      },
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        startedAt: job.startedAt,
        progress: job.progress,
        currentStep: job.currentStep,
      },
    });
  } catch (error) {
    console.error('Error starting training:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start training' },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Training Status & Metrics
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const version = searchParams.get('version');

    // Get model versions
    if (action === 'versions') {
      return await getVersions();
    }

    // Get specific version metrics
    if (action === 'metrics') {
      return await getMetrics(version || undefined);
    }

    // Get feature importance
    if (action === 'features') {
      return await getFeatureImportance(version || undefined);
    }

    // Get current version
    if (action === 'current') {
      return await getCurrentVersion();
    }

    // Get scheduled training status
    if (action === 'schedule') {
      return await getScheduleStatus();
    }

    // Default: Get training status
    return await getTrainingStatus();
  } catch (error) {
    console.error('Error getting training info:', error);
    return NextResponse.json(
      { error: 'Failed to get training information' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Configure Scheduled Training
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, intervalDays, config } = body;

    if (action === 'start_schedule') {
      // Start scheduled training
      const interval = intervalDays || 7;
      ScheduledTrainingService.startScheduledTraining(interval);

      await db.fraudSystemConfig.upsert({
        where: { configKey: 'scheduled_training_config' },
        create: {
          configKey: 'scheduled_training_config',
          configValue: JSON.stringify({ enabled: true, intervalDays: interval }),
          description: 'Scheduled training configuration',
        },
        update: {
          configValue: JSON.stringify({ enabled: true, intervalDays: interval }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Scheduled training started with ${interval} day interval`,
      });
    }

    if (action === 'stop_schedule') {
      ScheduledTrainingService.stopScheduledTraining();

      await db.fraudSystemConfig.upsert({
        where: { configKey: 'scheduled_training_config' },
        create: {
          configKey: 'scheduled_training_config',
          configValue: JSON.stringify({ enabled: false }),
          description: 'Scheduled training configuration',
        },
        update: {
          configValue: JSON.stringify({ enabled: false }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Scheduled training stopped',
      });
    }

    if (action === 'auto_tune') {
      await ScheduledTrainingService.autoTuneThresholds();
      return NextResponse.json({
        success: true,
        message: 'Threshold auto-tuning completed',
      });
    }

    if (action === 'update_config') {
      // Update training configuration
      await db.fraudSystemConfig.upsert({
        where: { configKey: 'training_config' },
        create: {
          configKey: 'training_config',
          configValue: JSON.stringify(config),
          description: 'ML training configuration',
        },
        update: {
          configValue: JSON.stringify(config),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Training configuration updated',
        config,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in PUT request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

async function getTrainingStatus(): Promise<NextResponse> {
  const job = ModelTrainingService.getTrainingStatus();

  if (!job) {
    // No current job, get latest completed job
    const latestVersion = await ModelTrainingService.getCurrentModelVersion();
    
    return NextResponse.json({
      status: 'idle',
      message: 'No training in progress',
      lastTrained: latestVersion?.trainedAt || null,
      currentVersion: latestVersion?.version || null,
    });
  }

  return NextResponse.json({
    status: job.status,
    job: {
      id: job.id,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      progress: job.progress,
      currentStep: job.currentStep,
      error: job.error,
      modelVersion: job.modelVersion,
      metrics: job.metrics,
    },
  });
}

async function getMetrics(versionId?: string): Promise<NextResponse> {
  let version;
  
  if (versionId) {
    version = await ModelTrainingService.getModelVersion(versionId);
  } else {
    version = await ModelTrainingService.getCurrentModelVersion();
  }

  if (!version) {
    return NextResponse.json(
      { error: 'Model version not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    version: version.version,
    trainedAt: version.trainedAt,
    metrics: version.metrics,
    sampleCount: version.sampleCount,
    fraudRatio: version.fraudRatio,
    thresholds: version.thresholds,
    hyperparameters: version.hyperparameters,
  });
}

async function getVersions(): Promise<NextResponse> {
  const configs = await db.fraudSystemConfig.findMany({
    where: {
      configKey: { startsWith: 'model_version_' },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const versions = configs
    .filter(c => !c.configKey.endsWith('current_model_version'))
    .map(c => {
      try {
        const data = JSON.parse(c.configValue);
        return {
          version: data.version,
          trainedAt: data.trainedAt,
          metrics: {
            accuracy: data.metrics?.accuracy,
            precision: data.metrics?.precision,
            recall: data.metrics?.recall,
            f1Score: data.metrics?.f1Score,
            auc: data.metrics?.auc,
          },
          sampleCount: data.sampleCount,
          fraudRatio: data.fraudRatio,
        };
      } catch {
        return null;
      }
    })
    .filter(v => v !== null);

  return NextResponse.json({
    versions,
    count: versions.length,
  });
}

async function getCurrentVersion(): Promise<NextResponse> {
  const version = await ModelTrainingService.getCurrentModelVersion();

  if (!version) {
    return NextResponse.json(
      { error: 'No current model version found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    version: version.version,
    trainedAt: version.trainedAt,
    metrics: version.metrics,
    thresholds: version.thresholds,
    featureCount: version.featureCount,
  });
}

async function getFeatureImportance(versionId?: string): Promise<NextResponse> {
  let version;
  
  if (versionId) {
    version = await ModelTrainingService.getModelVersion(versionId);
  } else {
    version = await ModelTrainingService.getCurrentModelVersion();
  }

  if (!version || !version.metrics.featureImportance) {
    return NextResponse.json(
      { error: 'Feature importance not available' },
      { status: 404 }
    );
  }

  // Sort features by importance
  const sortedFeatures = Object.entries(version.metrics.featureImportance)
    .map(([name, importance]) => ({ name, importance: importance as number }))
    .sort((a, b) => (b.importance as number) - (a.importance as number));

  return NextResponse.json({
    version: version.version,
    featureImportance: sortedFeatures,
    topFeatures: sortedFeatures.slice(0, 10),
  });
}

async function getScheduleStatus(): Promise<NextResponse> {
  const scheduleConfig = await db.fraudSystemConfig.findUnique({
    where: { configKey: 'scheduled_training_config' },
  });

  const lastTraining = await db.fraudSystemConfig.findUnique({
    where: { configKey: 'last_training_date' },
  });

  let scheduleData = { enabled: false, intervalDays: 7 };
  if (scheduleConfig) {
    try {
      scheduleData = JSON.parse(scheduleConfig.configValue);
    } catch {}
  }

  return NextResponse.json({
    scheduled: scheduleData.enabled,
    intervalDays: scheduleData.intervalDays,
    lastTraining: lastTraining?.configValue || null,
    nextTraining: scheduleData.enabled && lastTraining
      ? new Date(new Date(lastTraining.configValue).getTime() + scheduleData.intervalDays * 24 * 60 * 60 * 1000).toISOString()
      : null,
  });
}
