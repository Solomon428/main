// ============================================================================
// Structured Logging Service
// ============================================================================

import { LogSeverity } from '../domain/enums/LogSeverity';

interface LogMeta {
  [key: string]: unknown;
  userId?: string;
  organizationId?: string;
  requestId?: string;
  correlationId?: string;
}

interface LogEntry {
  timestamp: string;
  severity: LogSeverity;
  message: string;
  service: string;
  version: string;
  environment: string;
  meta?: LogMeta;
}

const SERVICE_NAME = process.env.APP_NAME || 'creditorflow';
const SERVICE_VERSION = process.env.APP_VERSION || '2.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

/**
 * Create a structured log entry
 */
function createLogEntry(
  severity: LogSeverity,
  message: string,
  meta?: LogMeta
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    severity,
    message,
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: ENVIRONMENT,
    meta,
  };
}

/**
 * Output log entry to console
 */
function output(entry: LogEntry): void {
  if (process.env.LOG_FORMAT === 'json') {
    console.log(JSON.stringify(entry));
  } else {
    const metaStr = entry.meta ? ` | ${JSON.stringify(entry.meta)}` : '';
    console.log(`[${entry.timestamp}] ${entry.severity}: ${entry.message}${metaStr}`);
  }
}

/**
 * Log a message with specified severity
 */
export function log(severity: LogSeverity, message: string, meta?: LogMeta): void {
  const entry = createLogEntry(severity, message, meta);
  output(entry);
}

/**
 * Log debug message
 */
export function debug(message: string, meta?: LogMeta): void {
  if (process.env.LOG_LEVEL === 'debug' || process.env.DEBUG === 'true') {
    log(LogSeverity.DEBUG, message, meta);
  }
}

/**
 * Log info message
 */
export function info(message: string, meta?: LogMeta): void {
  log(LogSeverity.INFO, message, meta);
}

/**
 * Log warning message
 */
export function warn(message: string, meta?: LogMeta): void {
  log(LogSeverity.WARN, message, meta);
}

/**
 * Log error message
 */
export function error(message: string, meta?: LogMeta): void {
  log(LogSeverity.ERROR, message, meta);
}

/**
 * Log fatal message
 */
export function fatal(message: string, meta?: LogMeta): void {
  log(LogSeverity.FATAL, message, meta);
}

/**
 * Log security event
 */
export function security(message: string, meta?: LogMeta): void {
  log(LogSeverity.SECURITY, message, meta);
}

/**
 * Log audit event
 */
export function audit(message: string, meta?: LogMeta): void {
  log(LogSeverity.AUDIT, message, meta);
}

/**
 * Log compliance event
 */
export function compliance(message: string, meta?: LogMeta): void {
  log(LogSeverity.COMPLIANCE, message, meta);
}

/**
 * Create a child logger with default meta
 */
export function createChildLogger(defaultMeta: LogMeta) {
  return {
    debug: (message: string, meta?: LogMeta) => debug(message, { ...defaultMeta, ...meta }),
    info: (message: string, meta?: LogMeta) => info(message, { ...defaultMeta, ...meta }),
    warn: (message: string, meta?: LogMeta) => warn(message, { ...defaultMeta, ...meta }),
    error: (message: string, meta?: LogMeta) => error(message, { ...defaultMeta, ...meta }),
    fatal: (message: string, meta?: LogMeta) => fatal(message, { ...defaultMeta, ...meta }),
    security: (message: string, meta?: LogMeta) => security(message, { ...defaultMeta, ...meta }),
    audit: (message: string, meta?: LogMeta) => audit(message, { ...defaultMeta, ...meta }),
    compliance: (message: string, meta?: LogMeta) => compliance(message, { ...defaultMeta, ...meta }),
  };
}
