import { metrics, Counter } from '@opentelemetry/api';

export type CoreMetricName =
  | 'api_5xx'
  | 'provision_success'
  | 'provision_fail'
  | 'sync_retry';

/** In-memory counters for local §13 verification without a collector. */
const inMemory: Record<CoreMetricName, number> = {
  api_5xx: 0,
  provision_success: 0,
  provision_fail: 0,
  sync_retry: 0,
};

const meter = metrics.getMeter('const-middleware', '0.0.1');

const otelCounters: Partial<Record<CoreMetricName, Counter>> = {};

function getCounter(name: CoreMetricName): Counter {
  if (!otelCounters[name]) {
    otelCounters[name] = meter.createCounter(name, {
      description: `Core middleware metric: ${name}`,
    });
  }
  return otelCounters[name]!;
}

export function recordMetric(name: CoreMetricName, value = 1): void {
  inMemory[name] += value;
  try {
    getCounter(name).add(value);
  } catch {
    // No-op meter / missing provider — in-memory still updated
  }
}

export function recordApi5xx(): void {
  recordMetric('api_5xx');
}

export function recordProvisionSuccess(): void {
  recordMetric('provision_success');
}

export function recordProvisionFail(): void {
  recordMetric('provision_fail');
}

export function recordSyncRetry(): void {
  recordMetric('sync_retry');
}

export function getMetricSnapshot(): Readonly<Record<CoreMetricName, number>> {
  return { ...inMemory };
}

export function resetMetrics(): void {
  (Object.keys(inMemory) as CoreMetricName[]).forEach((k) => {
    inMemory[k] = 0;
  });
}
