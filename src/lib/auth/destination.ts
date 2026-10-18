/** Only public event/ticket destinations may be supplied by a visitor. */
export function safeReturnTo(value?: string | null): string | undefined {
  if (!value || !(/^(?:\/events\/[^/?#]+(?:\/(?:tickets|seats))?(?:\?category=[^&#]+)?|\/bookings\/[^/?#]+\/(?:summary|payment|confirmation))$/.test(value))) return;
  try {
    const decoded = decodeURIComponent(value);
    if (/[\\\x00-\x1f]/.test(decoded) || decoded.includes("..") || decoded.includes("//")) return;
    const url = new URL(value, "https://aventix.invalid");
    if (url.origin !== "https://aventix.invalid") return;
    return url.pathname + url.search;
  } catch { return; }
}

export function authHref(path: string, returnTo?: string): string {
  const destination = safeReturnTo(returnTo);
  return destination ? `${path}?returnTo=${encodeURIComponent(destination)}` : path;
}
