// ============================================================================
// Audit Routes
// ============================================================================

import { Router } from "express";
import * as auditLogsService from "./audit-logs.service";

const router = Router();

router.get("/", async (req: any, res: any) => {
  try {
    const logs = await auditLogsService.queryLogs(req.query);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get("/export", async (req: any, res: any) => {
  try {
    const exportData = await auditLogsService.exportLogs(req.query);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=audit-logs.json",
    );
    res.send(exportData);
  } catch (error) {
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

router.post("/archive", async (req: any, res: any) => {
  try {
    const result = await auditLogsService.archiveLogs(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to archive audit logs" });
  }
});

export default router;
