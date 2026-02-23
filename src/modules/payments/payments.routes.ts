// ============================================================================
// Payments Routes
// ============================================================================

import { Router } from "express";
import * as paymentsService from "./payments.service";

const router = Router();

router.get("/", async (req: any, res: any) => {
  try {
    const payments = await paymentsService.listPayments();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.get("/:id", async (req: any, res: any) => {
  try {
    const payment = await paymentsService.getPayment(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const payment = await paymentsService.createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.post("/batch", async (req: any, res: any) => {
  try {
    const batch = await paymentsService.createPaymentBatch(req.body);
    res.status(201).json(batch);
  } catch (error) {
    res.status(500).json({ error: "Failed to create payment batch" });
  }
});

router.get("/batches/:id", async (req: any, res: any) => {
  try {
    const batch = await paymentsService.getPaymentBatch(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: "Payment batch not found" });
    }
    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment batch" });
  }
});

export default router;
