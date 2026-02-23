// ============================================================================
// Notifications Routes
// ============================================================================

import { Router } from "express";
import * as notificationsService from "./notifications.service";

const router = Router();

router.get("/", async (req: any, res: any) => {
  try {
    const notifications = await notificationsService.listNotifications(
      req.query,
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.put("/:id/read", async (req: any, res: any) => {
  try {
    const notification = await notificationsService.markAsRead(req.params.id);
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

router.post("/test", async (req: any, res: any) => {
  try {
    const result = await notificationsService.sendTestNotification(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

export default router;
