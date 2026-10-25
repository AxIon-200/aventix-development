import { formatDate } from "@/app/admin/lib/format";

// "Sep 10, 2026 09:42"  (24-hour, browser's local time zone)
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const timeZone = typeof document === "undefined" ? "Asia/Manila" : document.documentElement.dataset.adminTimezone ?? "Asia/Manila";
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
  return `${formatDate(iso)} ${time}`;
}
