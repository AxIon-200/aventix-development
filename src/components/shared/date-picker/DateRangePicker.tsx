"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";
import {
  formatDisplayDate,
  formatISODate,
  getDaysInMonth,
  getFirstDayOfWeek,
  isDateDisabled,
  isDateInRange,
  isSameDay,
  MONTH_NAMES,
  parseISODate,
  WEEKDAYS,
} from "./dateUtils";

export interface DateRangePreset {
  label: string;
  getRange: () => { from: string; to: string };
}

export interface DateRangePickerProps {
  from: string; // "YYYY-MM-DD" or ""
  to: string; // "YYYY-MM-DD" or ""
  onChange?: (key: "from" | "to", value: string) => void;
  onRangeChange?: (range: { from: string; to: string }) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  variant?: "admin" | "default" | "compact";
  className?: string;
  ariaLabel?: string;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  onRangeChange,
  placeholder = "Select date range",
  min,
  max,
  variant = "admin",
  className = "",
  ariaLabel = "Filter by date range",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [alignRight, setAlignRight] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDate = parseISODate(from);
  const endDate = parseISODate(to);
  const today = new Date();

  // Selection state inside calendar
  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Calendar navigation
  const [viewYear, setViewYear] = useState<number>(
    startDate ? startDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    startDate ? startDate.getMonth() : today.getMonth()
  );

  // Sync state when props change
  useEffect(() => {
    setTempStart(parseISODate(from));
    setTempEnd(parseISODate(to));
    if (from) {
      const d = parseISODate(from);
      if (d) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [from, to]);

  // Smart Collision Detection on open
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 380;
      const popoverWidth = 460;

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
  }, [isOpen]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const emitRange = (newFrom: string, newTo: string) => {
    if (onRangeChange) {
      onRangeChange({ from: newFrom, to: newTo });
    }
    if (onChange) {
      onChange("from", newFrom);
      onChange("to", newTo);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(viewYear, viewMonth, day);
    if (isDateDisabled(clickedDate, min, max)) return;

    if (!tempStart || (tempStart && tempEnd)) {
      // First click: reset and set start date
      setTempStart(clickedDate);
      setTempEnd(null);
    } else {
      // Second click: set end date
      if (clickedDate.getTime() < tempStart.getTime()) {
        // Clicked date is earlier than start: swap them
        setTempStart(clickedDate);
        setTempEnd(tempStart);
        emitRange(formatISODate(clickedDate), formatISODate(tempStart));
      } else {
        setTempEnd(clickedDate);
        emitRange(formatISODate(tempStart), formatISODate(clickedDate));
      }
      setIsOpen(false);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTempStart(null);
    setTempEnd(null);
    emitRange("", "");
  };

  const applyPreset = (preset: DateRangePreset) => {
    const range = preset.getRange();
    setTempStart(parseISODate(range.from));
    setTempEnd(parseISODate(range.to));
    emitRange(range.from, range.to);
    setIsOpen(false);
  };

  // Standard Presets
  const presets: DateRangePreset[] = [
    {
      label: "Today",
      getRange: () => {
        const todayStr = formatISODate(new Date());
        return { from: todayStr, to: todayStr };
      },
    },
    {
      label: "Yesterday",
      getRange: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yStr = formatISODate(d);
        return { from: yStr, to: yStr };
      },
    },
    {
      label: "Last 7 Days",
      getRange: () => {
        const toD = new Date();
        const fromD = new Date();
        fromD.setDate(fromD.getDate() - 6);
        return { from: formatISODate(fromD), to: formatISODate(toD) };
      },
    },
    {
      label: "Last 30 Days",
      getRange: () => {
        const toD = new Date();
        const fromD = new Date();
        fromD.setDate(fromD.getDate() - 29);
        return { from: formatISODate(fromD), to: formatISODate(toD) };
      },
    },
    {
      label: "This Month",
      getRange: () => {
        const now = new Date();
        const fromD = new Date(now.getFullYear(), now.getMonth(), 1);
        const toD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { from: formatISODate(fromD), to: formatISODate(toD) };
      },
    },
    {
      label: "Last Month",
      getRange: () => {
        const now = new Date();
        const fromD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const toD = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: formatISODate(fromD), to: formatISODate(toD) };
      },
    },
  ];

  // Formatted trigger label
  const getTriggerLabel = () => {
    if (from && to) {
      if (from === to) {
        return formatDisplayDate(from, { short: true });
      }
      return `${formatDisplayDate(from, { short: true })} – ${formatDisplayDate(to, { short: true })}`;
    }
    if (from) {
      return `From ${formatDisplayDate(from, { short: true })}`;
    }
    if (to) {
      return `Until ${formatDisplayDate(to, { short: true })}`;
    }
    return placeholder;
  };

  const hasValue = Boolean(from || to);

  // Calendar generation helpers
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] focus:border-teal-400/60 px-3 py-2 text-sm text-slate-200 transition outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-teal-400 shrink-0" />
          <span className={hasValue ? "text-white font-medium text-xs sm:text-sm" : "text-slate-400 text-xs sm:text-sm"}>
            {getTriggerLabel()}
          </span>
        </div>

