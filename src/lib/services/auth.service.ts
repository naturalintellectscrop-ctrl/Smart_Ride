/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */

import { db } from '@/lib/db';
import { hashPassword, verifyPassword, validatePasswordStrength, generateOTP } from '../auth/password';
import { generateTokenPair, verifyRefreshToken } from '../auth/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['CLIENT', 'RIDER', 'MERCHANT', 'PHARMACIST']).default('CLIENT'),
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
    
    // Generate tokens
    const tokens = generateTokenPair(user);
    
    // Update user with refresh token
    await db.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
      return { success: false, error: zodError.errors[0]?.message || 'Validation error' };
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
    
    // Generate tokens
    const tokens = generateTokenPair(user);
    
    // Update user with refresh token and last login
    await db.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      return { success: false, error: zodError.errors[0]?.message || 'Validation error' };
    }
    console.error('Login error:', error);
    return { success: false, error: 'Failed to login' };
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResult> {
  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return { success: false, error: 'Invalid refresh token' };
    }
    
    // Find user and verify stored refresh token
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user || user.refreshToken !== refreshToken) {
      return { success: false, error: 'Invalid refresh token' };
    }
    
    // Check if refresh token is expired
    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
      return { success: false, error: 'Refresh token expired' };
    }
    
    // Generate new tokens
    const tokens = generateTokenPair(user);
    
    // Update user with new refresh token
    await db.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    console.error('Token refresh error:', error);
    return { success: false, error: 'Failed to refresh token' };
  }
}

/**
 * Logout user - invalidate refresh token
 */
export async function logoutUser(userId: string): Promise<{ success: boolean }> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });
    
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
    
    // In production, send OTP via email/SMS
    console.log(`Password reset OTP for ${email}: ${otp}`);
    
    return { success: true, otp }; // Return OTP for testing
  } catch (error) {
    console.error('Password reset request error:', error);
    return { success: false, error: 'Failed to request password reset' };
  }
}
