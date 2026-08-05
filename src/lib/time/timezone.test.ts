import { describe, expect, it } from "vitest";

import { isValidIanaTimeZone, listSupportedTimeZones, utcToZonedInputValue, zonedTimeToUtc } from "@/lib/time/timezone";

describe("isValidIanaTimeZone", () => {
  it("accepts a real IANA zone", () => {
    expect(isValidIanaTimeZone("America/New_York")).toBe(true);
    expect(isValidIanaTimeZone("UTC")).toBe(true);
  });

  it("rejects a made-up zone name", () => {
    expect(isValidIanaTimeZone("Not/AZone")).toBe(false);
  });
});

describe("listSupportedTimeZones", () => {
  it("returns a non-empty list that includes UTC", () => {
    const zones = listSupportedTimeZones();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("UTC");
  });
});

describe("zonedTimeToUtc", () => {
  it("treats a UTC wall-clock time as itself", () => {
    expect(zonedTimeToUtc("2026-08-10T14:30", "UTC").toISOString()).toBe("2026-08-10T14:30:00.000Z");
  });

  it("applies the daylight-saving offset in effect at that date (EDT, UTC-4)", () => {
    expect(zonedTimeToUtc("2026-08-10T14:30", "America/New_York").toISOString()).toBe("2026-08-10T18:30:00.000Z");
  });

  it("applies the standard-time offset in effect at that date (EST, UTC-5)", () => {
    expect(zonedTimeToUtc("2026-01-10T14:30", "America/New_York").toISOString()).toBe("2026-01-10T19:30:00.000Z");
  });

  it("accepts a value that already includes seconds", () => {
    expect(zonedTimeToUtc("2026-08-10T14:30:00", "UTC").toISOString()).toBe("2026-08-10T14:30:00.000Z");
  });

  it("returns an invalid date for a malformed input rather than throwing", () => {
    expect(Number.isNaN(zonedTimeToUtc("not-a-date", "UTC").getTime())).toBe(true);
  });
});

describe("utcToZonedInputValue", () => {
  it("round-trips through zonedTimeToUtc for a zone with a DST transition", () => {
    const original = "2026-08-10T14:30";
    const instant = zonedTimeToUtc(original, "America/New_York");
    expect(utcToZonedInputValue(instant, "America/New_York")).toBe(original);
  });

  it("round-trips for UTC itself", () => {
    const original = "2026-01-10T09:05";
    const instant = zonedTimeToUtc(original, "UTC");
    expect(utcToZonedInputValue(instant, "UTC")).toBe(original);
  });
});
