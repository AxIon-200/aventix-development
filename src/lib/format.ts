const TZ = "Asia/Manila";

export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  })
    .format(new Date(iso))
    .replace(",", ",");
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: TZ }).format(
    new Date(iso),
  );
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatShortDate(iso)}, ${formatTime(iso)}`;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
}
