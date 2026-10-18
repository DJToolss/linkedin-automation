import "server-only";

const TRANSIENT_DB_ERROR_PATTERN =
  /fetch failed|connecting to database|econnreset|etimedout|socket hang up|network|enotfound|eai_again/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectErrorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join(" ");
}

export function isTransientDbError(error: unknown): boolean {
  return TRANSIENT_DB_ERROR_PATTERN.test(collectErrorText(error));
}

/** Retries Neon connectivity blips that show up as `fetch failed` or similar. */
export async function withDbRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts) throw error;
      await sleep(150 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
