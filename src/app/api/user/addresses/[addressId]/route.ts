import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api/response';
import { z } from 'zod';

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Verify ownership
    const existing = await db.savedAddress.findUnique({
      where: { id: params.addressId },
    });
    if (!existing || existing.userId !== decoded.userId) {
      return errorResponse('Address not found', 404);
    }

    if (validated.isDefault) {
      await db.savedAddress.updateMany({
        where: { userId: decoded.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await db.savedAddress.update({
      where: { id: params.addressId },
      data: validated,
    });

    return successResponse({ address }, 'Address updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || 'Validation error');
    }
    console.error('Error updating address:', error);
    return serverErrorResponse('Failed to update address');
  } finally {
    await resetRLSContext();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const existing = await db.savedAddress.findUnique({
      where: { id: params.addressId },
    });
    if (!existing || existing.userId !== decoded.userId) {
      return errorResponse('Address not found', 404);
    }

    await db.savedAddress.delete({
      where: { id: params.addressId },
    });

    return successResponse(null, 'Address deleted successfully');
  } catch (error) {
    console.error('Error deleting address:', error);
    return serverErrorResponse('Failed to delete address');
  } finally {
    await resetRLSContext();
  }
}
