"use client";

import { DateRangePicker } from "@/components/shared/date-picker";

export type DateRangeFilterProps = {
  from: string; // "YYYY-MM-DD" or ""
  to: string; // "YYYY-MM-DD" or ""
  onChange: (key: "from" | "to", value: string) => void;
};

// A modern, elegant date range picker for TableToolbar's extra-controls slot.
// Wire it to two filter keys on the list:
//   <DateRangeFilter from={list.filters.from} to={list.filters.to}
//                    onChange={(key, value) => list.setFilter(key, value)} />
export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  return (
    <DateRangePicker
      from={from}
      to={to}
      onChange={onChange}
      variant="admin"
      placeholder="Filter by date range…"
      ariaLabel="Filter table by date range"
    />
  );
}
