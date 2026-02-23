// ============================================================================
// Reconciliations Routes
// ============================================================================

import { Router } from "express";
import * as reconciliationsService from "./reconciliations.service";

const router = Router();

router.get("/", async (req: any, res: any) => {
  try {
    const reconciliations = await reconciliationsService.listReconciliations();
    res.json(reconciliations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reconciliations" });
  }
});

router.get("/:id", async (req: any, res: any) => {
  try {
    const reconciliation = await reconciliationsService.getReconciliation(
      req.params.id,
    );
    if (!reconciliation) {
      return res.status(404).json({ error: "Reconciliation not found" });
    }
    res.json(reconciliation);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reconciliation" });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const reconciliation = await reconciliationsService.createReconciliation(
      req.body,
    );
    res.status(201).json(reconciliation);
  } catch (error) {
    res.status(500).json({ error: "Failed to create reconciliation" });
  }
});

router.post("/:id/match", async (req: any, res: any) => {
  try {
    const result = await reconciliationsService.matchItems(
      req.params.id,
      req.body,
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to match items" });
  }
});

router.get("/:id/items", async (req: any, res: any) => {
  try {
    const items = await reconciliationsService.getReconciliationItems(
      req.params.id,
    );
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reconciliation items" });
  }
});

export default router;
