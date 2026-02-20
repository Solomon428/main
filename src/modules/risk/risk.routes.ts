// ============================================================================
// Risk Routes
// ============================================================================

import { Router } from "express";
import * as riskScoresService from "./risk-scores.service";

const router = Router();

router.get("/scores", async (req, res) => {
  try {
    const scores = await riskScoresService.listRiskScores();
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch risk scores" });
  }
});

router.get("/scores/:entityId", async (req, res) => {
  try {
    const score = await riskScoresService.getRiskScoreByEntity(
      req.params.entityId,
    );
    if (!score) {
      return res.status(404).json({ error: "Risk score not found" });
    }
    res.json(score);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch risk score" });
  }
});

router.post("/scores/calculate", async (req, res) => {
  try {
    const score = await riskScoresService.calculateRiskScore(req.body);
    res.status(201).json(score);
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate risk score" });
  }
});

export default router;
