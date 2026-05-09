/**
 * Airtel Money Callback Handler
 * Receives payment status updates from Airtel Money API
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments/payment-service';

export async function POST(request: NextRequest) {
  try {
    // Parse callback data
    const data = await request.json();
    
    console.log('Airtel Money Callback received:', JSON.stringify(data, null, 2));

    // Extract relevant fields from Airtel callback
    const callbackData = {
      reference: data.transaction?.reference || data.reference,
      status: data.transaction?.status || data.status,
      transactionId: data.transaction?.id,
      amount: data.transaction?.amount,
      currency: data.transaction?.currency,
      phoneNumber: data.subscriber?.msisdn,
      failureReason: data.status?.message,
    };

    // Handle the callback
    await PaymentService.handleAirtelCallback(callbackData);

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Airtel callback processing error:', error);
    
    // Still return 200 to prevent Airtel from retrying
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}
