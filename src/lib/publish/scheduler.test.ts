import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_TIMEOUT_MS, schedulePostPublish } from "@/lib/publish/scheduler";

const { runPublishBatchForPostMock } = vi.hoisted(() => ({
  runPublishBatchForPostMock: vi.fn().mockResolvedValue({ recovered: 0, claimed: 1, succeeded: 1, failed: 0 }),
}));

vi.mock("@/lib/publish/publisher", () => ({
  runPublishBatchForPost: runPublishBatchForPostMock,
}));

describe("schedulePostPublish", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    runPublishBatchForPostMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires the publish batch when the scheduled instant is reached", async () => {
    schedulePostPublish("post-1", new Date(Date.now() + 5_000));
    expect(runPublishBatchForPostMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(runPublishBatchForPostMock).toHaveBeenCalledWith("post-1");
  });

  it("fires immediately when the scheduled time is already in the past", async () => {
    schedulePostPublish("post-2", new Date(Date.now() - 1_000));
    await Promise.resolve();
    expect(runPublishBatchForPostMock).toHaveBeenCalledWith("post-2");
  });

  it("re-arms long-dated posts in chunks under the Node timeout limit", async () => {
    const farFuture = new Date(Date.now() + MAX_TIMEOUT_MS + 10_000);
    schedulePostPublish("post-3", farFuture);

    await vi.advanceTimersByTimeAsync(MAX_TIMEOUT_MS);
    expect(runPublishBatchForPostMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(runPublishBatchForPostMock).toHaveBeenCalledWith("post-3");
  });

  it("replaces an existing timer when a post is rescheduled", async () => {
    schedulePostPublish("post-4", new Date(Date.now() + 60_000));
    schedulePostPublish("post-4", new Date(Date.now() + 5_000));

    await vi.advanceTimersByTimeAsync(5_000);
    expect(runPublishBatchForPostMock).toHaveBeenCalledWith("post-4");

    await vi.advanceTimersByTimeAsync(55_000);
    expect(runPublishBatchForPostMock).toHaveBeenCalledTimes(1);
  });
});
