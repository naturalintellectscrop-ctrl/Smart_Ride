/**
 * Smart Ride Email Service
 * Uses Resend for email delivery (free tier available)
 * 
 * Setup:
 * 1. Go to https://resend.com
 * 2. Create account
 * 3. Get API key
 * 4. Add RESEND_API_KEY to environment variables
 */

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@smartride.ug';

// Types
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Send email using Resend API
 */
export async function sendEmail(params: SendEmailParams): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  // Check if API key is configured
  if (!RESEND_API_KEY) {
    console.warn('Email service not configured. Set RESEND_API_KEY environment variable.');
    // In development, log the email instead of sending
    console.log('📧 Email would be sent:', {
      to: params.to,
      subject: params.subject,
    });
    return { success: true, id: `dev_${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email');
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// ==========================================
// EMAIL TEMPLATES
// ==========================================

/**
 * Generate OTP email template
 */
export function generateOTPEmail(otp: string, purpose: string = 'verification'): EmailTemplate {
  return {
    subject: `Your Smart Ride ${purpose} code`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .logo { font-size: 24px; font-weight: bold; color: #00FF88; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00FF88; padding: 20px; background: #f5f5f5; text-align: center; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Smart Ride</div>
            </div>
            <p>Hello,</p>
            <p>Your verification code is:</p>
            <div class="code">${otp}</div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Your Smart Ride ${purpose} code

Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.
    `.trim(),
  };
}

/**
 * Generate welcome email template
 */
