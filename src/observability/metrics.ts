// ============================================================================
// Metrics and Monitoring Service
// ============================================================================

interface MetricLabel {
  [key: string]: string | number;
}

interface Counter {
  value: number;
  labels: MetricLabel;
}

interface HistogramEntry {
  sum: number;
  count: number;
  buckets: Map<number, number>;
}

interface Gauge {
  value: number;
  labels: MetricLabel;
}

// In-memory metric storage
const counters = new Map<string, Counter[]>();
const histograms = new Map<string, HistogramEntry>();
const gauges = new Map<string, Gauge[]>();

/**
 * Increment a counter metric
 */
export function incrementCounter(name: string, labels: MetricLabel = {}): void {
  const key = formatMetricKey(name, labels);
  const existing = counters.get(name) || [];

  const entry = existing.find((e) => labelsMatch(e.labels, labels));
  if (entry) {
    entry.value += 1;
  } else {
    existing.push({ value: 1, labels });
  }

  counters.set(name, existing);
}

/**
 * Record a histogram value
 */
export function recordHistogram(
  name: string,
  value: number,
  labels: MetricLabel = {},
  buckets: number[] = [0.1, 0.5, 1, 2, 5, 10],
): void {
  const key = formatMetricKey(name, labels);
  let entry = histograms.get(key);

  if (!entry) {
    entry = {
      sum: 0,
      count: 0,
      buckets: new Map(buckets.map((b) => [b, 0])),
    };
    histograms.set(key, entry);
  }

  entry.sum += value;
  entry.count += 1;

  // Update buckets
  for (const bucket of buckets) {
    if (value <= bucket) {
      entry.buckets.set(bucket, (entry.buckets.get(bucket) || 0) + 1);
    }
  }
}

/**
 * Set a gauge value
 */
export function setGauge(
  name: string,
  value: number,
  labels: MetricLabel = {},
): void {
  const existing = gauges.get(name) || [];

  const entry = existing.find((e) => labelsMatch(e.labels, labels));
  if (entry) {
    entry.value = value;
  } else {
    existing.push({ value, labels });
  }

  gauges.set(name, existing);
}

/**
 * Get all metrics in Prometheus format
 */
export function getMetrics(): string {
  const lines: string[] = [];

  // Counters
  for (const [name, entries] of counters) {
    lines.push(`# TYPE ${name} counter`);
    for (const entry of entries) {
      const labelStr = formatLabels(entry.labels);
      lines.push(`${name}${labelStr} ${entry.value}`);
    }
  }

  // Gauges
  for (const [name, entries] of gauges) {
    lines.push(`# TYPE ${name} gauge`);
    for (const entry of entries) {
      const labelStr = formatLabels(entry.labels);
      lines.push(`${name}${labelStr} ${entry.value}`);
    }
  }

  // Histograms
  for (const [name, entry] of histograms) {
    lines.push(`# TYPE ${name} histogram`);
    const labelStr = formatLabels({}); // Histogram labels would need to be stored differently

    for (const [bucket, count] of entry.buckets) {
      lines.push(`${name}_bucket{le="${bucket}"}${labelStr} ${count}`);
    }
    lines.push(`${name}_sum${labelStr} ${entry.sum}`);
    lines.push(`${name}_count${labelStr} ${entry.count}`);
  }

  return lines.join("\n");
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
  gauges.clear();
}

/**
 * Format metric key with labels
 */
function formatMetricKey(name: string, labels: MetricLabel): string {
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  return labelStr ? `${name}{${labelStr}}` : name;
}

/**
 * Format labels for Prometheus output
 */
function formatLabels(labels: MetricLabel): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "";

  const labelStr = entries.map(([k, v]) => `${k}="${v}"`).join(",");
  return `{${labelStr}}`;
}

/**
 * Check if two label sets match
 */
function labelsMatch(a: MetricLabel, b: MetricLabel): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => a[key] === b[key]);
}

// Predefined metrics
export const METRICS = {
  // HTTP metrics
  HTTP_REQUESTS_TOTAL: "http_requests_total",
  HTTP_REQUEST_DURATION: "http_request_duration_seconds",
  HTTP_RESPONSE_SIZE: "http_response_size_bytes",

  // Database metrics
  DB_QUERIES_TOTAL: "db_queries_total",
  DB_QUERY_DURATION: "db_query_duration_seconds",
  DB_CONNECTIONS_ACTIVE: "db_connections_active",

  // Business metrics
  INVOICES_CREATED: "invoices_created_total",
  INVOICES_PROCESSED: "invoices_processed_total",
  PAYMENTS_PROCESSED: "payments_processed_total",
  APPROVALS_COMPLETED: "approvals_completed_total",

  // System metrics
  ACTIVE_USERS: "active_users",
  QUEUE_SIZE: "queue_size",
  JOB_DURATION: "job_duration_seconds",
} as const;
