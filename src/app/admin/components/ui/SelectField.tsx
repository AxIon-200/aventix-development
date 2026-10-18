"use client";

import { ChevronDown } from "lucide-react";

export type SelectOptionItem = { value: string; label: string; disabled?: boolean };

type SelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOptionItem[];
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
};

export function SelectField({
  value,
  onChange,
  options,
  labelledBy,
  describedBy,
  disabled = false,
}: SelectFieldProps) {
  // If the backend sends a value we don't list, still show it instead of a blank select.
  const known = options.some((o) => o.value === value);

  return (
    <div className="relative w-full sm:w-52">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        disabled={disabled}
        className="w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-[#0B0F19] py-2 pl-3 pr-9 text-sm text-slate-200 outline-none [color-scheme:dark] focus:border-teal-400/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!known && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}
