/**
 * Builds a PostgreSQL URL from env. Safe for drizzle-kit (no server-only).
 * If `DATABASE_URL` is set, it wins over POSTGRES_* / DATABASE_* parts.
 */

function trimQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

type EnvLike = Record<string, string | undefined>;

export function resolveDatabaseConnectionString(env: EnvLike = process.env): string {
  const direct = env.DATABASE_URL?.trim();
  if (direct) return trimQuotes(direct);

  const user = env.POSTGRES_USER ?? env.DATABASE_USER;
  const password = env.POSTGRES_PASSWORD ?? env.DATABASE_PASSWORD;
  const database = env.POSTGRES_DB ?? env.DATABASE_NAME;
  const host = env.DATABASE_HOST ?? "localhost";
  const port = env.DATABASE_PORT ?? "5432";

  if (!user || !password || !database) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL or POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB.",
    );
  }

  const url = new URL(`postgresql://${host}:${port}/${encodeURIComponent(database)}`);
  url.username = user;
  url.password = password;

  const ssl = env.DATABASE_SSL === "true" || env.DATABASE_SSL === "1";
  url.searchParams.set("sslmode", ssl ? "require" : "disable");

  return url.toString();
}

/** `pg` pool SSL option from connection string / DATABASE_SSL. */
export function pgPoolSsl(connectionString: string, env: EnvLike = process.env): boolean | { rejectUnauthorized: boolean } {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode");
    if (!sslmode || sslmode === "disable" || sslmode === "prefer") return false;
    if (sslmode === "require" || sslmode === "verify-full" || sslmode === "verify-ca") {
      return { rejectUnauthorized: true };
    }
  } catch {
    /* ignore */
  }
  if (env.DATABASE_SSL === "true" || env.DATABASE_SSL === "1") {
    return { rejectUnauthorized: true };
  }
  return false;
}
