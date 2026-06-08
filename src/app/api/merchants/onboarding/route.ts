/**
 * Merchant Onboarding API
 * POST /api/merchants/onboarding - Register a new merchant with documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { MerchantOnboardingService } from '@/lib/merchant/merchant-onboarding.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const merchant = await MerchantOnboardingService.registerMerchant(body);

    return NextResponse.json(
      {
        success: true,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          type: merchant.type,
          phone: merchant.phone,
          status: merchant.status,
          createdAt: merchant.createdAt,
        },
        message: 'Merchant registration submitted. Awaiting approval.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Merchant onboarding error:', error);
    const isClientError = error instanceof Error && (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('already exists'));
    const status = isClientError ? 400 : 500;
    return NextResponse.json(
      { success: false, error: isClientError ? 'Invalid registration data' : 'An internal error occurred' },
      { status }
    );
  }
}
