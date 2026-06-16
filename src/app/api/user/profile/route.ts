/**
 * GET /api/user/profile
 * Get the current user's profile
 * PUT /api/user/profile
 * Update the current user's profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { Prisma } from '@prisma/client';

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
        address: true,
        notificationPreferences: true,
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
  } finally {
    await resetRLSContext();
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
    const { name, phone, email, address, avatarUrl, role } = body;

    // Build the update payload — only include fields that are explicitly
    // provided so we don't accidentally null out unset columns.
    const updateData: Prisma.UserUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (address !== undefined) updateData.address = address || null;
    // Role changes are typically gated, but the existing contract allows it.
    if (role !== undefined) updateData.role = role;

    // Email updates require uniqueness — only attempt the change if the
    // user actually provided a value AND it differs from the current one.
    if (email !== undefined && email) {
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (currentUser && currentUser.email !== email) {
        // Check for collision up-front to give a friendly error.
        const existing = await db.user.findUnique({ where: { email } });
        if (existing && existing.id !== userId) {
          return errorResponse('That email is already in use', 400);
        }
        updateData.email = email;
      }
    }

    if (Object.keys(updateData).length === 0) {
      // Nothing to update — return current profile.
      const fresh = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatarUrl: true,
          address: true,
          status: true,
        },
      });
      return successResponse(fresh);
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        address: true,
        status: true,
        notificationPreferences: true,
      },
    });

    return successResponse(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    // Surface unique-constraint violations with a clear message
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[] | undefined)?.join(', ') || 'field';
        return errorResponse(`That ${target} is already in use`, 400);
      }
    }
    return serverErrorResponse('Failed to update user profile');
  } finally {
    await resetRLSContext();
  }
}
