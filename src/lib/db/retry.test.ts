import { describe, expect, it, vi } from "vitest";

import { isTransientDbError, withDbRetry } from "@/lib/db/retry";

describe("isTransientDbError", () => {
  it("detects Neon fetch failures", () => {
    const error = new Error("Failed query");
    error.cause = new Error("Error connecting to database: TypeError: fetch failed");
    expect(isTransientDbError(error)).toBe(true);
  });

  it("ignores validation errors", () => {
    expect(isTransientDbError(new Error('duplicate key value violates unique constraint "users_email_unique"'))).toBe(false);
  });
});

describe("withDbRetry", () => {
  it("retries transient failures then succeeds", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("fetch failed"), { cause: new Error("fetch failed") }))
      .mockResolvedValue("ok");

    await expect(withDbRetry(operation, 3)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
