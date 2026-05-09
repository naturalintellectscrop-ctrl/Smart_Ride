/**
 * Email Sending API
 * POST /api/email/send - Send an email
 * 
 * Uses Resend for email delivery
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, data } = body;

    // Direct email sending (no template)
    if (!type) {
      const { to: recipients, subject, html, text } = body;
      
      if (!recipients || !subject || !html) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: to, subject, html' },
          { status: 400 }
        );
      }

      const result = await sendEmail({
        to: recipients,
        subject,
        html,
        text,
      });

      return NextResponse.json({
        success: result.success,
        id: result.id,
        error: result.error,
      });
    }

    // Template-based email sending
    let template;

    switch (type) {
      case 'welcome':
        if (!data?.name) {
          return NextResponse.json(
            { success: false, error: 'Missing data for welcome email: name' },
            { status: 400 }
          );
        }
        template = emailService.templates.generateWelcome(data.name, data.email || 'user');
        break;

      case 'otp':
        if (!data?.otp) {
          return NextResponse.json(
            { success: false, error: 'Missing data for OTP email: otp' },
            { status: 400 }
          );
        }
        template = emailService.templates.generateOTP(data.otp, data.purpose || 'verification');
        break;

      case 'password-reset':
        if (!data?.resetUrl || !data?.token) {
          return NextResponse.json(
            { success: false, error: 'Missing data for password reset email: resetUrl, token' },
            { status: 400 }
          );
        }
        template = emailService.templates.generatePasswordReset(data.resetUrl, data.token);
        break;

      case 'order-confirmation':
        if (!data?.name || !data?.orderNumber) {
          return NextResponse.json(
            { success: false, error: 'Missing data for order confirmation email' },
            { status: 400 }
          );
        }
        template = emailService.templates.generateOrderConfirmation({
          name: data.name,
          orderNumber: data.orderNumber,
          orderType: data.orderType || 'Order',
          total: data.total || 0,
          currency: data.currency || 'UGX',
        });
        break;

      case 'rider-status':
        if (!data?.name || !data?.status) {
          return NextResponse.json(
            { success: false, error: 'Missing data for rider status email: name, status' },
            { status: 400 }
          );
        }
        template = emailService.templates.generateRiderStatus({
          name: data.name,
          status: data.status,
          reason: data.reason,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    const result = await sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return NextResponse.json({
      success: result.success,
      id: result.id,
      error: result.error,
      message: result.success ? `${type} email sent successfully` : undefined,
    });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

// GET endpoint to check email service status
export async function GET() {
  const isConfigured = !!process.env.RESEND_API_KEY;
  
  return NextResponse.json({
    success: true,
    configured: isConfigured,
    from: process.env.EMAIL_FROM || 'noreply@smartride.ug',
    message: isConfigured 
      ? 'Email service is configured and ready'
      : 'Email service not configured. Add RESEND_API_KEY environment variable.',
  });
}
