// ============================================================================
// Integrations Routes
// ============================================================================

import { Router } from "express";
import * as integrationsService from "./integrations.service";
import * as webhooksService from "./webhooks.service";

const router = Router();

// Integration routes
router.get("/", async (req, res) => {
  try {
    const integrations = await integrationsService.listIntegrations();
    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const integration = await integrationsService.getIntegration(req.params.id);
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }
    res.json(integration);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch integration" });
  }
});

router.post("/", async (req, res) => {
  try {
    const integration = await integrationsService.createIntegration(req.body);
    res.status(201).json(integration);
  } catch (error) {
    res.status(500).json({ error: "Failed to create integration" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const integration = await integrationsService.updateIntegration(
      req.params.id,
      req.body,
    );
    res.json(integration);
  } catch (error) {
    res.status(500).json({ error: "Failed to update integration" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await integrationsService.deleteIntegration(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete integration" });
  }
});

router.post("/:id/sync", async (req, res) => {
  try {
    const result = await integrationsService.triggerSync(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to trigger sync" });
  }
});

// Webhook routes
router.get("/webhooks", async (req, res) => {
  try {
    const webhooks = await webhooksService.listWebhooks();
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
});

router.post("/webhooks", async (req, res) => {
  try {
    const webhook = await webhooksService.createWebhook(req.body);
    res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

export default router;
