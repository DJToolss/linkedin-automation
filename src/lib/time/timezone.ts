import "server-only";

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    // Throws RangeError for anything that isn't a real IANA zone name.
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function listSupportedTimeZones(): string[] {
  // "UTC" is a valid IANA zone (isValidIanaTimeZone accepts it), but ICU's
  // supportedValuesOf("timeZone") list doesn't always include it as its own
  // entry. `Asia/Calcutta` is an alias of `Asia/Kolkata` and is also omitted
  // from some ICU lists — insert it so the composer default can be selected.
  const zones = typeof Intl.supportedValuesOf === "function" ? [...Intl.supportedValuesOf("timeZone")] : [];
  const withUtc = zones.includes("UTC") ? zones : ["UTC", ...zones];
  if (withUtc.includes("Asia/Calcutta")) return withUtc;

  const kolkataIndex = withUtc.indexOf("Asia/Kolkata");
  if (kolkataIndex >= 0) {
    return [...withUtc.slice(0, kolkataIndex), "Asia/Calcutta", ...withUtc.slice(kolkataIndex)];
  }
  return ["Asia/Calcutta", ...withUtc];
}

function offsetMsForZoneAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asIfUtc - instant.getTime();
}

/**
 * Converts a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm[:ss]"),
 * interpreted as wall-clock time in `timeZone`, to the UTC instant it
 * represents. Preserving both the instant and the original zone (stored
 * alongside it) keeps the record auditable, per implementation.MD's
 * Architecture note.
 */
export function zonedTimeToUtc(localDateTime: string, timeZone: string): Date {
  const normalized = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
  const naiveUtc = new Date(`${normalized}Z`);
  if (Number.isNaN(naiveUtc.getTime())) return naiveUtc;
  return new Date(naiveUtc.getTime() - offsetMsForZoneAt(naiveUtc, timeZone));
}

/** Inverse of `zonedTimeToUtc`, for pre-filling the edit form's local input. */
export function utcToZonedInputValue(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Human-readable wall-clock label in the post's stored IANA zone. */
export function formatZonedDateTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(instant);
}
