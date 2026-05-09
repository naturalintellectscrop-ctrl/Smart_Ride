import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { 
  getNotificationPreferences, 
  updateNotificationPreferences 
} from '@/lib/notifications/notification-service';
import { z } from 'zod';

const preferencesSchema = z.object({
  surgeAlerts: z.boolean().optional(),
  highDemandAlerts: z.boolean().optional(),
  incentiveAlerts: z.boolean().optional(),
  earningsOpportunities: z.boolean().optional(),
  repositionRequests: z.boolean().optional(),
  surgeWarnings: z.boolean().optional(),
  promoAlerts: z.boolean().optional(),
  discountOffers: z.boolean().optional(),
  taskUpdates: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  paymentUpdates: z.boolean().optional(),
  systemUpdates: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return errorResponse('User ID is required');
    }

    const preferences = await getNotificationPreferences(userId);
    return successResponse({ preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return serverErrorResponse('Failed to fetch notification preferences');
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...preferences } = body;

    if (!userId) {
      return errorResponse('User ID is required');
    }

    const validatedData = preferencesSchema.parse(preferences);

    const updatedPrefs = await updateNotificationPreferences(userId, validatedData);
    return successResponse({ preferences: updatedPrefs }, 'Notification preferences updated');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    console.error('Error updating notification preferences:', error);
    return serverErrorResponse('Failed to update notification preferences');
  }
}