        {hasValue && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Reset date range filter"
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                handleClear();
              }
            }}
            className="p-1 rounded text-slate-400 hover:text-teal-300 hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {/* Popover dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Date range calendar picker"
          className={`absolute z-[100] ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            alignRight ? "right-0" : "left-0"
          } w-[calc(100vw-2rem)] sm:w-[460px] max-w-[480px] rounded-2xl border border-[#223347] bg-[#0c121d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)] animate-in fade-in-0 zoom-in-95 duration-150`}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Presets Sidebar */}
            <div className="sm:w-36 flex flex-row sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0 sm:pr-3 overflow-x-auto sm:overflow-visible">
              <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-teal-400 mb-1 px-2">
                Presets
              </span>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-teal-300 transition whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
              <div className="hidden sm:block my-2 border-t border-white/10" />
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  setIsOpen(false);
                }}
                className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All</span>
              </button>
            </div>

            {/* Calendar Main Body */}
            <div className="flex-1">
              {/* Range status banner */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {tempStart ? formatDisplayDate(formatISODate(tempStart), { short: true }) : "Start date"}
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="font-semibold text-white">
                    {tempEnd ? formatDisplayDate(formatISODate(tempEnd), { short: true }) : "End date"}
                  </span>
                </div>
                {!tempEnd && tempStart && (
                  <span className="text-[11px] text-teal-400 animate-pulse">
                    Select end date
                  </span>
                )}
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between py-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5 font-semibold text-white text-sm">
                  <span>{MONTH_NAMES[viewMonth]}</span>
                  <span className="text-teal-400 font-mono">{viewYear}</span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 pt-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-1 text-xs">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`prev-${i}`}
                    className="h-8 flex items-center justify-center text-slate-600 select-none text-[11px]"
                  >
                    {prevMonthDays - firstDayOfWeek + i + 1}
                  </div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(viewYear, viewMonth, day);
                  const isCurrentDay = isSameDay(dateObj, today);
                  const disabledDay = isDateDisabled(dateObj, min, max);

                  // Range calculation
                  const isStart = tempStart && isSameDay(dateObj, tempStart);
                  const isEnd = tempEnd && isSameDay(dateObj, tempEnd);

                  // Compute active range preview if start is chosen but end is being hovered
                  let inRange = false;
                  if (tempStart && tempEnd) {
                    inRange = isDateInRange(dateObj, tempStart, tempEnd);
                  } else if (tempStart && hoveredDate && !tempEnd) {
                    const rangeA = tempStart.getTime() <= hoveredDate.getTime() ? tempStart : hoveredDate;
                    const rangeB = tempStart.getTime() <= hoveredDate.getTime() ? hoveredDate : tempStart;
                    inRange = isDateInRange(dateObj, rangeA, rangeB);
                  }

                  let cellClasses =
                    "relative h-8 flex items-center justify-center font-medium transition cursor-pointer select-none text-xs ";

                  if (disabledDay) {
                    cellClasses += "text-slate-600 opacity-40 cursor-not-allowed ";
                  } else if (isStart || isEnd) {
                    cellClasses +=
                      "bg-[#66fcf1] text-[#0b0c10] font-bold shadow-[0_0_12px_rgba(102,252,241,0.5)] z-10 ";
                    if (isStart && !isEnd && (tempEnd || hoveredDate)) cellClasses += "rounded-l-lg ";
                    else if (isEnd && !isStart) cellClasses += "rounded-r-lg ";
                    else cellClasses += "rounded-lg ";
                  } else if (inRange) {
                    cellClasses += "bg-teal-500/20 text-teal-200 hover:bg-teal-500/30 ";
                  } else if (isCurrentDay) {
                    cellClasses +=
                      "rounded-lg border border-teal-400/80 text-teal-300 font-bold hover:bg-white/10 ";
                  } else {
                    cellClasses += "rounded-lg text-slate-200 hover:bg-white/10 hover:text-white ";
                  }

                  return (
                    <button
                      key={`curr-${day}`}
                      type="button"
                      disabled={disabledDay}
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={() => !tempEnd && setHoveredDate(dateObj)}
                      className={cellClasses}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Mobile controls */}
              <div className="sm:hidden mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleClear();
                    setIsOpen(false);
                  }}
                  className="text-slate-400 hover:text-rose-400"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-teal-400 font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
