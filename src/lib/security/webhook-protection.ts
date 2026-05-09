/**
 * Webhook Replay Protection
 * 
 * Prevents duplicate webhook processing by:
 * - Storing processed transaction IDs
 * - Rejecting duplicate callbacks
 * - Validating timestamp windows (±5 mins)
 */

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export interface WebhookRecord {
  provider: 'MTN' | 'AIRTEL' | 'FLUTTERWAVE';
  transactionId: string;
  referenceId: string;
  status: string;
  processedAt: Date;
  payload: Record<string, unknown>;
}

// ============================================================================
// Webhook Replay Protection
// ============================================================================

const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a webhook has already been processed
 */
export async function isWebhookProcessed(
  provider: 'MTN' | 'AIRTEL' | 'FLUTTERWAVE',
  transactionId: string
): Promise<boolean> {
  try {
    // Check in payment records
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          { transactionId },
          { momoTransactionId: transactionId },
          { paymentReference: transactionId },
        ],
      },
      select: { id: true, processedAt: true },
    });
    
    return payment?.processedAt !== null;
  } catch (error) {
    console.error('[WEBHOOK] Error checking processed status:', error);
    return false;
  }
}

/**
 * Validate webhook timestamp is within acceptable window
 */
export function validateWebhookTimestamp(
  timestamp: string | number | Date
): { valid: boolean; error?: string } {
  const webhookTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = Math.abs(now - webhookTime);
  
  if (isNaN(webhookTime)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }
  
  if (diff > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
    const diffMins = Math.round(diff / 60000);
    return {
      valid: false,
      error: `Webhook timestamp outside acceptable window (${diffMins} minutes difference)`,
    };
  }
  
  return { valid: true };
}

/**
 * Record webhook as processed
 */
export async function recordWebhookProcessed(
  provider: 'MTN' | 'AIRTEL' | 'FLUTTERWAVE',
  transactionId: string,
  referenceId: string,
  status: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    // Log the webhook processing
    await db.auditLog.create({
      data: {
        action: `WEBHOOK_${provider}_${status}`,
        entityType: 'payment',
        entityId: transactionId,
        actorType: 'SYSTEM',
        description: `Webhook processed: ${provider} transaction ${transactionId}`,
        newValues: JSON.stringify(payload),
      },
    });
  } catch (error) {
    console.error('[WEBHOOK] Error recording webhook:', error);
  }
}

/**
 * Generate unique webhook request ID
 */
export function generateWebhookRequestId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================================================
// Webhook Response Helpers
// ============================================================================

/**
 * Create success response for webhook
 */
export function webhookSuccessResponse(
  requestId: string,
  message: string = 'Webhook processed'
): NextResponse {
  return NextResponse.json({
    success: true,
    requestId,
    message,
    processedAt: new Date().toISOString(),
  });
}

/**
 * Create duplicate webhook response
 */
export function webhookDuplicateResponse(
  requestId: string,
  transactionId: string
): NextResponse {
  return NextResponse.json({
    success: true,
    requestId,
    message: 'Webhook already processed',
    transactionId,
    duplicate: true,
  }, { status: 200 }); // Return 200 to acknowledge receipt
}

/**
 * Create error response for webhook
 */
export function webhookErrorResponse(
  requestId: string,
  error: string,
  statusCode: number = 400
): NextResponse {
  return NextResponse.json({
    success: false,
    requestId,
    error,
    timestamp: new Date().toISOString(),
  }, { status: statusCode });
}

// ============================================================================
// MTN MoMo Webhook Handler
// ============================================================================

export interface MtnWebhookPayload {
  transactionId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  payerMessage?: string;
  payeeNote?: string;
  externalId?: string;
  referenceId?: string;
}

export async function processMtnWebhook(
  request: NextRequest,
  payload: MtnWebhookPayload
): Promise<NextResponse> {
  const requestId = generateWebhookRequestId();
  const transactionId = payload.transactionId || payload.referenceId || payload.externalId;
  
  if (!transactionId) {
    return webhookErrorResponse(requestId, 'Missing transaction ID');
  }
  
  // Check for duplicate
  const isProcessed = await isWebhookProcessed('MTN', transactionId);
  if (isProcessed) {
    console.log(`[WEBHOOK] Duplicate MTN webhook: ${transactionId}`);
    return webhookDuplicateResponse(requestId, transactionId);
  }
  
  // Validate timestamp (MTN doesn't always send timestamps, skip if not present)
  // If present, would be in the webhook headers or payload
  
  return NextResponse.json({
    success: true,
    requestId,
    transactionId,
    requiresProcessing: true,
  });
}

// ============================================================================
// Airtel Webhook Handler
// ============================================================================

export interface AirtelWebhookPayload {
  transaction?: {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
  transactionId?: string;
  status?: string;
  reference?: string;
}

export async function processAirtelWebhook(
  request: NextRequest,
  payload: AirtelWebhookPayload
): Promise<NextResponse> {
  const requestId = generateWebhookRequestId();
  const transactionId = payload.transaction?.id || payload.transactionId || payload.reference;
  
  if (!transactionId) {
    return webhookErrorResponse(requestId, 'Missing transaction ID');
  }
  
  // Check for duplicate
  const isProcessed = await isWebhookProcessed('AIRTEL', transactionId);
  if (isProcessed) {
    console.log(`[WEBHOOK] Duplicate Airtel webhook: ${transactionId}`);
    return webhookDuplicateResponse(requestId, transactionId);
  }
  
  return NextResponse.json({
    success: true,
    requestId,
    transactionId,
    requiresProcessing: true,
  });
}

// ============================================================================
// Flutterwave Webhook Handler
// ============================================================================

export interface FlutterwaveWebhookPayload {
  event?: string;
  data?: {
    id?: number;
    tx_ref?: string;
    flw_ref?: string;
    status?: string;
    amount?: number;
    currency?: string;
    created_at?: string;
  };
}

export async function processFlutterwaveWebhook(
  request: NextRequest,
  payload: FlutterwaveWebhookPayload
): Promise<NextResponse> {
  const requestId = generateWebhookRequestId();
  const transactionId = String(payload.data?.id || payload.data?.flw_ref || payload.data?.tx_ref);
  
  if (!transactionId) {
    return webhookErrorResponse(requestId, 'Missing transaction ID');
  }
  
  // Check for duplicate
  const isProcessed = await isWebhookProcessed('FLUTTERWAVE', transactionId);
  if (isProcessed) {
    console.log(`[WEBHOOK] Duplicate Flutterwave webhook: ${transactionId}`);
    return webhookDuplicateResponse(requestId, transactionId);
  }
  
  // Validate timestamp
  if (payload.data?.created_at) {
    const timestampValidation = validateWebhookTimestamp(payload.data.created_at);
    if (!timestampValidation.valid) {
      return webhookErrorResponse(requestId, timestampValidation.error || 'Invalid timestamp', 400);
    }
  }
  
  return NextResponse.json({
    success: true,
    requestId,
    transactionId,
    event: payload.event,
    requiresProcessing: true,
  });
}
