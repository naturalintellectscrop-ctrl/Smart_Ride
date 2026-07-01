/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */

import { db } from '@/lib/db';
import { hashPassword, verifyPassword, validatePasswordStrength, generateOTP } from '../auth/password';
import { generateTokenPair, verifyRefreshToken } from '../auth/jwt';
import { createSession, refreshSession, revokeAllSessions } from '../auth/session-service';
import { UserRole, UserStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // DRIVER = Smart Car driver. Delivery Personnel register as RIDER and pick a
  // delivery vehicle during onboarding (riderRole = DELIVERY_PERSONNEL).
  role: z.enum(['CLIENT', 'RIDER', 'DRIVER', 'MERCHANT', 'PHARMACIST']).default('CLIENT'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: UserRole;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
}

/**
 * Register a new user
 */
export async function registerUser(data: z.infer<typeof registerSchema>): Promise<AuthResult> {
  try {
    // Validate input
    const validated = registerSchema.parse(data);
    
    // Validate password strength
    const passwordError = validatePasswordStrength(validated.password);
    if (passwordError) {
      return { success: false, error: passwordError };
    }
    
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });
    
    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }
    
    // Check phone uniqueness if provided
    if (validated.phone) {
      const existingPhone = await db.user.findUnique({
        where: { phone: validated.phone },
      });
      
      if (existingPhone) {
        return { success: false, error: 'User with this phone number already exists' };
      }
    }
    
    // Hash password
    const passwordHash = await hashPassword(validated.password);
    
    // Create user
    const user = await db.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        passwordHash,
        role: validated.role as UserRole,
        status: 'ACTIVE',
        authProvider: 'email',
      },
    });
    
    // Create a proper session record instead of storing refresh token on User row
    const sessionResult = await createSession({
      userId: user.id,
      deviceId: `register-${Date.now()}`,
      deviceName: 'Registration',
      deviceType: 'web',
    });

    // Use session tokens if available, fallback to generated tokens
    const tokens = sessionResult.success
      ? { accessToken: sessionResult.accessToken!, refreshToken: sessionResult.refreshToken!, expiresIn: sessionResult.expiresIn! }
      : generateTokenPair(user);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      tokens,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return { success: false, error: zodError.issues[0]?.message || 'Validation error' };
    }
    console.error('Registration error:', error);
    return { success: false, error: 'Failed to register user' };
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(data: z.infer<typeof loginSchema>): Promise<AuthResult> {
  try {
    // Validate input
    const validated = loginSchema.parse(data);
    
    // Find user
    const user = await db.user.findUnique({
      where: { email: validated.email },
    });
    
    if (!user || !user.passwordHash) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return { success: false, error: 'Account is not active. Please contact support.' };
    }
    
    // Verify password
    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Create a proper session record instead of storing refresh token on User row
    const sessionResult = await createSession({
      userId: user.id,
      deviceId: `login-${Date.now()}`,
      deviceName: 'Login',
      deviceType: 'web',
    });

    // Use session tokens if available, fallback to generated tokens
    const tokens = sessionResult.success
      ? { accessToken: sessionResult.accessToken!, refreshToken: sessionResult.refreshToken!, expiresIn: sessionResult.expiresIn! }
      : generateTokenPair(user);

    // Update last login timestamp (session creation already handles this, but keep for safety)
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      tokens,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return { success: false, error: zodError.issues[0]?.message || 'Validation error' };
    }
    console.error('Login error:', error);
    return { success: false, error: 'Failed to login' };
  }
}

/**
 * Refresh access token
 * Delegates to session-service for proper Session-based token validation
 */
export async function refreshAccessToken(refreshToken: string, deviceId?: string): Promise<AuthResult> {
  try {
    // Use session-service for proper Session-based refresh
    const sessionResult = await refreshSession(refreshToken, deviceId);

    if (!sessionResult.success) {
      return { success: false, error: sessionResult.error || 'Invalid refresh token' };
    }

    // Get user info for the response
    // Verify the JWT access token to extract user info
    const payload = verifyRefreshToken(refreshToken);
    
    let user: { id: string; name: string; email: string; phone: string | null; role: UserRole } | null = null;
    if (payload) {
      const dbUser = await db.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });
      if (dbUser) {
        user = dbUser;
      }
    }

    return {
      success: true,
      user: user || undefined,
      tokens: {
        accessToken: sessionResult.accessToken!,
        refreshToken: sessionResult.refreshToken!,
        expiresIn: sessionResult.expiresIn!,
      },
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, error: 'Failed to refresh token' };
  }
}

/**
 * Logout user - invalidate refresh token
 */
export async function logoutUser(userId: string): Promise<{ success: boolean }> {
  try {
    // Nullify legacy refresh token on User row
    await db.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    // Revoke all Session records
    await revokeAllSessions(userId);

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Change password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate new password
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return { success: false, error: passwordError };
    }
    
    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
    });
    
    if (!user || !user.passwordHash) {
      return { success: false, error: 'User not found' };
    }
    
    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        refreshToken: null, // Invalidate all sessions
        refreshTokenExpiresAt: null,
      },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

/**
 * Request password reset (generates OTP)
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      // Don't reveal if user exists
      return { success: true };
    }
    
    // Generate OTP
    const otp = generateOTP(6);
    
    // Store OTP (in production, this would be in Redis or similar)
    // For now, we'll use a simple approach
    await db.user.update({
      where: { id: user.id },
      data: {
        // In production, store hashed OTP with expiry
        verificationNotes: `RESET_OTP:${otp}:${Date.now() + 10 * 60 * 1000}`, // 10 min expiry
      },
    });
    
    // In production, send OTP via email/SMS.
    // SECURITY: Only log OTP in non-production environments (dev/test).
    // Previously this was an unconditional console.log — in production it
    // would leak OTPs to stdout (visible in Vercel/Supabase logs).
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset OTP for ${email}: ${otp}`);
    }
    
    // SECURITY: Only return OTP in development with explicit opt-in
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const allowOtpInResponse = isDevelopment && process.env.ALLOW_OTP_IN_RESPONSE === 'true';
    
    return { success: true, ...(allowOtpInResponse ? { otp } : {}) };
  } catch (error) {
    console.error('Password reset request error:', error);
    return { success: false, error: 'Failed to request password reset' };
  }
}
