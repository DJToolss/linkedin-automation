import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "@/lib/logger";

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  logSpy.mockRestore();
});

function lastLine(): Record<string, unknown> {
  return JSON.parse(logSpy.mock.calls.at(-1)?.[0] as string);
}

describe("logger", () => {
  it("emits a single JSON line with timestamp, level, and message", () => {
    createLogger().info("hello");
    const line = lastLine();
    expect(line.level).toBe("info");
    expect(line.message).toBe("hello");
    expect(typeof line.timestamp).toBe("string");
  });

  it("redacts known-sensitive keys anywhere in a nested context", () => {
    createLogger().info("connected", {
      userId: "u1",
      connection: { accessToken: "super-secret", personUrn: "urn:li:person:1" },
    });
    const line = lastLine() as { context: { connection: { accessToken: string; personUrn: string } } };
    expect(line.context.connection.accessToken).toBe("[redacted]");
    expect(line.context.connection.personUrn).toBe("urn:li:person:1");
  });

  it("merges bound context from child() with per-call context", () => {
    const requestLogger = createLogger().child({ requestId: "req-1" });
    requestLogger.info("processing", { postId: "post-1" });
    const line = lastLine() as { context: { requestId: string; postId: string } };
    expect(line.context.requestId).toBe("req-1");
    expect(line.context.postId).toBe("post-1");
  });

  it("omits the context field entirely when none is given", () => {
    createLogger().info("no context here");
    expect(lastLine().context).toBeUndefined();
  });
});
