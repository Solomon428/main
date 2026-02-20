// ============================================================================
// Express/Fastify Server Setup (Alternative to Next.js API routes)
// ============================================================================

// Express types - these will work when express is installed
// For now, using 'any' types to allow compilation without express installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExpressApp = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Request = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Response = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextFunction = any;

/**
 * Create and configure Express server
 */
export function createServer(): ExpressApp {
  // Dynamically import express to avoid errors when not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require("express");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cors = require("cors");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helmet = require("helmet");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const compression = require("compression");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { rateLimit } = require("express-rate-limit");

  const app: ExpressApp = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
      credentials: true,
    }),
  );

  // Compression
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  });
  app.use("/api/", limiter);

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get("/api/health", async (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || "2.0.0",
    });
  });

  // Setup API routes - dynamically imported
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupRouter } = require("./router");
    setupRouter(app);
  } catch (e) {
    console.warn("Router not configured");
  }

  // Error handling
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "An error occurred",
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  return app;
}

/**
 * Start the server
 */
export function startServer(
  port: number = parseInt(process.env.PORT || "3001"),
): ExpressApp {
  const app = createServer();

  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });

  return app;
}

// Export for use as module
export default createServer;
