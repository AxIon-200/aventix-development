import { formatDate } from "@/app/admin/lib/format";

// "Sep 10, 2026 09:42"  (24-hour, browser's local time zone)
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${formatDate(iso)} ${time}`;
}
