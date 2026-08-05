/**
 * Structured, redacted logging. Emits one JSON line per call so log
 * aggregators can index by field (request/post/attempt IDs, level, etc.)
 * instead of grepping free text — implementation.MD Phase 6 item 3.
 */

export type LogContext = Record<string, unknown>;
export type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "accesstoken",
  "accesstokenenc",
  "clientsecret",
  "clientsecretenc",
  "password",
  "passwordhash",
  "authorization",
  "cron_secret",
  "encryption_key",
  "nextauth_secret",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase()) ? "[redacted]" : redact(entryValue, depth + 1),
      ]),
    );
  }
  return value;
}

function emit(level: LogLevel, message: string, context: LogContext | undefined): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context: redact(context) } : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export type Logger = {
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  /** Returns a logger that merges `extra` into every call's context — for binding request/post/attempt IDs once per unit of work. */
  child: (extra: LogContext) => Logger;
};

export function createLogger(baseContext: LogContext = {}): Logger {
  return {
    info: (message, context) => emit("info", message, { ...baseContext, ...context }),
    warn: (message, context) => emit("warn", message, { ...baseContext, ...context }),
    error: (message, context) => emit("error", message, { ...baseContext, ...context }),
    child: (extra) => createLogger({ ...baseContext, ...extra }),
  };
}

export const logger = createLogger();
