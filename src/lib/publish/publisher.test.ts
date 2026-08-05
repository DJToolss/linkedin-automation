import { describe, expect, it } from "vitest";

import { computeRetryBackoffMs, MAX_ATTEMPTS, RETRY_BASE_MS, RETRY_MAX_MS } from "@/lib/publish/publisher";

describe("computeRetryBackoffMs", () => {
  it("starts at the base backoff for the first retry", () => {
    expect(computeRetryBackoffMs(1)).toBe(RETRY_BASE_MS);
  });

  it("doubles with each subsequent attempt", () => {
    expect(computeRetryBackoffMs(2)).toBe(RETRY_BASE_MS * 2);
    expect(computeRetryBackoffMs(3)).toBe(RETRY_BASE_MS * 4);
  });

  it("is capped at the maximum backoff", () => {
    expect(computeRetryBackoffMs(MAX_ATTEMPTS)).toBeLessThanOrEqual(RETRY_MAX_MS);
    expect(computeRetryBackoffMs(20)).toBe(RETRY_MAX_MS);
  });
});
