const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'cookies',
  'jwt',
  'secret',
  'unit_price',
  'unitPrice',
];

/** Connection strings / internal hostnames that must never appear in logs. */
const SENSITIVE_STRING_PATTERNS: RegExp[] = [
  /^amqp:\/\//i,
  /^postgres:\/\//i,
  /^postgresql:\/\//i,
  /\.internal(?:[:/\s?#]|$)/i,
  /^[a-z0-9][a-z0-9.-]*\.internal$/i,
];

const UPSTREAM_PRODUCT_NAMES =
  /\b(OpenProject|OpenConstructionERP|NestJS)\b/gi;

const SQL_SCHEMA_HINT =
  /\b(CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM|pg_catalog|information_schema)\b/i;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s.toLowerCase()));
}

function isSensitiveString(value: string): boolean {
  return SENSITIVE_STRING_PATTERNS.some((re) => re.test(value));
}

export function scrubStringValue(value: string): string {
  if (isSensitiveString(value)) return '[REDACTED]';
  return value.replace(UPSTREAM_PRODUCT_NAMES, '[REDACTED]');
}

/**
 * Recursively redact sensitive keys and connection-string / .internal values for logs.
 */
export function scrubForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return scrubStringValue(value);
  if (Array.isArray(value)) return value.map(scrubForLog);
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = scrubForLog(v);
    }
  }
  return out;
}

/**
 * Sanitize exception text before returning it to API clients.
 * Strips stack traces, SQL schema hints, and upstream product names.
 */
export function sanitizeClientMessage(
  message: string | string[],
  opts?: { forceGeneric?: boolean },
): string | string[] {
  if (opts?.forceGeneric) {
    return 'Internal server error';
  }

  const scrubOne = (raw: string): string => {
    // Drop multi-line stack traces — keep first line only
    const firstLine = raw.split(/\r?\n/)[0] ?? raw;
    let out = firstLine.replace(UPSTREAM_PRODUCT_NAMES, '[REDACTED]');
    if (SQL_SCHEMA_HINT.test(out) || /\bat\s+\S+\s+\([^)]+:\d+:\d+\)/.test(raw)) {
      return 'Internal server error';
    }
    if (out.includes('    at ') || out.includes('\n    at ')) {
      return 'Internal server error';
    }
    return out.trim() || 'Internal server error';
  };

  if (Array.isArray(message)) {
    return message.map(scrubOne);
  }
  return scrubOne(message);
}

export function containsLeakedInternals(text: string): boolean {
  return (
    /\b(OpenProject|OpenConstructionERP|NestJS)\b/i.test(text) ||
    SQL_SCHEMA_HINT.test(text) ||
    /\n\s+at\s+/.test(text)
  );
}
