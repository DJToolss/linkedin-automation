import { describe, expect, it } from "vitest";

import { classifyStatus } from "@/lib/linkedin/publish-error";

describe("classifyStatus", () => {
  it.each([401, 403])("maps %d to reconnect (token/permission problem)", (status) => {
    expect(classifyStatus(status)).toBe("reconnect");
  });

  it.each([429, 500, 502, 503])("maps %d to retryable (transient provider/network trouble)", (status) => {
    expect(classifyStatus(status)).toBe("retryable");
  });

  it.each([400, 404, 409, 422])("maps %d to permanent (validation/client error)", (status) => {
    expect(classifyStatus(status)).toBe("permanent");
  });
});
