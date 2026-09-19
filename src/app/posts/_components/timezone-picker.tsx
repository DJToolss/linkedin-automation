"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { DEFAULT_TIMEZONE } from "@/lib/posts/constants";

type TimezonePickerProps = {
  timeZones: string[];
  value: string;
  onChange: (zone: string) => void;
  name?: string;
  error?: string[];
};

export function resolveInitialZone(defaultValue: string, timeZones: string[]): string {
  if (timeZones.includes(defaultValue)) return defaultValue;
  if (timeZones.includes(DEFAULT_TIMEZONE)) return DEFAULT_TIMEZONE;
  return defaultValue;
}

export function TimezonePicker({ timeZones, value, onChange, name = "timezone", error }: TimezonePickerProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filteredZones = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return timeZones.slice(0, 80);
    return timeZones.filter((zone) => zone.toLowerCase().includes(normalized)).slice(0, 80);
  }, [query, timeZones]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function chooseZone(zone: string) {
    onChange(zone);
    setQuery(zone);
    setOpen(false);
  }

  function handleBlur() {
    const exact = timeZones.find((zone) => zone.toLowerCase() === query.trim().toLowerCase());
    if (exact) {
      chooseZone(exact);
      return;
    }
    setQuery(value);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input name={name} type="hidden" value={value} />
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Time zone
      </label>
      <input
        aria-autocomplete="list"
        aria-controls={`${listId}-listbox`}
        aria-expanded={open}
        autoComplete="off"
        className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
        id={`${listId}-input`}
        onBlur={handleBlur}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery(value);
          setOpen(true);
        }}
        placeholder="Search time zones (e.g. Asia/Calcutta)"
        role="combobox"
        type="text"
        value={open ? query : value}
      />
      {open && filteredZones.length > 0 && (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          id={`${listId}-listbox`}
          role="listbox"
        >
          {filteredZones.map((zone) => (
            <li key={zone} role="presentation">
              <button
                aria-selected={zone === value}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${zone === value ? "bg-blue-50 font-medium text-blue-700" : "text-zinc-800"}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseZone(zone)}
                role="option"
                type="button"
              >
                {zone}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && filteredZones.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 shadow-lg">
          No matching time zones.
        </p>
      )}
      {error?.length ? <p className="mt-1 text-sm text-red-700">{error[0]}</p> : null}
    </div>
  );
}
