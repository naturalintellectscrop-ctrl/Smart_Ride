/**
 * Admin User Management API
 * GET /api/admin/users - Get all users with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { UserRole, UserStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (role && role !== 'all') {
      where.role = role as UserRole;
    }
    
    if (status && status !== 'all') {
      where.status = status as UserStatus;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users and count
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              orders: true,
              tasks: true,
            }
          }
        }
      }),
      db.user.count({ where })
    ]);

    // Get stats
    const stats = await db.user.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const roleStats = await db.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    return NextResponse.json({
      users: users.map(user => ({
        ...user,
        orderCount: user._count.orders,
        taskCount: user._count.tasks,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        total,
        active: stats.find(s => s.status === 'ACTIVE')?._count.id || 0,
        suspended: stats.find(s => s.status === 'SUSPENDED')?._count.id || 0,
        inactive: stats.find(s => s.status === 'INACTIVE')?._count.id || 0,
        banned: stats.find(s => s.status === 'BANNED')?._count.id || 0,
        admins: roleStats.filter(r => 
          ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'].includes(r.role)
        ).reduce((sum, r) => sum + r._count.id, 0),
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Update user status
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !['ADMIN', 'SUPER_ADMIN'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, role, data } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case 'activate':
        updateData.status = 'ACTIVE';
        break;
      case 'suspend':
        updateData.status = 'SUSPENDED';
        break;
      case 'ban':
        updateData.status = 'BANNED';
        break;
      case 'change_role':
        if (!role) {
          return NextResponse.json({ error: 'role is required for change_role action' }, { status: 400 });
        }
        updateData.role = role;
        break;
      case 'update':
        // Full user update
        if (data) {
          if (data.name) updateData.name = data.name;
          if (data.email) updateData.email = data.email;
          if (data.phone !== undefined) updateData.phone = data.phone || null;
          if (data.role) updateData.role = data.role;
        }
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        userId: decoded.userId,
        action: action.toUpperCase(),
        entityType: 'User',
        entityId: userId,
        description: `User ${user.name} (${user.email}) ${action}d by admin`,
        oldValues: JSON.stringify({ status: user.status, role: user.role }),
        newValues: JSON.stringify(updateData),
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
