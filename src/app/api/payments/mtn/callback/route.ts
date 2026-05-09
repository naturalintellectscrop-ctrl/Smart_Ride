/**
 * MTN Mobile Money Callback Handler
 * Receives payment status updates from MTN MoMo API
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments/payment-service';

export async function POST(request: NextRequest) {
  try {
    // Parse callback data
    const data = await request.json();
    
    console.log('MTN MoMo Callback received:', JSON.stringify(data, null, 2));

    // Extract relevant fields from MTN callback
    const callbackData = {
      reference: data.externalId || data.referenceId,
      status: data.status,
      transactionId: data.financialTransactionId,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      currency: data.currency,
      phoneNumber: data.payer?.partyId,
      failureReason: data.reason?.message,
    };

    // Handle the callback
    await PaymentService.handleMTNCallback(callbackData);

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('MTN callback processing error:', error);
    
    // Still return 200 to prevent MTN from retrying
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}
