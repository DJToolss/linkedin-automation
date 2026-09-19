// No "server-only" guard: the composer calendar needs these helpers in client
// components to map UTC instants onto civil dates in the selected IANA zone.

function zonedDateParts(instant: Date, timeZone: string): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return { year: parts.year, month: parts.month, day: parts.day };
}

/** Civil `YYYY-MM-DD` for an instant in `timeZone`. Falls back to UTC if the zone is invalid. */
export function utcToZonedDateKey(instant: Date, timeZone: string): string {
  try {
    const parts = zonedDateParts(instant, timeZone);
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    const parts = zonedDateParts(instant, "UTC");
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
}

/** How many pending scheduled instants fall on each civil date in `timeZone`. */
export function occupiedZonedDateCounts(scheduledAtIsos: string[], timeZone: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const iso of scheduledAtIsos) {
    const instant = new Date(iso);
    if (Number.isNaN(instant.getTime())) continue;
    const key = utcToZonedDateKey(instant, timeZone);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function parseDateTimeLocal(value: string | undefined): { date: string; time: string } | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  if (!match) return null;
  return { date: match[1], time: match[2] };
}

export function shiftYearMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** 0 = Sunday … 6 = Saturday, for the 1st of the civil month. */
export function weekdayOfMonthStart(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
}