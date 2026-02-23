// ============================================================================
// Invoices Routes
// ============================================================================

import { Router } from "express";
import * as invoicesService from "./invoices.service";

const router = Router();

router.get("/", async (req: any, res: any) => {
  try {
    const invoices = await invoicesService.listInvoices();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.get("/:id", async (req: any, res: any) => {
  try {
    const invoice = await invoicesService.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const invoice = await invoicesService.createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

router.put("/:id", async (req: any, res: any) => {
  try {
    const invoice = await invoicesService.updateInvoice(
      req.params.id,
      req.body,
    );
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

router.post("/:id/approve", async (req: any, res: any) => {
  try {
    const invoice = await invoicesService.approveInvoice(
      req.params.id,
      req.body,
    );
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve invoice" });
  }
});

router.post("/:id/reject", async (req: any, res: any) => {
  try {
    const invoice = await invoicesService.rejectInvoice(
      req.params.id,
      req.body,
    );
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed to reject invoice" });
  }
});

router.delete("/:id", async (req: any, res: any) => {
  try {
    await invoicesService.deleteInvoice(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

export default router;
