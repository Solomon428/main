// ============================================================================
// Compliance Routes
// ============================================================================

import { Router } from "express";
import * as complianceChecksService from "./compliance-checks.service";

const router = Router();

router.post("/check", async (req, res) => {
  try {
    const result = await complianceChecksService.runComplianceCheck(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run compliance check" });
  }
});

router.get("/status/:invoiceId", async (req, res) => {
  try {
    const status = await complianceChecksService.getComplianceStatus(
      req.params.invoiceId,
    );
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch compliance status" });
  }
});

router.post("/override", async (req, res) => {
  try {
    const result = await complianceChecksService.overrideCompliance(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to override compliance" });
  }
});

export default router;
