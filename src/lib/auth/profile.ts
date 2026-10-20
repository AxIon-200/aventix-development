import { AuthClientError } from "./errors";
import type { AccountSession } from "./client";
import { safeReturnTo } from "./destination";

export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));

/** Only a permitted, eligible /me profile supplies identity and UI permissions. */
export function accountFromProfile(value: unknown): AccountSession {
  if (!isObject(value) || !isObject(value.data) || !isObject(value.data.user)) throw new AuthClientError("INVALID_RESPONSE");
  const user = value.data.user;
  if (!text(user.id) || !text(user.name) || !text(user.firstName) || !text(user.lastName) || !text(user.email)
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)
    || typeof user.role !== "string" || !["ATTENDEE", "ORGANIZER", "ADMINISTRATOR"].includes(user.role)
    || user.status !== "ACTIVE" || user.emailVerified !== true || !text(user.termsVersion)
    || !date(user.termsAcceptedAt) || !date(user.createdAt) || !date(user.updatedAt)
    || !(user.phoneNumber === null || typeof user.phoneNumber === "string")) throw new AuthClientError("INVALID_RESPONSE");
  const navigation = user.role === "ATTENDEE" ? [
    { label: "Events", href: "/events" },
    { label: "My Tickets", href: "/dashboard/tickets" },
    { label: "Booking History", href: "/dashboard/booking-history" },
    { label: "Profile", href: "/dashboard/profile" },
  ] : user.role === "ORGANIZER" ? [{ label: "Organizer dashboard", href: "/organizer/dashboard" }]
    : [{ label: "Administrator dashboard", href: "/admin/dashboard" }];
  return { userId: user.id, displayName: user.name, email: user.email, canBook: user.role === "ATTENDEE", navigation };
}

export function accountDestination(session: AccountSession, returnTo?: string): string {
  // Revalidated by the account flow at each use; no destination comes from a profile field.
  return session.canBook ? safeReturnTo(returnTo) ?? "/events" : session.navigation?.[0]?.href ?? "/events";
}