export function generateWelcomeEmail(name: string): EmailTemplate {
  return {
    subject: 'Welcome to Smart Ride!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .logo { font-size: 24px; font-weight: bold; color: #00FF88; }
            .button { display: inline-block; padding: 12px 24px; background: #00FF88; color: #0D0D12; text-decoration: none; border-radius: 8px; font-weight: bold; }
            .feature { padding: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Smart Ride</div>
            </div>
            <h1>Welcome to Smart Ride, ${name}!</h1>
            <p>Thank you for joining Smart Ride, Uganda's premier multi-service mobility platform.</p>
            
            <h2>What you can do with Smart Ride:</h2>
            <div class="feature">🏍️ <strong>Smart Boda</strong> - Quick motorcycle rides</div>
            <div class="feature">🚗 <strong>Smart Car</strong> - Comfortable car rides</div>
            <div class="feature">🍔 <strong>Food Delivery</strong> - Restaurant meals delivered</div>
            <div class="feature">🛒 <strong>Smart Grocery</strong> - Groceries & retail</div>
            <div class="feature">📦 <strong>Smart Courier</strong> - Send packages anywhere</div>
            <div class="feature">💊 <strong>Smart Health</strong> - Medicines & healthcare</div>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="https://smartride.ug" class="button">Start Riding</a>
            </p>
            
            <p>Need help? Contact our support team at support@smartride.ug</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Smart Ride, ${name}!

Thank you for joining Smart Ride, Uganda's premier multi-service mobility platform.

What you can do with Smart Ride:
- Smart Boda - Quick motorcycle rides
- Smart Car - Comfortable car rides
- Food Delivery - Restaurant meals delivered
- Smart Grocery - Groceries & retail
- Smart Courier - Send packages anywhere
- Smart Health - Medicines & healthcare

Start riding at https://smartride.ug

Need help? Contact our support team at support@smartride.ug

© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.
    `.trim(),
  };
}

/**
 * Generate password reset email template
 * Includes both web and mobile app deep links
 */
export function generatePasswordResetEmail(resetToken: string, resetUrl: string): EmailTemplate {
  const webLink = `${resetUrl}?token=${resetToken}`;
  const mobileLink = `smartride://auth/reset-password?token=${resetToken}`;
  
  return {
    subject: 'Reset Your Smart Ride Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .logo { font-size: 24px; font-weight: bold; color: #00FF88; }
            .button { display: inline-block; padding: 12px 24px; background: #00FF88; color: #0D0D12; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 8px; }
            .button-secondary { display: inline-block; padding: 10px 20px; background: #1A1A24; color: #00FF88; text-decoration: none; border-radius: 8px; font-weight: 600; border: 1px solid #00FF88; margin: 8px; }
            .divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Smart Ride</div>
            </div>
            <h1>Reset Your Password</h1>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <p style="text-align: center; margin: 20px 0;">
              <a href="${webLink}" class="button">Reset Password (Web)</a>
            </p>
            
            <hr class="divider">
            
            <p style="text-align: center; color: #666; font-size: 14px;">Using the mobile app?</p>
            <p style="text-align: center; margin: 10px 0;">
              <a href="${mobileLink}" class="button-secondary">Open in Smart Ride App</a>
            </p>
            
            <hr class="divider">
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${webLink}</p>
            
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Reset Your Smart Ride Password

We received a request to reset your password.

Reset via web: ${webLink}

Reset via mobile app: ${mobileLink}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.
    `.trim(),
  };
}

/**
 * Generate order confirmation email
 */
export function generateOrderConfirmationEmail(params: {
  name: string;
  orderNumber: string;
  orderType: string;
  total: number;
  currency: string;
}): EmailTemplate {
  return {
    subject: `Order Confirmed - ${params.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .logo { font-size: 24px; font-weight: bold; color: #00FF88; }
            .order-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Smart Ride</div>
            </div>
            <h1>Order Confirmed!</h1>
            <p>Hi ${params.name},</p>
            <p>Your order has been confirmed and is being processed.</p>
            
            <div class="order-box">
              <p><strong>Order Number:</strong> ${params.orderNumber}</p>
              <p><strong>Order Type:</strong> ${params.orderType}</p>
              <p><strong>Total:</strong> ${params.currency} ${params.total.toLocaleString()}</p>
            </div>
            
            <p>We'll notify you when your order is on its way.</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Order Confirmed - ${params.orderNumber}

Hi ${params.name},

Your order has been confirmed and is being processed.

Order Number: ${params.orderNumber}
Order Type: ${params.orderType}
Total: ${params.currency} ${params.total.toLocaleString()}

We'll notify you when your order is on its way.

© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.
    `.trim(),
  };
}

/**
 * Generate rider application status email
 */
export function generateRiderStatusEmail(params: {
  name: string;
  status: 'approved' | 'rejected' | 'pending';
  reason?: string;
}): EmailTemplate {
  const statusMessages = {
    approved: {
      subject: 'Congratulations! Your Smart Ride Rider Application is Approved',
      message: 'Your application has been approved! You can now start accepting rides and deliveries.',
    },
    rejected: {
      subject: 'Update on Your Smart Ride Rider Application',
      message: 'Unfortunately, your application was not approved at this time.',
    },
    pending: {
      subject: 'Your Smart Ride Rider Application is Under Review',
      message: 'Your application is being reviewed. We will contact you soon.',
    },
  };

  const { subject, message } = statusMessages[params.status];

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .logo { font-size: 24px; font-weight: bold; color: #00FF88; }
            .status-approved { color: #00FF88; }
            .status-rejected { color: #ff4444; }
            .status-pending { color: #ffaa00; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Smart Ride</div>
            </div>
            <h1>Hello ${params.name},</h1>
            <p>${message}</p>
            ${params.reason ? `<p><strong>Reason:</strong> ${params.reason}</p>` : ''}
            ${params.status === 'approved' ? '<p><a href="https://smartride.ug/rider" style="display: inline-block; padding: 12px 24px; background: #00FF88; color: #0D0D12; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Earning</a></p>' : ''}
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${subject}

Hello ${params.name},

${message}
${params.reason ? `\nReason: ${params.reason}` : ''}

© ${new Date().getFullYear()} Smart Ride Uganda. All rights reserved.
    `.trim(),
  };
}

// ==========================================
// ADDITIONAL TEMPLATES FOR API
// ==========================================

/**
 * Generate OTP email for verification
 */
function generateOTP(otp: string, purpose: string = 'verification'): EmailTemplate {
  return generateOTPEmail(otp, purpose);
}

/**
 * Generate welcome email (wrapper)
 */
function generateWelcome(name: string, email: string): EmailTemplate {
  return generateWelcomeEmail(name);
}

/**
 * Generate password reset email (wrapper)
 */
function generatePasswordReset(resetUrl: string, token: string): EmailTemplate {
  return generatePasswordResetEmail(token, resetUrl);
}

/**
 * Generate order confirmation email (wrapper)
 */
function generateOrderConfirmation(params: {
  name: string;
  orderNumber: string;
  orderType: string;
  total: number;
  currency?: string;
}): EmailTemplate {
  return generateOrderConfirmationEmail({
    ...params,
    currency: params.currency || 'UGX',
  });
}

/**
 * Generate rider status email (wrapper)
 */
function generateRiderStatus(params: {
  name: string;
  status: 'approved' | 'rejected' | 'pending';
  reason?: string;
}): EmailTemplate {
  return generateRiderStatusEmail(params);
}

// Export email service
export const emailService = {
  send: sendEmail,
  templates: {
    generateOTP,
    generateWelcome,
    generatePasswordReset,
    generateOrderConfirmation,
    generateRiderStatus,
    // Original functions also available
    generateOTPEmail,
    generateWelcomeEmail,
    generatePasswordResetEmail,
    generateOrderConfirmationEmail,
    generateRiderStatusEmail,
  },
};

export default emailService;
