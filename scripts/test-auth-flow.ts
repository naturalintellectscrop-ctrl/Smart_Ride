#!/usr/bin/env bun

/**
 * Smart Ride - Authentication Flow Test Script
 * 
 * This script tests the complete Phone + OTP authentication flow
 * Run with: bun scripts/test-auth-flow.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function log(step: string, success: boolean, message: string, data?: any) {
  const result = { step, success, message, data };
  results.push(result);
  
  const icon = success ? '✅' : '❌';
  console.log(`${icon} [${step}] ${message}`);
  if (data) console.log('   Data:', JSON.stringify(data, null, 2));
}

async function testHealthCheck() {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/api/health`);
    const data = await response.json();
    log('Health Check', response.ok, 'Server is running', data);
    return response.ok;
  } catch (error) {
    log('Health Check', false, `Server not reachable: ${error}`);
    return false;
  }
}

async function testSendOTP(phone: string) {
  try {
    console.log('\n📱 Testing Send OTP...');
    
    const response = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        purpose: 'login',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('Send OTP', true, `OTP sent to ${phone}`, {
        expiresIn: data.expiresIn,
        otp: data.otp, // Only shown in dev mode
      });
      return { success: true, otp: data.otp };
    } else {
      log('Send OTP', false, data.error || 'Failed to send OTP');
      return { success: false };
    }
  } catch (error) {
    log('Send OTP', false, `Request failed: ${error}`);
    return { success: false };
  }
}

async function testVerifyOTP(phone: string, otp: string) {
  try {
    console.log('\n🔐 Testing Verify OTP...');
    
    const response = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        otp,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('Verify OTP', true, 'OTP verified successfully', {
        accessToken: data.accessToken ? '✓ Received' : '✗ Missing',
        refreshToken: data.refreshToken ? '✓ Received' : '✗ Missing',
        user: data.user?.name || data.user?.phone,
      });
      return { success: true, tokens: data };
    } else {
      log('Verify OTP', false, data.error || 'OTP verification failed');
      return { success: false };
    }
  } catch (error) {
    log('Verify OTP', false, `Request failed: ${error}`);
    return { success: false };
  }
}

async function testRefreshToken(refreshToken: string) {
  try {
    console.log('\n🔄 Testing Refresh Token...');
    
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('Refresh Token', true, 'Token refreshed successfully', {
        accessToken: data.accessToken ? '✓ Received' : '✗ Missing',
      });
      return { success: true };
    } else {
      log('Refresh Token', false, data.error || 'Token refresh failed');
      return { success: false };
    }
  } catch (error) {
    log('Refresh Token', false, `Request failed: ${error}`);
    return { success: false };
  }
}

async function testGetCurrentUser(accessToken: string) {
  try {
    console.log('\n👤 Testing Get Current User...');
    
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('Get Current User', true, 'User retrieved successfully', {
        id: data.user?.id,
        phone: data.user?.phone,
        role: data.user?.role,
      });
      return { success: true };
    } else {
      log('Get Current User', false, data.error || 'Failed to get user');
      return { success: false };
    }
  } catch (error) {
    log('Get Current User', false, `Request failed: ${error}`);
    return { success: false };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Smart Ride - Authentication Flow Test');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📡 API Base: ${API_BASE}`);
  
  // Test phone number (Uganda format)
  const testPhone = '+256700123456';
  
  // Step 1: Health check
  const healthy = await testHealthCheck();
  if (!healthy) {
    console.log('\n❌ Server is not running. Start with: bun run dev');
    return;
  }
  
  // Step 2: Send OTP
  const sendResult = await testSendOTP(testPhone);
  
  let otpToUse = sendResult.otp;
  
  // If no OTP returned (production mode), prompt user
  if (!otpToUse) {
    console.log('\n⚠️  OTP not returned (production mode or SMS enabled)');
    console.log('Check the server console for OTP or use this test OTP: 123456');
    
    // In dev mode with SMS disabled, try a known test OTP
    otpToUse = '123456';
    console.log(`Using test OTP: ${otpToUse}`);
  }
  
  // Step 3: Verify OTP
  const verifyResult = await testVerifyOTP(testPhone, otpToUse);
  
  if (verifyResult.success && verifyResult.tokens?.accessToken) {
    // Step 4: Get current user
    await testGetCurrentUser(verifyResult.tokens.accessToken);
    
    // Step 5: Test refresh token (if available)
    if (verifyResult.tokens.refreshToken) {
      await testRefreshToken(verifyResult.tokens.refreshToken);
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Test Summary');
  console.log('═══════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed steps:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.step}: ${r.message}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════');
}

// Run tests
runTests().catch(console.error);
