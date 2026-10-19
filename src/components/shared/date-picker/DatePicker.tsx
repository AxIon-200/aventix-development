"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  formatDisplayDate,
  formatISODate,
  getDaysInMonth,
  getFirstDayOfWeek,
  isDateDisabled,
  isSameDay,
  MONTH_NAMES,
  parseISODate,
  WEEKDAYS,
} from "./dateUtils";

export interface DatePickerPreset {
  label: string;
  getValue: () => string;
}

export interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
  disabled?: boolean;
  allowClear?: boolean;
  align?: "auto" | "left" | "right";
  direction?: "auto" | "down" | "up";
  variant?: "hero" | "dark-glass" | "admin" | "default";
  className?: string;
  presets?: DatePickerPreset[];
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  min,
  max,
  id,
  name,
  ariaLabel = "Select date",
  disabled = false,
  allowClear = true,
  align = "auto",
  direction = "auto",
  variant = "default",
  className = "",
  presets,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [alignRight, setAlignRight] = useState(align === "right");
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseISODate(value);
  const today = new Date();

  // Navigation view state
  const [viewYear, setViewYear] = useState<number>(
    selectedDate ? selectedDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    selectedDate ? selectedDate.getMonth() : today.getMonth()
  );

  // Sync calendar view when value updates externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  // Positioning logic
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 310;
      const popoverWidth = 320;

      // Vertical direction
      if (direction === "down" || variant === "hero") {
        setOpenUpward(false);
      } else if (direction === "up") {
        setOpenUpward(true);
      } else {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < popoverHeight && spaceAbove > spaceBelow + 100) {
          setOpenUpward(true);
        } else {
          setOpenUpward(false);
        }
      }

      // Horizontal alignment
      if (align === "right" || variant === "hero") {
        setAlignRight(true);
      } else if (align === "left") {
        setAlignRight(false);
      } else {
        const spaceRight = window.innerWidth - rect.left;
        if (spaceRight < popoverWidth) {
          setAlignRight(true);
        } else {
          setAlignRight(false);
        }
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, align, direction, variant]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (isDateDisabled(d, min, max)) return;
    onChange(formatISODate(d));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Generate grid cells
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  );

  // Default presets for quick date picking
  const defaultPresets: DatePickerPreset[] = [
    {
      label: "Today",
      getValue: () => formatISODate(new Date()),
    },
    {
      label: "Tomorrow",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return formatISODate(d);
      },
    },
    {
      label: "This Weekend",
      getValue: () => {
        const d = new Date();
        const day = d.getDay();
        const diff = (6 - day + 7) % 7;
        d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
        return formatISODate(d);
      },
    },
    {
      label: "Next Week",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return formatISODate(d);
      },
    },
  ];

  const activePresets = presets ?? (variant === "hero" ? defaultPresets : undefined);

  // Variant classes for the trigger
  let triggerClasses = "relative flex items-center justify-between transition-all outline-none ";
  if (variant === "hero") {
    triggerClasses +=
      "w-full bg-transparent text-sm text-white placeholder-slate-400 cursor-pointer select-none text-left";
  } else if (variant === "admin") {
    triggerClasses +=
      "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-400/60 hover:border-white/20 cursor-pointer";
  } else if (variant === "dark-glass") {
    triggerClasses +=
      "w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-sm text-white hover:border-teal-500/50 focus:border-teal-500 cursor-pointer";
  } else {
    triggerClasses +=
      "w-full rounded-xl border border-[#223347] bg-[#121a25] px-3.5 py-2.5 text-sm text-white hover:border-[#66fcf1]/50 focus:border-[#66fcf1] cursor-pointer shadow-sm";
  }

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Hidden input for standard forms */}
      {name && <input type="hidden" name={name} value={value} id={id} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id ? `${id}-trigger` : undefined}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${triggerClasses} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="flex items-center gap-2.5 truncate">
          {variant !== "hero" && (
            <CalendarIcon className="h-4 w-4 text-teal-400 shrink-0" />
          )}
          <span className={value ? "text-white font-medium" : "text-slate-400 font-normal"}>
            {value ? formatDisplayDate(value, { short: true, includeWeekday: true }) : placeholder}
          </span>
        </span>

        {/* Clear indicator */}
        <span className="flex items-center gap-1.5 ml-2 shrink-0">
          {allowClear && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              className="p-1 rounded-md text-slate-400 hover:text-teal-300 hover:bg-white/10 transition"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
      </button>

      {/* Calendar Popover with 100% Solid Opaque Background and High Z-Index */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Calendar date selector"
          className={`absolute z-[100] ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            alignRight ? "right-0" : "left-0"
          } w-[calc(100vw-2rem)] xs:w-[310px] sm:w-[320px] max-w-[330px] rounded-2xl border border-[#223347] bg-[#0c121d] p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] animate-in fade-in-0 zoom-in-95 duration-150`}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
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

          {/* Quick Preset Pills in a single sleek row */}
          {activePresets && activePresets.length > 0 && (
            <div className="flex items-center gap-1.5 py-2 border-b border-white/10 overflow-x-auto no-scrollbar">
              {activePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const val = preset.getValue();
                    onChange(val);
                    setIsOpen(false);
                  }}
                  className="shrink-0 rounded-full bg-white/5 hover:bg-teal-500/20 hover:text-teal-300 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 pt-2 pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-0.5">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Previous Month Trail Days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const day = prevMonthDays - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-7 sm:h-7.5 flex items-center justify-center text-slate-600 select-none text-[11px]"
                >
                  {day}
                </div>
              );
            })}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(viewYear, viewMonth, day);
              const isSelected = selectedDate ? isSameDay(dateObj, selectedDate) : false;
              const isCurrentDay = isSameDay(dateObj, today);
              const disabledDay = isDateDisabled(dateObj, min, max);

              let dayClasses =
                "h-7 sm:h-7.5 rounded-lg flex items-center justify-center font-medium transition cursor-pointer select-none text-xs ";

              if (disabledDay) {
                dayClasses += "text-slate-600 opacity-40 cursor-not-allowed ";
              } else if (isSelected) {
                dayClasses +=
                  "bg-[#66fcf1] text-[#0b0c10] font-bold shadow-[0_0_14px_rgba(102,252,241,0.5)] scale-105 ";
              } else if (isCurrentDay) {
                dayClasses +=
                  "border border-teal-400/80 text-teal-300 font-bold hover:bg-white/10 ";
              } else {
                dayClasses += "text-slate-200 hover:bg-white/10 hover:text-white ";
              }

              return (
                <button
                  key={`curr-${day}`}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => handleSelectDay(day)}
                  className={dayClasses}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer controls */}
          <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                const todayStr = formatISODate(new Date());
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="text-teal-400 hover:text-teal-300 font-medium transition py-0.5"
            >
              Today
            </button>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-rose-400 transition py-0.5"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
