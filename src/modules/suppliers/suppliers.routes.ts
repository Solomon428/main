// ============================================================================
// Suppliers Routes
// ============================================================================

import { Router } from "express";
import * as suppliersService from "./suppliers.service";

const router = Router();

// Supplier routes
router.get("/", async (req, res) => {
  try {
    const suppliers = await suppliersService.listSuppliers();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const supplier = await suppliersService.getSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch supplier" });
  }
});

router.post("/", async (req, res) => {
  try {
    const supplier = await suppliersService.createSupplier(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const supplier = await suppliersService.updateSupplier(
      req.params.id,
      req.body,
    );
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await suppliersService.deleteSupplier(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

export default router;
