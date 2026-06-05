/**
 * POST /api/auth/logout
 * Logout user and invalidate tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/services/auth.service';
import { getAuthUser } from '@/lib/auth/middleware';
import { setRLSContext, resetRLSContext } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    
    if (user) {
      // Set RLS context before DB operations
      await setRLSContext(user);
      // Invalidate refresh token in database
      await logoutUser(user.userId);
    }

    // Clear refresh token cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse('Failed to logout', 500);
  } finally {
    await resetRLSContext();
  }
}
