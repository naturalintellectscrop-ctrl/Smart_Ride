/**
 * GET /api/user/profile
 * Get the current user's profile
 * PUT /api/user/profile
 * Update the current user's profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.userId;

    // Get user profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return serverErrorResponse('Failed to fetch user profile');
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.userId;

    const body = await request.json();
    const { name, phone, avatarUrl } = body;

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        avatarUrl: avatarUrl || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        status: true,
      },
    });

    return successResponse(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return serverErrorResponse('Failed to update user profile');
  }
}
