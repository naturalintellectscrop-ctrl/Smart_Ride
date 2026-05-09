import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '@/lib/notifications/notification-service';
import { z } from 'zod';

const markReadSchema = z.object({
  notificationId: z.string(),
  userId: z.string(),
});

const markAllReadSchema = z.object({
  userId: z.string(),
});

/**
 * POST /api/notifications/read
 * Mark notification(s) as read
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Mark all as read
    if (body.markAll) {
      const validatedData = markAllReadSchema.parse(body);
      const result = await markAllNotificationsAsRead(validatedData.userId);
      return successResponse({ 
        count: result.count 
      }, `${result.count} notifications marked as read`);
    }

    // Mark single notification as read
    const validatedData = markReadSchema.parse(body);
    const result = await markNotificationAsRead(
      validatedData.notificationId, 
      validatedData.userId
    );

    if (result.count === 0) {
      return errorResponse('Notification not found or already read');
    }

    return successResponse({ success: true }, 'Notification marked as read');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    console.error('Error marking notification as read:', error);
    return serverErrorResponse('Failed to mark notification as read');
  }
}
