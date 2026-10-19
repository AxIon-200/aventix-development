"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import {
  formatISODate,
  getDaysInMonth,
  getFirstDayOfWeek,
  isDateDisabled,
  isSameDay,
  MONTH_NAMES,
  parseISODate,
  WEEKDAYS,
} from "./dateUtils";

export interface DateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & start time",
  min,
  max,
  id,
  name,
  disabled = false,
  allowClear = true,
  className = "",
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing value
  let initialDateStr = "";
  let initialHour = 19; // Default 7 PM for live events
  let initialMinute = 0;
  let initialPeriod: "AM" | "PM" = "PM";

  if (value && value.includes("T")) {
    const [dPart, tPart] = value.split("T");
    initialDateStr = dPart;
    if (tPart) {
      const [h, m] = tPart.split(":").map(Number);
      if (!isNaN(h)) {
        initialHour = h % 12 === 0 ? 12 : h % 12;
        initialPeriod = h >= 12 ? "PM" : "AM";
      }
      if (!isNaN(m)) initialMinute = m;
    }
  }

  const selectedDate = parseISODate(initialDateStr);
  const today = new Date();

  // Calendar View
  const [viewYear, setViewYear] = useState<number>(
    selectedDate ? selectedDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    selectedDate ? selectedDate.getMonth() : today.getMonth()
  );

  // Time state
  const [selectedDayDate, setSelectedDayDate] = useState<string>(initialDateStr);
  const [hour12, setHour12] = useState<number>(initialHour);
  const [minute, setMinute] = useState<number>(initialMinute);
  const [period, setPeriod] = useState<"AM" | "PM">(initialPeriod);

  // Sync with value
  useEffect(() => {
    if (value && value.includes("T")) {
      const [dPart, tPart] = value.split("T");
      setSelectedDayDate(dPart);
      const parsedD = parseISODate(dPart);
      if (parsedD) {
        setViewYear(parsedD.getFullYear());
        setViewMonth(parsedD.getMonth());
      }
      if (tPart) {
        const [h, m] = tPart.split(":").map(Number);
        if (!isNaN(h)) {
          setHour12(h % 12 === 0 ? 12 : h % 12);
          setPeriod(h >= 12 ? "PM" : "AM");
        }
        if (!isNaN(m)) setMinute(m);
      }
    } else {
      setSelectedDayDate("");
    }
  }, [value]);

  const [openUpward, setOpenUpward] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  // Smart Collision Detection on open
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 390;
      const popoverWidth = 500;

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

  // Click outside to close
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

  const updateDateTime = (
    dateStr: string,
    h12: number,
    minVal: number,
    amPm: "AM" | "PM"
  ) => {
    if (!dateStr) return;
    let h24 = h12 % 12;
    if (amPm === "PM") h24 += 12;
    const formattedHour = String(h24).padStart(2, "0");
    const formattedMin = String(minVal).padStart(2, "0");
    onChange(`${dateStr}T${formattedHour}:${formattedMin}`);
  };

  const handleDaySelect = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (isDateDisabled(d, min, max)) return;
    const dateStr = formatISODate(d);
    setSelectedDayDate(dateStr);
    updateDateTime(dateStr, hour12, minute, period);
  };

  const handleTimeChange = (newH: number, newM: number, newP: "AM" | "PM") => {
    setHour12(newH);
    setMinute(newM);
    setPeriod(newP);
    if (selectedDayDate) {
      updateDateTime(selectedDayDate, newH, newM, newP);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const formatDisplay = () => {
    if (!value || !selectedDayDate) return placeholder;
    const d = parseISODate(selectedDayDate);
    if (!d) return placeholder;
    const datePart = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedMin = String(minute).padStart(2, "0");
    return `${datePart} at ${hour12}:${formattedMin} ${period}`;
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  );

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {name && <input type="hidden" name={name} value={value} id={id} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id ? `${id}-trigger` : undefined}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2.5 text-sm text-white hover:border-teal-500/50 focus:border-teal-500 transition cursor-pointer text-left shadow-sm"
      >
        <span className="flex items-center gap-2.5 truncate">
          <CalendarIcon className="h-4 w-4 text-teal-400 shrink-0" />
          <span className={value ? "text-white font-medium" : "text-slate-400 font-normal"}>
            {formatDisplay()}
          </span>
        </span>

        {allowClear && value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date & time"
            onClick={handleClear}
            className="p-1 rounded text-slate-400 hover:text-teal-300 hover:bg-white/10 transition ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Event date and time selector"
          className={`absolute z-[100] ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            alignRight ? "right-0" : "left-0"
          } w-[calc(100vw-2rem)] sm:w-[500px] max-w-[520px] rounded-2xl border border-[#223347] bg-[#0c121d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)] animate-in fade-in-0 zoom-in-95 duration-150`}
        >
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Calendar Section */}
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewMonth(11);
                      setViewYear((y) => y - 1);
                    } else setViewMonth((m) => m - 1);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5 font-semibold text-white text-sm">
                  <span>{MONTH_NAMES[viewMonth]}</span>
                  <span className="text-teal-400 font-mono">{viewYear}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewMonth(0);
                      setViewYear((y) => y + 1);
                    } else setViewMonth((m) => m + 1);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 pt-2 pb-1 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 text-xs">
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
                  const isSelected = selectedDayDate
                    ? isSameDay(dateObj, parseISODate(selectedDayDate))
                    : false;
                  const isCurrentDay = isSameDay(dateObj, today);
                  const disabledDay = isDateDisabled(dateObj, min, max);

                  let dayClasses =
                    "h-8 rounded-lg flex items-center justify-center font-medium transition cursor-pointer select-none text-xs ";

                  if (disabledDay) {
                    dayClasses += "text-slate-600 opacity-40 cursor-not-allowed ";
                  } else if (isSelected) {
                    dayClasses +=
                      "bg-[#66fcf1] text-[#0b0c10] font-bold shadow-[0_0_12px_rgba(102,252,241,0.5)] scale-105 ";
                  } else if (isCurrentDay) {
                    dayClasses +=
                      "border border-teal-400/80 text-teal-300 font-bold hover:bg-white/10 ";
                  } else {
                    dayClasses += "text-slate-200 hover:bg-white/10 hover:text-white ";
                  }

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      disabled={disabledDay}
                      onClick={() => handleDaySelect(day)}
                      className={dayClasses}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Section */}
            <div className="sm:w-48 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-3">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Event Time</span>
                </div>

                {/* Hour and Minute pickers */}
                <div className="flex items-center justify-center gap-2 bg-white/5 p-2 rounded-xl">
                  {/* Hours */}
                  <select
                    value={hour12}
                    onChange={(e) =>
                      handleTimeChange(Number(e.target.value), minute, period)
                    }
                    className="bg-[#111827] text-white font-mono font-bold text-sm px-2.5 py-1.5 rounded-lg border border-white/10 outline-none focus:border-teal-400"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>

                  <span className="text-white font-bold">:</span>

                  {/* Minutes */}
                  <select
                    value={minute}
                    onChange={(e) =>
                      handleTimeChange(hour12, Number(e.target.value), period)
                    }
                    className="bg-[#111827] text-white font-mono font-bold text-sm px-2.5 py-1.5 rounded-lg border border-white/10 outline-none focus:border-teal-400"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  {/* AM / PM Toggle */}
                  <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => handleTimeChange(hour12, minute, "AM")}
                      className={`px-2 py-1 font-semibold transition ${
                        period === "AM"
                          ? "bg-teal-400 text-[#0b0c10]"
                          : "bg-[#111827] text-slate-400 hover:text-white"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeChange(hour12, minute, "PM")}
                      className={`px-2 py-1 font-semibold transition ${
                        period === "PM"
                          ? "bg-teal-400 text-[#0b0c10]"
                          : "bg-[#111827] text-slate-400 hover:text-white"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* Popular Showtime Presets */}
                <div className="mt-3 space-y-1">
                  <span className="text-[11px] font-medium text-slate-400">
                    Common Showtimes:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {[
                      { label: "6:00 PM", h: 6, m: 0, p: "PM" as const },
                      { label: "7:00 PM", h: 7, m: 0, p: "PM" as const },
                      { label: "8:00 PM", h: 8, m: 0, p: "PM" as const },
                      { label: "9:00 PM", h: 9, m: 0, p: "PM" as const },
                    ].map((slot) => (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => handleTimeChange(slot.h, slot.m, slot.p)}
                        className={`text-xs py-1 px-2 rounded-lg border transition ${
                          hour12 === slot.h && minute === slot.m && period === slot.p
                            ? "border-teal-400 bg-teal-400/20 text-teal-300 font-semibold"
                            : "border-white/5 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-lg bg-teal-500 hover:bg-teal-400 text-[#0b0c10] font-bold text-xs py-2 transition"
                >
                  Set Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
