"use client";

import { useMemo, useState } from "react";

import {
  daysInMonth,
  occupiedZonedDateCounts,
  parseDateTimeLocal,
  shiftYearMonth,
  utcToZonedDateKey,
  weekdayOfMonthStart,
} from "@/lib/time/zoned-date";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ScheduleDatePickerProps = {
  name?: string;
  defaultValue?: string;
  timezone: string;
  scheduledAtIsos: string[];
  error?: string[];
};

function monthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month, 1)),
  );
}

function parseYearMonth(dateKey: string): { year: number; month: number } {
  const [year, month] = dateKey.split("-").map(Number);
  return { year, month: month - 1 };
}

function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ScheduleDatePicker({
  name = "scheduledAt",
  defaultValue,
  timezone,
  scheduledAtIsos,
  error,
}: ScheduleDatePickerProps) {
  const parsed = parseDateTimeLocal(defaultValue);
  const initialView = parsed ? parseYearMonth(parsed.date) : parseYearMonth(utcToZonedDateKey(new Date(), timezone));

  const [selectedDate, setSelectedDate] = useState(parsed?.date ?? "");
  const [selectedTime, setSelectedTime] = useState(parsed?.time ?? "");
  const [view, setView] = useState(initialView);

  const occupied = useMemo(() => occupiedZonedDateCounts(scheduledAtIsos, timezone), [scheduledAtIsos, timezone]);
  const todayKey = utcToZonedDateKey(new Date(), timezone);
  const combined = selectedDate && selectedTime ? `${selectedDate}T${selectedTime}` : "";

  const cells = useMemo(() => {
    const leading = weekdayOfMonthStart(view.year, view.month);
    const totalDays = daysInMonth(view.year, view.month);
    const items: Array<{ key: string; day: number; inMonth: boolean }> = [];

    for (let i = 0; i < leading; i += 1) items.push({ key: `pad-${i}`, day: 0, inMonth: false });
    for (let day = 1; day <= totalDays; day += 1) {
      items.push({ key: dateKeyFromParts(view.year, view.month, day), day, inMonth: true });
    }
    return items;
  }, [view]);

  function chooseDate(dateKey: string) {
    setSelectedDate(dateKey);
    if (!selectedTime) setSelectedTime("09:00");
  }

  return (
    <div>
      <input
        className="mb-2 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
        id={name}
        name={name}
        placeholder="Select a date and time"
        readOnly
        value={combined}
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            aria-label="Previous month"
            className="rounded border px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={() => setView((current) => shiftYearMonth(current.year, current.month, -1))}
            type="button"
          >
            ‹
          </button>
          <p className="text-sm font-medium text-zinc-900">{monthTitle(view.year, view.month)}</p>
          <button
            aria-label="Next month"
            className="rounded border px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={() => setView((current) => shiftYearMonth(current.year, current.month, 1))}
            type="button"
          >
            ›
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {WEEKDAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            if (!cell.inMonth) return <div key={cell.key} />;

            const isSelected = cell.key === selectedDate;
            const isToday = cell.key === todayKey;
            const isPast = cell.key < todayKey;
            const scheduledCount = occupied[cell.key] ?? 0;
            const hasScheduled = scheduledCount > 0;
            const label = hasScheduled
              ? `${cell.day}, ${scheduledCount} scheduled`
              : isToday
                ? `${cell.day}, today`
                : String(cell.day);

            return (
              <button
                aria-current={isToday ? "date" : undefined}
                aria-label={label}
                aria-pressed={isSelected}
                className={`relative flex h-9 items-center justify-center rounded-lg text-sm ${
                  isSelected
                    ? "bg-blue-700 font-medium text-white"
                    : hasScheduled
                      ? "bg-blue-50 font-medium text-blue-800 ring-1 ring-blue-200 hover:bg-blue-100"
                      : isToday
                        ? "font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
                        : "text-zinc-800 hover:bg-zinc-100"
                } ${isPast && !isSelected ? "opacity-40" : ""}`}
                disabled={isPast && !isSelected}
                key={cell.key}
                onClick={() => chooseDate(cell.key)}
                type="button"
              >
                {cell.day}
                {hasScheduled && (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isSelected ? "bg-white" : "bg-blue-700"}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            Time
            <input
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-zinc-900"
              onChange={(event) => setSelectedTime(event.target.value)}
              type="time"
              value={selectedTime}
            />
          </label>
          <p className="text-xs text-zinc-600">Blue dates already have a scheduled post.</p>
        </div>
      </div>

      {error?.length ? <p className="mt-1 text-sm text-red-700">{error[0]}</p> : null}
    </div>
  );
}
