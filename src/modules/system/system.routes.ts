// ============================================================================
// System Routes
// ============================================================================

import { Router } from "express";
import * as scheduledTasksService from "./scheduled-tasks.service";
import * as systemSettingsService from "./system-settings.service";

const router = Router();

// Settings routes
router.get("/settings", async (req: any, res: any) => {
  try {
    const settings = await systemSettingsService.listSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.get("/settings/:key", async (req: any, res: any) => {
  try {
    const setting = await systemSettingsService.getSetting(req.params.key);
    if (!setting) {
      return res.status(404).json({ error: "Setting not found" });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch setting" });
  }
});

router.put("/settings/:key", async (req: any, res: any) => {
  try {
    const setting = await systemSettingsService.updateSetting(
      req.params.key,
      req.body,
    );
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// Scheduled tasks routes
router.get("/tasks", async (req: any, res: any) => {
  try {
    const tasks = await scheduledTasksService.listScheduledTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scheduled tasks" });
  }
});

router.post("/tasks", async (req: any, res: any) => {
  try {
    const task = await scheduledTasksService.scheduleTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to schedule task" });
  }
});

router.post("/tasks/:id/run", async (req: any, res: any) => {
  try {
    const result = await scheduledTasksService.runTask(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run task" });
  }
});

export default router;
