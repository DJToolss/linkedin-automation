import "server-only";

/**
 * Normalizes Neon connection strings for Node.js drivers.
 * `channel_binding=require` breaks some TLS stacks in Linux containers.
 */
export function resolveDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    return url.toString();
  } catch {
    return raw;
  }
}
