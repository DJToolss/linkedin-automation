import { beforeEach, describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "@/lib/cron/auth";

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret-value-0123456789";
});

describe("isAuthorizedCronRequest", () => {
  it("accepts the exact expected bearer header", () => {
    expect(isAuthorizedCronRequest("Bearer test-cron-secret-value-0123456789")).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(isAuthorizedCronRequest(null)).toBe(false);
  });

  it("rejects a mismatched secret", () => {
    expect(isAuthorizedCronRequest("Bearer wrong-secret")).toBe(false);
  });

  it("rejects the correct secret without the Bearer scheme", () => {
    expect(isAuthorizedCronRequest("test-cron-secret-value-0123456789")).toBe(false);
  });

  it("rejects a header of very different length without throwing", () => {
    expect(() => isAuthorizedCronRequest("Bearer x")).not.toThrow();
    expect(isAuthorizedCronRequest("Bearer x")).toBe(false);
  });
});
