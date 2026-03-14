/**
 * Authentication Service Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from '../../lib/services/auth.service';
import { hashPassword, verifyPassword, validatePasswordStrength, generateOTP } from '../../lib/auth/password';
import { generateTokenPair, verifyAccessToken } from '../../lib/auth/jwt';

describe('Password Utilities', () => {
  it('should hash a password', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify correct password', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword('WrongPassword', hash);
    
    expect(isValid).toBe(false);
  });

  it('should validate password strength', () => {
    expect(validatePasswordStrength('short')).toBe('Password must be at least 8 characters long');
    expect(validatePasswordStrength('alllowercase1')).toBe('Password must contain at least one uppercase letter');
    expect(validatePasswordStrength('ALLUPPERCASE1')).toBe('Password must contain at least one lowercase letter');
    expect(validatePasswordStrength('NoNumbers')).toBe('Password must contain at least one number');
    expect(validatePasswordStrength('ValidPass123')).toBe(null);
  });

  it('should generate OTP of correct length', () => {
    const otp6 = generateOTP(6);
    const otp4 = generateOTP(4);
    
    expect(otp6.length).toBe(6);
    expect(otp4.length).toBe(4);
    expect(/^\d+$/.test(otp6)).toBe(true);
  });
});

describe('JWT Token Generation', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'CLIENT' as const,
    name: 'Test User',
  };

  it('should generate access token', () => {
    const token = generateTokenPair(mockUser).accessToken;
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('should generate token pair', () => {
    const tokens = generateTokenPair(mockUser);
    
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBeGreaterThan(0);
  });

  it('should verify valid access token', () => {
    const tokens = generateTokenPair(mockUser);
    const payload = verifyAccessToken(tokens.accessToken);
    
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(mockUser.id);
    expect(payload?.email).toBe(mockUser.email);
    expect(payload?.role).toBe(mockUser.role);
  });

  it('should reject invalid token', () => {
    const payload = verifyAccessToken('invalid.token.here');
    expect(payload).toBeNull();
  });
});

describe('User Registration', () => {
  it('should reject invalid email', async () => {
    const result = await registerUser({
      name: 'Test User',
      email: 'invalid-email',
      password: 'ValidPass123',
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid email');
  });

  it('should reject weak password', async () => {
    const result = await registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'weak',
    });
    
    expect(result.success).toBe(false);
  });

  it('should reject short name', async () => {
    const result = await registerUser({
      name: 'T',
      email: 'test@example.com',
      password: 'ValidPass123',
    });
    
    expect(result.success).toBe(false);
  });
});

describe('User Login', () => {
  it('should reject invalid email format', async () => {
    const result = await loginUser({
      email: 'invalid-email',
      password: 'password',
    });
    
    expect(result.success).toBe(false);
  });

  it('should reject empty password', async () => {
    const result = await loginUser({
      email: 'test@example.com',
      password: '',
    });
    
    expect(result.success).toBe(false);
  });
});

console.log('✅ Auth tests defined');
