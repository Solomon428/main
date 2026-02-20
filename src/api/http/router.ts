// ============================================================================
// API Router - Mounts all module routes
// ============================================================================

import { Application, Router } from "express";

// Import route modules
import iamRoutes from "../../modules/iam/iam.routes";
import organizationRoutes from "../../modules/organizations/organizations.routes";
import supplierRoutes from "../../modules/suppliers/suppliers.routes";
import invoiceRoutes from "../../modules/invoices/invoices.routes";
import approvalRoutes from "../../modules/approvals/approvals.routes";
import paymentRoutes from "../../modules/payments/payments.routes";
import reconciliationRoutes from "../../modules/reconciliations/reconciliations.routes";
import riskRoutes from "../../modules/risk/risk.routes";
import complianceRoutes from "../../modules/compliance/compliance.routes";
import auditRoutes from "../../modules/audit/audit.routes";
import notificationRoutes from "../../modules/notifications/notifications.routes";
import fileRoutes from "../../modules/files/files.routes";
import systemRoutes from "../../modules/system/system.routes";
import integrationRoutes from "../../modules/integrations/integrations.routes";

/**
 * Setup all API routes
 */
export function setupRouter(app: Application): void {
  const apiRouter = Router();

  // Mount module routes
  apiRouter.use("/iam", iamRoutes);
  apiRouter.use("/organizations", organizationRoutes);
  apiRouter.use("/suppliers", supplierRoutes);
  apiRouter.use("/invoices", invoiceRoutes);
  apiRouter.use("/approvals", approvalRoutes);
  apiRouter.use("/payments", paymentRoutes);
  apiRouter.use("/reconciliations", reconciliationRoutes);
  apiRouter.use("/risk", riskRoutes);
  apiRouter.use("/compliance", complianceRoutes);
  apiRouter.use("/audit", auditRoutes);
  apiRouter.use("/notifications", notificationRoutes);
  apiRouter.use("/files", fileRoutes);
  apiRouter.use("/system", systemRoutes);
  apiRouter.use("/integrations", integrationRoutes);

  // Mount API router
  app.use("/api/v1", apiRouter);
}

// Route configuration for documentation
export const ROUTE_CONFIG = {
  iam: {
    base: "/api/v1/iam",
    routes: [
      "POST /login",
      "POST /logout",
      "GET /users",
      "POST /users",
      "GET /users/:id",
      "PUT /users/:id",
      "DELETE /users/:id",
    ],
  },
  organizations: {
    base: "/api/v1/organizations",
    routes: ["GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id"],
  },
  suppliers: {
    base: "/api/v1/suppliers",
    routes: ["GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id"],
  },
  invoices: {
    base: "/api/v1/invoices",
    routes: [
      "GET /",
      "POST /",
      "GET /:id",
      "PUT /:id",
      "POST /:id/approve",
      "POST /:id/reject",
      "DELETE /:id",
    ],
  },
  approvals: {
    base: "/api/v1/approvals",
    routes: [
      "GET /pending",
      "POST /:id/decision",
      "GET /chains",
      "POST /delegate",
    ],
  },
  payments: {
    base: "/api/v1/payments",
    routes: ["GET /", "POST /", "POST /batch", "GET /batches/:id"],
  },
  reconciliations: {
    base: "/api/v1/reconciliations",
    routes: ["GET /", "POST /", "POST /:id/match", "GET /:id/items"],
  },
  risk: {
    base: "/api/v1/risk",
    routes: ["GET /scores", "GET /scores/:entityId", "POST /scores/calculate"],
  },
  compliance: {
    base: "/api/v1/compliance",
    routes: ["POST /check", "GET /status/:invoiceId", "POST /override"],
  },
  audit: {
    base: "/api/v1/audit",
    routes: ["GET /", "GET /export", "POST /archive"],
  },
  notifications: {
    base: "/api/v1/notifications",
    routes: ["GET /", "PUT /:id/read", "POST /test"],
  },
  files: {
    base: "/api/v1/files",
    routes: ["POST /upload", "GET /:id", "DELETE /:id"],
  },
  system: {
    base: "/api/v1/system",
    routes: ["GET /settings", "PUT /settings", "GET /tasks", "POST /tasks"],
  },
  integrations: {
    base: "/api/v1/integrations",
    routes: [
      "GET /",
      "POST /",
      "GET /:id",
      "PUT /:id",
      "DELETE /:id",
      "POST /:id/sync",
    ],
  },
};
