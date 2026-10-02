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
        className="ui-input mb-2 font-mono"
        id={name}
        name={name}
        placeholder="Select a date and time"
        readOnly
        value={combined}
      />

      <div className="ui-panel p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            aria-label="Previous month"
            className="ui-icon-btn h-8 w-8"
            onClick={() => setView((current) => shiftYearMonth(current.year, current.month, -1))}
            type="button"
          >
            ‹
          </button>
          <p className="text-[13.5px] font-semibold text-text">{monthTitle(view.year, view.month)}</p>
          <button
            aria-label="Next month"
            className="ui-icon-btn h-8 w-8"
            onClick={() => setView((current) => shiftYearMonth(current.year, current.month, 1))}
            type="button"
          >
            ›
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11.5px] font-semibold text-text-faint">
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
                className={`relative flex h-9 items-center justify-center rounded-[7px] font-mono text-[13px] ${
                  isSelected
                    ? "bg-accent font-medium text-nav-text"
                    : hasScheduled
                      ? "bg-accent-soft font-medium text-accent ring-1 ring-border hover:bg-accent-soft"
                      : isToday
                        ? "font-medium text-accent ring-1 ring-border hover:bg-surface-2"
                        : "text-text hover:bg-surface-2"
                } ${isPast && !isSelected ? "opacity-40" : ""}`}
                disabled={isPast && !isSelected}
                key={cell.key}
                onClick={() => chooseDate(cell.key)}
                type="button"
              >
                {cell.day}
                {hasScheduled && (
                  <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isSelected ? "bg-nav-text" : "bg-accent"}`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-3">
          <label className="flex items-center gap-2 text-[13px] text-text">
            Time
            <input
              className="ui-input w-auto px-2 py-1.5 font-mono"
              onChange={(event) => setSelectedTime(event.target.value)}
              type="time"
              value={selectedTime}
            />
          </label>
          <p className="text-[12px] text-text-muted">Highlighted dates already have a scheduled post.</p>
        </div>
      </div>

      {error?.length ? <p className="ui-error">{error[0]}</p> : null}
    </div>
  );
}
