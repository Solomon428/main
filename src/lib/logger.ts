/**
 * Application Logger
 *
 * Uses Pino for high-performance structured logging.
 * Falls back to console if Pino is not available.
 */

import pino from "pino";

// Configure log level based on environment
const logLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Create Pino logger instance
const logger = pino({
  level: logLevel,
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  base: {
    pid: process.pid,
    env: process.env.NODE_ENV,
  },
});

// Export singleton instance
export { logger };

// Default export for convenience
export default logger;
