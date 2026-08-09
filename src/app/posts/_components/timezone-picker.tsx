"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type TimezonePickerProps = {
  timeZones: string[];
  defaultValue?: string;
  name?: string;
  error?: string[];
};

function resolveInitialZone(defaultValue: string, timeZones: string[]): string {
  if (defaultValue !== "UTC") return defaultValue;
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (detected && timeZones.includes(detected)) return detected;
  return defaultValue;
}

export function TimezonePicker({ timeZones, defaultValue = "UTC", name = "timezone", error }: TimezonePickerProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const initialZone = useMemo(() => resolveInitialZone(defaultValue, timeZones), [defaultValue, timeZones]);
  const [selected, setSelected] = useState(initialZone);
  const [query, setQuery] = useState(initialZone);
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
    setSelected(zone);
    setQuery(zone);
    setOpen(false);
  }

  function handleBlur() {
    const exact = timeZones.find((zone) => zone.toLowerCase() === query.trim().toLowerCase());
    if (exact) {
      chooseZone(exact);
      return;
    }
    setQuery(selected);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input name={name} type="hidden" value={selected} />
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
        onFocus={() => setOpen(true)}
        placeholder="Search time zones (e.g. Asia/Calcutta)"
        role="combobox"
        type="text"
        value={query}
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
                aria-selected={zone === selected}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${zone === selected ? "bg-blue-50 font-medium text-blue-700" : "text-zinc-800"}`}
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
