import { describe, expect, it } from "vitest";

import { resolveDatabaseUrl } from "@/lib/db/url";

describe("resolveDatabaseUrl", () => {
  it("removes channel_binding and keeps sslmode", () => {
    const resolved = resolveDatabaseUrl(
      "postgresql://user:pass@ep-example.neon.tech/neondb?sslmode=require&channel_binding=require",
    );
    const url = new URL(resolved);
    expect(url.searchParams.has("channel_binding")).toBe(false);
    expect(url.searchParams.get("sslmode")).toBe("require");
  });
});
