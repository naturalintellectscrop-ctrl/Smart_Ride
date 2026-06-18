import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api/response';
import { z } from 'zod';

const createSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const addresses = await db.savedAddress.findMany({
      where: { userId: decoded.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return successResponse({ addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return serverErrorResponse('Failed to fetch addresses');
  } finally {
    await resetRLSContext();
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validated = createSchema.parse(body);

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await db.savedAddress.updateMany({
        where: { userId: decoded.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await db.savedAddress.create({
      data: {
        userId: decoded.userId,
        label: validated.label,
        address: validated.address,
        latitude: validated.latitude,
        longitude: validated.longitude,
        isDefault: validated.isDefault || false,
      },
    });

    return successResponse({ address }, 'Address saved successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || 'Validation error');
    }
    console.error('Error creating address:', error);
    return serverErrorResponse('Failed to save address');
  } finally {
    await resetRLSContext();
  }
}
