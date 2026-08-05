import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "@/lib/concurrency";

describe("mapWithConcurrency", () => {
  it("never runs more items at once than the given limit", async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 10 }, (_, index) => index);

    await mapWithConcurrency(items, 3, async (item) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return item;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("preserves output order regardless of completion order", async () => {
    const items = [30, 10, 20];
    const results = await mapWithConcurrency(items, 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms;
    });
    expect(results).toEqual([30, 10, 20]);
  });

  it("handles an empty input array", async () => {
    expect(await mapWithConcurrency([], 3, async (x) => x)).toEqual([]);
  });

  it("handles a limit larger than the item count", async () => {
    const results = await mapWithConcurrency([1, 2], 10, async (x) => x * 2);
    expect(results).toEqual([2, 4]);
  });
});
