/**
 * Utilities for DatePicker components.
 * Operates purely on local calendar dates (YYYY-MM-DD) to prevent timezone shifts.
 */

export function parseISODate(iso: string): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(iso: string, options?: { includeWeekday?: boolean; short?: boolean }): string {
  const d = parseISODate(iso);
  if (!d) return "";
  
  if (options?.includeWeekday) {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  
  return d.toLocaleDateString("en-US", {
    month: options?.short ? "short" : "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isDateInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const time = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return time >= startTime && time <= endTime;
}

export function isDateDisabled(date: Date, min?: string, max?: string): boolean {
  const time = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (min) {
    const minD = parseISODate(min);
    if (minD && time < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate()).getTime()) {
      return true;
    }
  }
  if (max) {
    const maxD = parseISODate(max);
    if (maxD && time > new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate()).getTime()) {
      return true;
    }
  }
  return false;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
