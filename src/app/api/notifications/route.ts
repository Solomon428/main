import { NextRequest } from "next/server";
import { NotificationService } from "@/services/notification-service";
import { ok, badRequest, serverError } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    if (!userId) {
      return badRequest("Missing required parameter: userId");
    }

    const result = await NotificationService.getUserNotifications(userId, {
      page,
      pageSize,
    });

    return ok(result.notifications, {
      meta: {
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return serverError("Failed to fetch notifications");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, userId, action } = body;

    if (!notificationId || !userId || !action) {
      return badRequest("Missing required fields");
    }

    if (action === "markAsRead") {
      await NotificationService.markAsRead(notificationId);
    } else if (action === "archive") {
      // Archive functionality not implemented yet - mark as read for now
      await NotificationService.markAsRead(notificationId);
    }

    return ok({ message: "Notification updated successfully" });
  } catch (error) {
    console.error("Error updating notification:", error);
    return serverError("Failed to update notification");
  }
}
