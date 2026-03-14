/**
 * GET /api/auth/me
 * Get current authenticated user
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getUserById } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const user = request.user;
    
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Get full user details
    const userDetails = await getUserById(user.userId);

    if (!userDetails) {
      return errorResponse('User not found', 404);
    }

    return successResponse(userDetails);
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('Failed to get user', 500);
  }
});
