"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DATE_FILTERS } from "@/lib/event-filters";
import {
  formatDisplayDate,
  formatISODate,
  getDaysInMonth,
  getFirstDayOfWeek,
  isSameDay,
  MONTH_NAMES,
  parseISODate,
  WEEKDAYS,
} from "@/components/shared/date-picker/dateUtils";

interface EventDateFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function EventDateFilter({ value, onChange }: EventDateFilterProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Calendar month state
  const isCustomDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const customDateObj = isCustomDate ? parseISODate(value) : null;

  const [viewYear, setViewYear] = useState<number>(
    customDateObj ? customDateObj.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    customDateObj ? customDateObj.getMonth() : today.getMonth()
  );

  useEffect(() => {
    if (customDateObj) {
      setViewYear(customDateObj.getFullYear());
      setViewMonth(customDateObj.getMonth());
    }
  }, [value]);

  const [openUpward, setOpenUpward] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    if (!open || !root.current) return;

    const updatePosition = () => {
      if (!root.current) return;
      const rect = root.current.getBoundingClientRect();
      const popoverHeight = 350;
      const popoverWidth = 320;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }

      const spaceRight = window.innerWidth - rect.left;
      if (spaceRight < popoverWidth) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Determine label for trigger
  const getSelectedLabel = () => {
    if (isCustomDate) {
      return formatDisplayDate(value, { short: true });
    }
    const preset = DATE_FILTERS.find((f) => f.value === value);
    return preset ? preset.label : "Date";
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(formatISODate(d));
    setOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  );

  return (
    <div ref={root} className="relative min-w-0">
      <span className="sr-only">Filter by date</span>

      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="h-[58px] w-full rounded-[14px] border border-[#2c3644] bg-[#1f2833] px-4 text-left text-[13px] font-medium text-[#c5c6c7] focus:border-[#66fcf1] focus:outline-none focus:ring-1 focus:ring-[#66fcf1] flex items-center justify-between transition cursor-pointer"
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon className="h-4 w-4 text-[#66fcf1] shrink-0" />
          <div className="flex flex-col text-left truncate">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Date</span>
            <span className="text-white font-medium text-[13px] truncate">{getSelectedLabel()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {value !== "all" && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date filter"
              onClick={(e) => {
                e.stopPropagation();
                onChange("all");
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-[#c5c6c7] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Choose event date filter"
          className={`absolute z-[100] ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            alignRight ? "right-0" : "left-0"
          } w-[calc(100vw-2rem)] sm:w-[320px] max-w-[340px] rounded-2xl border border-[#2c3644] bg-[#0c121d] p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] animate-in fade-in-0 zoom-in-95 duration-150`}
        >
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 pb-3 border-b border-white/10">
            {DATE_FILTERS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  onChange(preset.value);
                  setOpen(false);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  value === preset.value
                    ? "bg-[#66fcf1] text-[#0b0c10] font-bold shadow-[0_0_10px_rgba(102,252,241,0.4)]"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar Picker for exact date */}
          <div className="pt-3">
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear((y) => y - 1);
                  } else setViewMonth((m) => m - 1);
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <div className="text-xs font-semibold text-white">
                <span>{MONTH_NAMES[viewMonth]} </span>
                <span className="text-[#66fcf1] font-mono">{viewYear}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear((y) => y + 1);
                  } else setViewMonth((m) => m + 1);
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400 py-1">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`prev-${i}`}
                  className="h-7 flex items-center justify-center text-slate-600 text-[10px]"
                >
                  {prevMonthDays - firstDayOfWeek + i + 1}
                </div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dObj = new Date(viewYear, viewMonth, day);
                const isSelected = customDateObj ? isSameDay(dObj, customDateObj) : false;
                const isToday = isSameDay(dObj, today);

                let btnCls = "h-7 rounded-md flex items-center justify-center text-xs transition ";
                if (isSelected) {
                  btnCls += "bg-[#66fcf1] text-[#0b0c10] font-bold shadow-[0_0_10px_rgba(102,252,241,0.5)] ";
                } else if (isToday) {
                  btnCls += "border border-[#66fcf1]/80 text-[#66fcf1] font-bold hover:bg-white/10 ";
                } else {
                  btnCls += "text-slate-300 hover:bg-white/10 hover:text-white ";
                }

                return (
                  <button
                    key={`d-${day}`}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={btnCls}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
