import { describe, expect, it } from "vitest";

import {
  daysInMonth,
  occupiedZonedDateCounts,
  parseDateTimeLocal,
  shiftYearMonth,
  utcToZonedDateKey,
  weekdayOfMonthStart,
} from "@/lib/time/zoned-date";

describe("utcToZonedDateKey", () => {
  it("keeps the UTC calendar date in UTC", () => {
    expect(utcToZonedDateKey(new Date("2026-08-10T14:30:00.000Z"), "UTC")).toBe("2026-08-10");
  });

  it("uses the wall-clock date in a negative-offset zone", () => {
    expect(utcToZonedDateKey(new Date("2026-08-11T02:00:00.000Z"), "America/New_York")).toBe("2026-08-10");
  });

  it("uses the wall-clock date in a positive-offset zone", () => {
    expect(utcToZonedDateKey(new Date("2026-08-10T20:00:00.000Z"), "Asia/Kolkata")).toBe("2026-08-11");
  });
});

describe("occupiedZonedDateCounts", () => {
  it("counts multiple posts that land on the same civil date", () => {
    const counts = occupiedZonedDateCounts(
      ["2026-08-10T18:30:00.000Z", "2026-08-11T02:00:00.000Z"],
      "America/New_York",
    );
    expect(counts["2026-08-10"]).toBe(2);
  });

  it("ignores invalid timestamps", () => {
    expect(occupiedZonedDateCounts(["not-a-date"], "UTC")).toEqual({});
  });
});

describe("parseDateTimeLocal", () => {
  it("splits a datetime-local value", () => {
    expect(parseDateTimeLocal("2026-09-20T09:15")).toEqual({ date: "2026-09-20", time: "09:15" });
  });

  it("returns null for empty or malformed values", () => {
    expect(parseDateTimeLocal("")).toBeNull();
    expect(parseDateTimeLocal("2026-09-20")).toBeNull();
  });
});

describe("civil month helpers", () => {
  it("shifts across a year boundary", () => {
    expect(shiftYearMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftYearMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("reports days in February of a leap year", () => {
    expect(daysInMonth(2028, 1)).toBe(29);
  });

  it("reports the weekday of the first civil day in UTC terms", () => {
    expect(weekdayOfMonthStart(2026, 8)).toBe(2);
  });
});
