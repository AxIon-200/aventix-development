"use client";

import { useId } from "react";

type DateRangeFilterProps = {
  from: string; // "YYYY-MM-DD" or ""
  to: string; // "YYYY-MM-DD" or ""
  onChange: (key: "from" | "to", value: string) => void;
};

// A reusable pair of date inputs for TableToolbar's extra-controls slot.
// Wire it to two filter keys on the list:
//   <DateRangeFilter from={list.filters.from} to={list.filters.to}
//                    onChange={(key, value) => list.setFilter(key, value)} />
// The "from" date can't be after the "to" date (and vice versa).
export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const id = useId();
  const input =
    "rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-400/60 [color-scheme:dark]";

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Date range">
      <label htmlFor={`${id}-from`} className="sr-only">
        From date
      </label>
      <input
        id={`${id}-from`}
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange("from", e.target.value)}
        className={input}
      />
      <span className="text-xs text-slate-500" aria-hidden="true">
        to
      </span>
      <label htmlFor={`${id}-to`} className="sr-only">
        To date
      </label>
      <input
        id={`${id}-to`}
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange("to", e.target.value)}
        className={input}
      />
    </div>
  );
}
